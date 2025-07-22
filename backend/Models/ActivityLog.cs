using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json;

namespace TechDocQRSystem.Api.Models;

public class ActivityLog
{
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [Required]
    public Guid UserId { get; set; }
    
    public Guid? DocumentId { get; set; }
    
    [Required]
    [MaxLength(50)]
    public string ActionType { get; set; } = string.Empty; // upload, download, qr_generate, search, login, register
    
    public JsonDocument? Details { get; set; }
    
    public string? IpAddress { get; set; }
    
    public string? UserAgent { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    
    // Navigation properties
    [ForeignKey(nameof(UserId))]
    public virtual User User { get; set; } = null!;
    
    [ForeignKey(nameof(DocumentId))]
    public virtual Document? Document { get; set; }
}

public static class ActionTypes
{
    public const string Upload = "upload";
    public const string Download = "download";
    public const string QrGenerate = "qr_generate";
    public const string Search = "search";
    public const string Login = "login";
    public const string Register = "register";
    public const string EmailConfirm = "email_confirm";
    public const string View = "view";
}