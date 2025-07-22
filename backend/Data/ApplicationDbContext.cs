using Microsoft.EntityFrameworkCore;
using TechDocQRSystem.Api.Models;
using System.Text.Json;

namespace TechDocQRSystem.Api.Data;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options)
    {
    }
    
    public DbSet<User> Users { get; set; } = null!;
    public DbSet<Document> Documents { get; set; } = null!;
    public DbSet<ActivityLog> ActivityLogs { get; set; } = null!;
    
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        
        // User configuration
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.Email).IsUnique();
            entity.HasIndex(e => e.Username).IsUnique();
            entity.Property(e => e.Role).HasDefaultValue("user");
            entity.Property(e => e.EmailConfirmed).HasDefaultValue(false);
        });
        
        // Document configuration
        modelBuilder.Entity<Document>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.AccessToken).IsUnique();
            entity.HasIndex(e => e.UserId);
            
            // Configure Tags as JSON array for PostgreSQL
            entity.Property(e => e.Tags)
                .HasConversion(
                    v => JsonSerializer.Serialize(v, (JsonSerializerOptions)null!),
                    v => JsonSerializer.Deserialize<List<string>>(v, (JsonSerializerOptions)null!) ?? new List<string>()
                );
        });
        
        // ActivityLog configuration
        modelBuilder.Entity<ActivityLog>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => e.CreatedAt);
            
            // Configure IpAddress as string
            entity.Property(e => e.IpAddress);
                
            // Configure Details as JSON
            entity.Property(e => e.Details)
                .HasColumnType("jsonb");
        });
        
        // Relationships
        modelBuilder.Entity<Document>()
            .HasOne(d => d.User)
            .WithMany(u => u.Documents)
            .HasForeignKey(d => d.UserId)
            .OnDelete(DeleteBehavior.Cascade);
            
        modelBuilder.Entity<ActivityLog>()
            .HasOne(al => al.User)
            .WithMany(u => u.ActivityLogs)
            .HasForeignKey(al => al.UserId)
            .OnDelete(DeleteBehavior.Cascade);
            
        modelBuilder.Entity<ActivityLog>()
            .HasOne(al => al.Document)
            .WithMany(d => d.ActivityLogs)
            .HasForeignKey(al => al.DocumentId)
            .OnDelete(DeleteBehavior.SetNull);
    }
    
    public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        var entries = ChangeTracker
            .Entries()
            .Where(e => e.Entity is User || e.Entity is Document || e.Entity is ActivityLog);
            
        foreach (var entityEntry in entries)
        {
            if (entityEntry.State == EntityState.Modified)
            {
                if (entityEntry.Entity is User user)
                    user.UpdatedAt = DateTime.UtcNow;
                else if (entityEntry.Entity is Document document)
                    document.UpdatedAt = DateTime.UtcNow;
                else if (entityEntry.Entity is ActivityLog log)
                    log.UpdatedAt = DateTime.UtcNow;
            }
        }
        
        return await base.SaveChangesAsync(cancellationToken);
    }
}