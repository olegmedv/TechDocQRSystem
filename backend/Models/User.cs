using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace TechDocQRSystem.Api.Models;

public class User
{
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [Required]
    [MaxLength(100)]
    public string Username { get; set; } = string.Empty;
    
    [Required]
    [EmailAddress]
    [MaxLength(255)]
    public string Email { get; set; } = string.Empty;
    
    [Required]
    [JsonIgnore]
    public string PasswordHash { get; set; } = string.Empty;
    
    [Required]
    public string Role { get; set; } = "user";
    
    public bool EmailConfirmed { get; set; } = false;
    
    [JsonIgnore]
    public Guid? EmailConfirmationToken { get; set; }
    
    [JsonIgnore]
    public DateTime? EmailConfirmationExpiresAt { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    
    // Navigation properties
    public virtual ICollection<Document> Documents { get; set; } = new List<Document>();
    public virtual ICollection<ActivityLog> ActivityLogs { get; set; } = new List<ActivityLog>();
}