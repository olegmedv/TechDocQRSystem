namespace TechDocQRSystem.Api.Services;

public interface IGeminiService
{
    Task<(string summary, List<string> tags)> ProcessTextAsync(string text);
}