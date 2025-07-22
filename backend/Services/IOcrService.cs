namespace TechDocQRSystem.Api.Services;

public interface IOcrService
{
    Task<string> ExtractTextAsync(string filePath);
    bool IsImageFile(string mimeType);
}