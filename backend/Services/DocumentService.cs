using Microsoft.EntityFrameworkCore;
using TechDocQRSystem.Api.Data;
using TechDocQRSystem.Api.Models;

namespace TechDocQRSystem.Api.Services;

public class DocumentService : IDocumentService
{
    private readonly ApplicationDbContext _context;
    private readonly IConfiguration _configuration;
    private readonly IOcrService _ocrService;
    private readonly IGeminiService _geminiService;
    private readonly IQrCodeService _qrCodeService;
    private readonly IActivityLogService _activityLogService;
    private readonly ILogger<DocumentService> _logger;
    private readonly IServiceScopeFactory _serviceScopeFactory;
    private readonly IDocumentNotificationService _notificationService;

    public DocumentService(ApplicationDbContext context, IConfiguration configuration,
                         IOcrService ocrService, IGeminiService geminiService, 
                         IQrCodeService qrCodeService, IActivityLogService activityLogService,
                         ILogger<DocumentService> logger, IServiceScopeFactory serviceScopeFactory,
                         IDocumentNotificationService notificationService)
    {
        _context = context;
        _configuration = configuration;
        _ocrService = ocrService;
        _geminiService = geminiService;
        _qrCodeService = qrCodeService;
        _activityLogService = activityLogService;
        _logger = logger;
        _serviceScopeFactory = serviceScopeFactory;
        _notificationService = notificationService;
    }

    public async Task<DocumentResponseDto> UploadDocumentAsync(IFormFile file, Guid userId, string ipAddress, string? userAgent)
    {
        if (file == null || file.Length == 0)
        {
            throw new ArgumentException("File is required");
        }

        var maxFileSize = _configuration.GetValue<long>("FileStorage:MaxFileSizeBytes");
        if (file.Length > maxFileSize)
        {
            throw new ArgumentException($"File size exceeds maximum allowed size of {maxFileSize / 1024 / 1024} MB");
        }

        var uploadPath = _configuration["FileStorage:UploadPath"] ?? "/app/uploads";
        var userFolder = Path.Combine(uploadPath, userId.ToString());
        
        if (!Directory.Exists(userFolder))
        {
            Directory.CreateDirectory(userFolder);
        }

        var fileId = Guid.NewGuid();
        var fileName = Path.GetFileNameWithoutExtension(file.FileName);
        var fileExtension = Path.GetExtension(file.FileName);
        var uniqueFileName = $"{fileId}{fileExtension}";
        var filePath = Path.Combine(userFolder, uniqueFileName);

        // Save file to disk
        using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }

        // Create document record
        var document = new Document
        {
            Id = fileId,
            UserId = userId,
            Filename = file.FileName,
            FilePath = filePath,
            FileSize = file.Length,
            MimeType = file.ContentType
        };

        _context.Documents.Add(document);
        await _context.SaveChangesAsync();

        // Log upload activity
        await _activityLogService.LogActivityAsync(userId, ActionTypes.Upload, 
            new { FileName = file.FileName, FileSize = file.Length }, ipAddress, userAgent, document.Id);

        // Notify that processing started
        await _notificationService.NotifyDocumentProcessingStarted(userId, document.Id, file.FileName);

        // Process document asynchronously (OCR + AI) with notifications
        _ = Task.Run(async () => await ProcessDocumentAsync(document.Id, userId));

