namespace TechDocQRSystem.Api.Services;

public interface IOcrService
{
    Task<string> ExtractTextAsync(string filePath);
    Task<string> ExtractTextFromFirstPageAsync(string filePath, string mimeType);
    bool IsImageFile(string mimeType);
}