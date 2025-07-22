using System.ComponentModel.DataAnnotations;

namespace TechDocQRSystem.Api.Models;

// Authentication DTOs
public class RegisterDto
{
    [Required]
    [MaxLength(100)]
    public string Username { get; set; } = string.Empty;
    
    [Required]
    [EmailAddress]
    [RegularExpression(@"^[^@]+@yandex\.(ru|com)$", ErrorMessage = "Only Yandex email addresses are allowed")]
    public string Email { get; set; } = string.Empty;
    
    [Required]
    [MinLength(6)]
    public string Password { get; set; } = string.Empty;
}

public class LoginDto
{
    [Required]
    public string Username { get; set; } = string.Empty;
    
    [Required]
    public string Password { get; set; } = string.Empty;
}

public class AuthResponseDto
{
    public string Token { get; set; } = string.Empty;
    public User User { get; set; } = null!;
    public DateTime ExpiresAt { get; set; }
}

// Document DTOs
public class DocumentResponseDto
{
    public Guid Id { get; set; }
    public string Filename { get; set; } = string.Empty;
    public long FileSize { get; set; }
    public string MimeType { get; set; } = string.Empty;
    public string AccessLink { get; set; } = string.Empty;
    public string QrCodeBase64 { get; set; } = string.Empty;
    public string? Summary { get; set; }
    public List<string> Tags { get; set; } = new List<string>();
    public DateTime CreatedAt { get; set; }
    public int DownloadCount { get; set; }
    public int QrGenerationCount { get; set; }
    public DateTime? LastAccessedAt { get; set; }
}

public class DocumentUploadDto
{
    [Required]
    public IFormFile File { get; set; } = null!;
}

// Search DTOs
public class SearchRequestDto
{
    [Required]
    public string Query { get; set; } = string.Empty;
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 10;
}

public class SearchResponseDto
{
    public List<SearchResultDto> Results { get; set; } = new List<SearchResultDto>();
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
}

public class SearchResultDto
{
    public Guid Id { get; set; }
    public string Filename { get; set; } = string.Empty;
    public string? Summary { get; set; }
    public List<string> Tags { get; set; } = new List<string>();
    public string AccessLink { get; set; } = string.Empty;
    public string QrCodeBase64 { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public int UserAccessCount { get; set; } // How many times current user accessed this file
}

// Activity Log DTOs
public class ActivityLogDto
{
    public Guid Id { get; set; }
    public string ActionType { get; set; } = string.Empty;
    public string? DocumentName { get; set; }
    public string Username { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public object? Details { get; set; }
}

public class ActivityLogFilterDto
{
    public string? Username { get; set; }
    public string? ActionType { get; set; }
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}