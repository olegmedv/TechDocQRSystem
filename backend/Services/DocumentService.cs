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

    public DocumentService(ApplicationDbContext context, IConfiguration configuration,
                         IOcrService ocrService, IGeminiService geminiService, 
                         IQrCodeService qrCodeService, IActivityLogService activityLogService,
                         ILogger<DocumentService> logger)
    {
        _context = context;
        _configuration = configuration;
        _ocrService = ocrService;
        _geminiService = geminiService;
        _qrCodeService = qrCodeService;
        _activityLogService = activityLogService;
        _logger = logger;
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

        // Process document asynchronously (OCR + AI)
        _ = Task.Run(async () => await ProcessDocumentAsync(document.Id));

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

    private async Task ProcessDocumentAsync(Guid documentId)
    {
        try
        {
            var document = await _context.Documents.FindAsync(documentId);
            if (document == null) return;

            // Perform OCR
            var ocrText = await _ocrService.ExtractTextAsync(document.FilePath);
            
            if (!string.IsNullOrEmpty(ocrText))
            {
                // Get AI summary and tags
                var (summary, tags) = await _geminiService.ProcessTextAsync(ocrText);
                
                // Update document
                document.OcrText = ocrText;
                document.Summary = summary;
                document.Tags = tags;
                
                await _context.SaveChangesAsync();
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to process document {DocumentId}", documentId);
        }
    }
}