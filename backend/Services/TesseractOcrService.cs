using Tesseract;
using iText.Kernel.Pdf;
using iText.Kernel.Pdf.Canvas.Parser;
using iText.Kernel.Pdf.Canvas.Parser.Listener;
using Docnet.Core;
using Docnet.Core.Models;
using System.Drawing;
using System.Drawing.Imaging;

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
                    using var engine = new TesseractEngine(@"./tessdata", "rus+eng", EngineMode.Default);
                    
                    // Set additional parameters for better Russian recognition
                    engine.SetVariable("preserve_interword_spaces", "1");
                    engine.SetVariable("user_defined_dpi", "300");
                    engine.SetVariable("tessedit_char_whitelist", "АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдеёжзийклмнопрстуфхцчшщъыьэюяABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,;:!?()[]{}\"'-+=/\\|@#$%^&*<> \n\t");
                    
                    using var img = Pix.LoadFromFile(filePath);
                    using var page = engine.Process(img);
                    
                    var text = page.GetText();
                    var confidence = page.GetMeanConfidence();
                    
                    _logger.LogInformation("OCR completed for {FilePath} with confidence {Confidence:F2}%, extracted {TextLength} characters", 
                        filePath, confidence, text?.Length ?? 0);
                    _logger.LogInformation("OCR text preview (first 200 chars): {TextPreview}", 
                        text?.Length > 200 ? text.Substring(0, 200) + "..." : text);
                    
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

            // For PDF files, try direct text extraction first, then OCR if needed
            if (mimeType.ToLowerInvariant() == "application/pdf")
            {
                // First try direct text extraction
                var directText = await ExtractTextFromPdfAsync(filePath);
                if (!string.IsNullOrEmpty(directText.Trim()))
                {
                    _logger.LogInformation("Successfully extracted text directly from PDF: {TextLength} chars", directText.Length);
                    return directText;
                }
                
                // If no text found, try OCR on first page image
                _logger.LogInformation("No direct text found in PDF, attempting OCR conversion");
                var tempImagePath = await ConvertPdfFirstPageToImageAsync(filePath);
                if (!string.IsNullOrEmpty(tempImagePath))
                {
                    try
                    {
                        var ocrText = await ExtractTextAsync(tempImagePath);
                        _logger.LogInformation("OCR from PDF image extracted {TextLength} chars", ocrText?.Length ?? 0);
                        return ocrText;
                    }
                    finally
                    {
                        // Clean up temp file
                        if (File.Exists(tempImagePath))
                        {
                            _logger.LogInformation("Cleaning up temp image: {TempPath}", tempImagePath);
                            File.Delete(tempImagePath);
                        }
                    }
                }
                else
                {
                    _logger.LogWarning("Failed to convert PDF to image for OCR: {FilePath}", filePath);
                    return "Не удалось обработать PDF файл";
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

    private async Task<string> ConvertPdfFirstPageToImageAsync(string pdfPath)
    {
        return await Task.Run(() =>
        {
            try
            {
                _logger.LogInformation("Converting PDF first page to image for OCR: {PdfPath}", pdfPath);
                
                using var docReader = DocLib.Instance.GetDocReader(pdfPath, new PageDimensions(300, 300));
                
                if (docReader.GetPageCount() == 0)
                {
                    _logger.LogWarning("PDF has no pages: {PdfPath}", pdfPath);
                    return string.Empty;
                }

                using var pageReader = docReader.GetPageReader(0); // First page
                var rawBytes = pageReader.GetImage();
                var width = pageReader.GetPageWidth();
                var height = pageReader.GetPageHeight();
                
                // Create bitmap from raw bytes
                var bitmap = new Bitmap(width, height, PixelFormat.Format32bppArgb);
                var rect = new System.Drawing.Rectangle(0, 0, width, height);
                var bmpData = bitmap.LockBits(rect, ImageLockMode.WriteOnly, bitmap.PixelFormat);
                
                System.Runtime.InteropServices.Marshal.Copy(rawBytes, 0, bmpData.Scan0, rawBytes.Length);
                bitmap.UnlockBits(bmpData);
                
                // Create temp file path in uploads directory for debugging
                var uploadsDir = Path.Combine(Directory.GetCurrentDirectory(), "uploads", "temp");
                Directory.CreateDirectory(uploadsDir);
                var tempPath = Path.Combine(uploadsDir, $"pdf_page_{Guid.NewGuid()}.png");
                
                // Save as PNG for better quality
                bitmap.Save(tempPath, System.Drawing.Imaging.ImageFormat.Png);
                bitmap.Dispose();
                
                _logger.LogInformation("PDF page converted to image: {TempPath} ({Width}x{Height})", tempPath, width, height);
                return tempPath;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "PDF to image conversion failed: {PdfPath}", pdfPath);
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