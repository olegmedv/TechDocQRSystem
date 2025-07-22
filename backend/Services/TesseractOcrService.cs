using Tesseract;

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