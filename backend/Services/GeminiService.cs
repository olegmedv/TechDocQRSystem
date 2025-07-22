using System.Text;
using System.Text.Json;

namespace TechDocQRSystem.Api.Services;

public class GeminiService : IGeminiService
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;
    private readonly ILogger<GeminiService> _logger;
    private const string GeminiApiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent";

    public GeminiService(HttpClient httpClient, IConfiguration configuration, ILogger<GeminiService> logger)
    {
        _httpClient = httpClient;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<(string summary, List<string> tags)> ProcessTextAsync(string text)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(text))
            {
                return (string.Empty, new List<string>());
            }

            var apiKey = _configuration["GeminiApiKey"];
            if (string.IsNullOrEmpty(apiKey))
            {
                _logger.LogWarning("Gemini API key not configured");
                return (string.Empty, new List<string>());
            }

            var prompt = $@"
Проанализируй следующий текст и предоставь:
1. Краткое резюме (2-3 предложения на русском языке)
2. 5-7 ключевых тегов на русском языке (одним словом каждый)

Ответ предоставь в следующем JSON формате:
{{
  ""summary"": ""краткое резюме"",
  ""tags"": [""тег1"", ""тег2"", ""тег3"", ""тег4"", ""тег5""]
}}

Текст для анализа:
{text.Substring(0, Math.Min(text.Length, 4000))}"; // Limit text length

            var requestBody = new
            {
                contents = new[]
                {
                    new
                    {
                        parts = new[]
                        {
                            new { text = prompt }
                        }
                    }
                }
            };

            var json = JsonSerializer.Serialize(requestBody);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            var requestUrl = $"{GeminiApiUrl}?key={apiKey}";
            var response = await _httpClient.PostAsync(requestUrl, content);

            if (response.IsSuccessStatusCode)
            {
                var responseContent = await response.Content.ReadAsStringAsync();
                var geminiResponse = JsonSerializer.Deserialize<JsonElement>(responseContent);

                if (geminiResponse.TryGetProperty("candidates", out var candidates) && candidates.GetArrayLength() > 0)
                {
                    var candidate = candidates[0];
                    if (candidate.TryGetProperty("content", out var contentProp) &&
                        contentProp.TryGetProperty("parts", out var parts) && parts.GetArrayLength() > 0)
                    {
                        var textResponse = parts[0].GetProperty("text").GetString();
                        return ParseGeminiResponse(textResponse);
                    }
                }
            }
            else
            {
                var errorContent = await response.Content.ReadAsStringAsync();
                _logger.LogError("Gemini API request failed: {StatusCode} - {Content}", 
                    response.StatusCode, errorContent);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to process text with Gemini API");
        }

        // Fallback: generate simple summary and tags
        return GenerateFallbackSummary(text);
    }

    private (string summary, List<string> tags) ParseGeminiResponse(string? response)
    {
        try
        {
            if (string.IsNullOrEmpty(response))
                return (string.Empty, new List<string>());

            // Try to extract JSON from the response
            var startIndex = response.IndexOf('{');
            var endIndex = response.LastIndexOf('}');
            
            if (startIndex >= 0 && endIndex > startIndex)
            {
                var jsonString = response.Substring(startIndex, endIndex - startIndex + 1);
                var parsed = JsonSerializer.Deserialize<JsonElement>(jsonString);
                
                var summary = parsed.TryGetProperty("summary", out var summaryProp) 
                    ? summaryProp.GetString() ?? string.Empty 
                    : string.Empty;
                    
                var tags = new List<string>();
                if (parsed.TryGetProperty("tags", out var tagsProp) && tagsProp.ValueKind == JsonValueKind.Array)
                {
                    foreach (var tag in tagsProp.EnumerateArray())
                    {
                        var tagValue = tag.GetString();
                        if (!string.IsNullOrEmpty(tagValue))
                        {
                            tags.Add(tagValue);
                        }
                    }
                }
                
                return (summary, tags);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to parse Gemini response: {Response}", response);
        }

        return (string.Empty, new List<string>());
    }

    private (string summary, List<string> tags) GenerateFallbackSummary(string text)
    {
        try
        {
            // Simple fallback summarization
            var words = text.Split(new[] { ' ', '\n', '\r', '\t' }, StringSplitOptions.RemoveEmptyEntries);
            var summary = string.Join(" ", words.Take(50));
            if (words.Length > 50)
            {
                summary += "...";
            }

            // Simple tag generation based on common words
            var commonWords = new HashSet<string> { "и", "в", "на", "с", "по", "для", "от", "до", "из", "к", "о", "об", "за", "при", "про", "через", "под", "над", "между", "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by" };
            var wordFrequency = words
                .Where(w => w.Length > 3 && !commonWords.Contains(w.ToLower()))
                .GroupBy(w => w.ToLower())
                .OrderByDescending(g => g.Count())
                .Take(5)
                .Select(g => g.Key)
                .ToList();

            return (summary, wordFrequency);
        }
        catch
        {
            return ("Документ содержит текстовую информацию", new List<string> { "документ", "текст" });
        }
    }
}