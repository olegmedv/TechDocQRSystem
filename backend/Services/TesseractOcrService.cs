using Tesseract;
using iText.Kernel.Pdf;
using iText.Kernel.Pdf.Canvas.Parser;
using iText.Kernel.Pdf.Canvas.Parser.Listener;

namespace TechDocQRSystem.Api.Services;

public class TesseractOcrService : IOcrService
{
    private readonly ILogger<TesseractOcrService> _logger;
    private static readonly string[] ImageMimeTypes = {
        "image/jpeg", "image/jpg", "image/png", "image/gif", "image/bmp", "image/tiff", "image/webp"
    };

    public TesseractOcrService(ILogger<TesseractOcrService> logger)
    {
        _logger = logger;
    }

    public async Task<string> ExtractTextAsync(string filePath)
    {
        try
        {
            if (!File.Exists(filePath))
            {
                throw new FileNotFoundException($"File not found: {filePath}");
            }

            var mimeType = GetMimeType(filePath);
            if (!IsImageFile(mimeType))
            {
                _logger.LogWarning("File {FilePath} is not an image file (MIME: {MimeType}), skipping OCR", filePath, mimeType);
                return string.Empty;
            }

            return await Task.Run(() =>
            {
                try
                {
                    using var engine = new TesseractEngine(@"./tessdata", "eng+rus", EngineMode.Default);
                    using var img = Pix.LoadFromFile(filePath);
                    using var page = engine.Process(img);
                    
                    var text = page.GetText();
                    var confidence = page.GetMeanConfidence();
                    
                    _logger.LogInformation("OCR completed for {FilePath} with confidence {Confidence}", 
                        filePath, confidence);
                    
                    return text?.Trim() ?? string.Empty;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "OCR processing failed for file {FilePath}", filePath);
                    return string.Empty;
                }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "OCR failed for file {FilePath}", filePath);
            return string.Empty;
        }
    }

    public async Task<string> ExtractTextFromFirstPageAsync(string filePath, string mimeType)
    {
        try
        {
            if (!File.Exists(filePath))
            {
                throw new FileNotFoundException($"File not found: {filePath}");
            }

            // For PDF files, extract text directly (no OCR needed for text-based PDFs)
            if (mimeType.ToLowerInvariant() == "application/pdf")
            {
                var text = await ExtractTextFromPdfAsync(filePath);
                if (!string.IsNullOrEmpty(text))
                {
                    return text;
                }
                else
                {
                    _logger.LogWarning("No text found in PDF: {FilePath}", filePath);
                    return "PDF не содержит распознаваемого текста";
                }
            }
            else if (IsImageFile(mimeType))
            {
                // For image files, extract text normally
                return await ExtractTextAsync(filePath);
            }
            else
            {
                _logger.LogWarning("Unsupported file type for OCR: {MimeType}", mimeType);
                return "Неподдерживаемый тип файла для OCR";
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to extract text from first page: {FilePath}", filePath);
            return "Ошибка при извлечении текста";
        }
    }

    private async Task<string> ExtractTextFromPdfAsync(string pdfPath)
    {
        return await Task.Run(() =>
        {
            try
            {
                _logger.LogInformation("Extracting text directly from PDF: {PdfPath}", pdfPath);
                
                using var reader = new PdfReader(pdfPath);
                using var document = new PdfDocument(reader);
                
                if (document.GetNumberOfPages() == 0)
                {
                    _logger.LogWarning("PDF has no pages: {PdfPath}", pdfPath);
                    return string.Empty;
                }

                // Extract text from first page only
                var page = document.GetFirstPage();
                var strategy = new SimpleTextExtractionStrategy();
                var text = PdfTextExtractor.GetTextFromPage(page, strategy);
                
                _logger.LogInformation("Extracted {TextLength} characters from PDF first page", text?.Length ?? 0);
                
                return text?.Trim() ?? string.Empty;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "PDF text extraction failed: {PdfPath}", pdfPath);
                return string.Empty;
            }
        });
    }

    public bool IsImageFile(string mimeType)
    {
        return ImageMimeTypes.Contains(mimeType.ToLowerInvariant());
    }

    private string GetMimeType(string filePath)
    {
        var extension = Path.GetExtension(filePath).ToLowerInvariant();
        return extension switch
        {
            ".jpg" or ".jpeg" => "image/jpeg",
            ".png" => "image/png",
            ".gif" => "image/gif",
            ".bmp" => "image/bmp",
            ".tiff" or ".tif" => "image/tiff",
            ".webp" => "image/webp",
            _ => "application/octet-stream"
        };
    }
}