        return await CreateDocumentResponseDto(document);
    }

    public async Task<(Stream fileStream, string fileName, string contentType)> GetDocumentAsync(Guid accessToken, Guid? userId = null)
    {
        var document = await _context.Documents
            .FirstOrDefaultAsync(d => d.AccessToken == accessToken);

        if (document == null)
        {
            throw new FileNotFoundException("Document not found");
        }

        if (!File.Exists(document.FilePath))
        {
            throw new FileNotFoundException("Physical file not found");
        }

        // Update access tracking
        document.LastAccessedAt = DateTime.UtcNow;
        document.DownloadCount++;
        await _context.SaveChangesAsync();

        // Log download activity
        if (userId.HasValue)
        {
            await _activityLogService.LogActivityAsync(userId.Value, ActionTypes.Download, 
                new { FileName = document.Filename }, null, null, document.Id);
        }

        var fileStream = new FileStream(document.FilePath, FileMode.Open, FileAccess.Read);
        return (fileStream, document.Filename, document.MimeType);
    }

    public async Task<List<DocumentResponseDto>> GetUserDocumentsAsync(Guid userId)
    {
        var documents = await _context.Documents
            .Where(d => d.UserId == userId)
            .OrderByDescending(d => d.CreatedAt)
            .ToListAsync();

        var result = new List<DocumentResponseDto>();
        foreach (var doc in documents)
        {
            result.Add(await CreateDocumentResponseDto(doc));
        }

        return result;
    }

    public async Task<List<DocumentResponseDto>> GetAllDocumentsAsync()
    {
        var documents = await _context.Documents
            .Include(d => d.User)
            .OrderByDescending(d => d.CreatedAt)
            .ToListAsync();

        var result = new List<DocumentResponseDto>();
        foreach (var doc in documents)
        {
            result.Add(await CreateDocumentResponseDto(doc));
        }

        return result;
    }

    public async Task<(Stream fileStream, string fileName, string contentType)> DownloadDocumentByIdAsync(Guid documentId, Guid userId, string userRole, string ipAddress, string userAgent)
    {
        var document = await _context.Documents
            .Include(d => d.User)
            .FirstOrDefaultAsync(d => d.Id == documentId);

        if (document == null)
        {
            throw new FileNotFoundException("Document not found");
        }

        // Проверяем права доступа - admin видит все, user только свои
        if (userRole != "admin" && document.UserId != userId)
        {
            throw new UnauthorizedAccessException("Access denied");
        }

        // Увеличиваем счетчик скачиваний
        document.DownloadCount++;
        document.LastAccessedAt = DateTime.UtcNow;
        
        // Логируем активность
        await _activityLogService.LogActivityAsync(userId, ActionTypes.Download, 
            new { DocumentName = document.Filename }, ipAddress, userAgent, document.Id);

        await _context.SaveChangesAsync();

        // Читаем файл
        var filePath = document.FilePath;
        if (!File.Exists(filePath))
        {
            throw new FileNotFoundException("Physical file not found");
        }

        var fileStream = new FileStream(filePath, FileMode.Open, FileAccess.Read);
        return (fileStream, document.Filename, document.MimeType);
    }

    public async Task GenerateQRAsync(Guid documentId, Guid userId, string userRole, string ipAddress, string userAgent)
    {
        var document = await _context.Documents
            .Include(d => d.User)
            .FirstOrDefaultAsync(d => d.Id == documentId);

        if (document == null)
        {
            throw new FileNotFoundException("Document not found");
        }

        // Проверяем права доступа
        if (userRole != "admin" && document.UserId != userId)
        {
            throw new UnauthorizedAccessException("Access denied");
        }

        // Увеличиваем счетчик генерации QR
        document.QrGenerationCount++;
        
        // Логируем активность
        await _activityLogService.LogActivityAsync(userId, ActionTypes.QrGenerate, 
            new { DocumentName = document.Filename }, ipAddress, userAgent, document.Id);

        await _context.SaveChangesAsync();
    }

    public async Task<List<DocumentResponseDto>> SearchDocumentsAsync(string query, Guid userId, string userRole)
    {
        var searchQuery = _context.Documents.Include(d => d.User).AsQueryable();

        // Фильтрация по правам доступа
        if (userRole != "admin")
        {
            searchQuery = searchQuery.Where(d => d.UserId == userId);
        }

        // Сначала загружаем все документы пользователя
        var allDocuments = await searchQuery
            .OrderByDescending(d => d.CreatedAt)
            .ToListAsync();

        // Затем фильтруем в памяти, включая поиск по тегам
        var documents = allDocuments.Where(d => 
            d.Filename.Contains(query, StringComparison.OrdinalIgnoreCase) ||
            (d.OcrText != null && d.OcrText.Contains(query, StringComparison.OrdinalIgnoreCase)) ||
            (d.Summary != null && d.Summary.Contains(query, StringComparison.OrdinalIgnoreCase)) ||
            (d.Tags != null && d.Tags.Any(tag => tag.Contains(query, StringComparison.OrdinalIgnoreCase)))
        ).ToList();

        var result = new List<DocumentResponseDto>();
        foreach (var doc in documents)
        {
            result.Add(await CreateDocumentResponseDto(doc));
        }

        return result;
    }

    public async Task<bool> DeleteDocumentAsync(Guid documentId, Guid userId)
    {
        var document = await _context.Documents
            .FirstOrDefaultAsync(d => d.Id == documentId && d.UserId == userId);

        if (document == null)
        {
            return false;
        }

        // Delete physical file
        if (File.Exists(document.FilePath))
        {
            File.Delete(document.FilePath);
        }

        _context.Documents.Remove(document);
        await _context.SaveChangesAsync();

        return true;
    }

    public async Task<DocumentResponseDto?> GetDocumentByIdAsync(Guid documentId, Guid userId)
    {
        var document = await _context.Documents
            .FirstOrDefaultAsync(d => d.Id == documentId && d.UserId == userId);

        if (document == null)
        {
            return null;
        }

        return await CreateDocumentResponseDto(document);
    }

    private async Task<DocumentResponseDto> CreateDocumentResponseDto(Document document)
    {
        var accessLink = $"{_configuration["TunnelUrl"]}/api/documents/download/{document.AccessToken}";
        var qrCodeBase64 = _qrCodeService.GenerateQrCode(accessLink);

        // Log QR generation activity but don't update count here to avoid conflicts
        await _activityLogService.LogActivityAsync(document.UserId, ActionTypes.QrGenerate, 
            new { DocumentName = document.Filename }, null, null, document.Id);

        return new DocumentResponseDto
        {
            Id = document.Id,
            Filename = document.Filename,
            FileSize = document.FileSize,
            MimeType = document.MimeType,
            AccessLink = accessLink,
            QrCodeBase64 = qrCodeBase64,
            Summary = document.Summary,
            Tags = document.Tags,
            CreatedAt = document.CreatedAt,
            DownloadCount = document.DownloadCount,
            QrGenerationCount = document.QrGenerationCount,
            LastAccessedAt = document.LastAccessedAt
        };
    }

    private async Task ProcessDocumentAsync(Guid documentId, Guid userId)
    {
        using var scope = _serviceScopeFactory.CreateScope();
        var scopedContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var scopedOcrService = scope.ServiceProvider.GetRequiredService<IOcrService>();
        var scopedGeminiService = scope.ServiceProvider.GetRequiredService<IGeminiService>();
        var scopedNotificationService = scope.ServiceProvider.GetRequiredService<IDocumentNotificationService>();

        try
        {
            var document = await scopedContext.Documents.FindAsync(documentId);
            if (document == null) return;

            _logger.LogInformation("Starting document processing for {DocumentId}", documentId);

            // Extract OCR text from first page only for PDFs, full text for images
            var ocrText = await scopedOcrService.ExtractTextFromFirstPageAsync(document.FilePath, document.MimeType);
            
            if (!string.IsNullOrEmpty(ocrText))
            {
                _logger.LogInformation("OCR completed for {DocumentId}, extracted {TextLength} characters", documentId, ocrText.Length);
                
                // Get AI summary and tags from Gemini
                var (summary, tags) = await scopedGeminiService.ProcessTextAsync(ocrText);
                
                _logger.LogInformation("AI processing completed for {DocumentId}, summary: {SummaryLength} chars, tags: {TagCount}", 
                    documentId, summary?.Length ?? 0, tags?.Count ?? 0);
                
                // Update document with processing results
                document.OcrText = ocrText;
                document.Summary = summary;
                document.Tags = tags ?? new List<string>();
                document.UpdatedAt = DateTime.UtcNow;
                
                await scopedContext.SaveChangesAsync();
                
                _logger.LogInformation("Document processing completed successfully for {DocumentId}", documentId);
                
                // Notify successful completion
                await scopedNotificationService.NotifyDocumentProcessingCompleted(
                    userId, documentId, document.Filename, summary ?? "", tags ?? new List<string>());
            }
            else
            {
                _logger.LogWarning("OCR returned empty text for document {DocumentId}", documentId);
                
                // Mark as processed even if no text extracted
                document.Summary = "Не удалось извлечь текст из документа";
                document.Tags = new List<string> { "Обработка завершена", "Текст не найден" };
                document.UpdatedAt = DateTime.UtcNow;
                
                await scopedContext.SaveChangesAsync();
                
                // Notify completion with no text found
                await scopedNotificationService.NotifyDocumentProcessingCompleted(
                    userId, documentId, document.Filename, document.Summary, document.Tags);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to process document {DocumentId}", documentId);
            
            var document = await scopedContext.Documents.FindAsync(documentId);
            var filename = document?.Filename ?? "Unknown";
            
            // Notify processing failure
            await scopedNotificationService.NotifyDocumentProcessingFailed(
                userId, documentId, filename, ex.Message);
            
            // Mark document with error status
            try
            {
                if (document != null)
                {
                    document.Summary = "Ошибка при обработке документа";
                    document.Tags = new List<string> { "Ошибка обработки" };
                    document.UpdatedAt = DateTime.UtcNow;
                    await scopedContext.SaveChangesAsync();
                }
            }
            catch (Exception saveEx)
            {
                _logger.LogError(saveEx, "Failed to save error status for document {DocumentId}", documentId);
            }
        }
    }
}