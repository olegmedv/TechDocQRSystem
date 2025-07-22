using Microsoft.EntityFrameworkCore;
using System.Net;
using System.Text.Json;
using TechDocQRSystem.Api.Data;
using TechDocQRSystem.Api.Models;

namespace TechDocQRSystem.Api.Services;

public class ActivityLogService : IActivityLogService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<ActivityLogService> _logger;

    public ActivityLogService(ApplicationDbContext context, ILogger<ActivityLogService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task LogActivityAsync(Guid userId, string actionType, object? details = null, 
                                     string? ipAddress = null, string? userAgent = null, Guid? documentId = null)
    {
        try
        {
            var activityLog = new ActivityLog
            {
                UserId = userId,
                DocumentId = documentId,
                ActionType = actionType,
                IpAddress = ipAddress,
                UserAgent = userAgent,
                Details = details != null ? JsonDocument.Parse(JsonSerializer.Serialize(details)) : null
            };

            _context.ActivityLogs.Add(activityLog);
            await _context.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to log activity for user {UserId}, action {ActionType}", userId, actionType);
        }
    }

    public async Task<(List<ActivityLogDto> logs, int totalCount)> GetActivityLogsAsync(
        ActivityLogFilterDto filter, bool isAdmin, Guid? currentUserId = null)
    {
        var query = _context.ActivityLogs
            .Include(al => al.User)
            .Include(al => al.Document)
            .AsQueryable();

        // Apply filters
        if (!isAdmin && currentUserId.HasValue)
        {
            query = query.Where(al => al.UserId == currentUserId.Value);
        }

        if (!string.IsNullOrEmpty(filter.Username))
        {
            query = query.Where(al => al.User.Username.Contains(filter.Username));
        }

        if (!string.IsNullOrEmpty(filter.ActionType))
        {
            query = query.Where(al => al.ActionType == filter.ActionType);
        }

        if (filter.FromDate.HasValue)
        {
            query = query.Where(al => al.CreatedAt >= filter.FromDate.Value);
        }

        if (filter.ToDate.HasValue)
        {
            query = query.Where(al => al.CreatedAt <= filter.ToDate.Value.AddDays(1));
        }

        var totalCount = await query.CountAsync();

        var rawLogs = await query
            .OrderByDescending(al => al.CreatedAt)
            .Skip((filter.Page - 1) * filter.PageSize)
            .Take(filter.PageSize)
            .Select(al => new 
            {
                Id = al.Id,
                ActionType = al.ActionType,
                DocumentName = al.Document != null ? al.Document.Filename : null,
                Username = al.User.Username,
                CreatedAt = al.CreatedAt,
                DetailsJson = al.Details != null ? al.Details.RootElement.GetRawText() : null
            })
            .ToListAsync();

        var logs = rawLogs.Select(rl => new ActivityLogDto
        {
            Id = rl.Id,
            ActionType = rl.ActionType,
            DocumentName = rl.DocumentName,
            Username = rl.Username,
            CreatedAt = rl.CreatedAt,
            Details = rl.DetailsJson != null ? JsonSerializer.Deserialize<object>(rl.DetailsJson) : null
        }).ToList();

        return (logs, totalCount);
    }

    public async Task<Dictionary<string, int>> GetUserStatsAsync(Guid userId)
    {
        var stats = await _context.ActivityLogs
            .Where(al => al.UserId == userId)
            .GroupBy(al => al.ActionType)
            .Select(g => new { ActionType = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.ActionType, x => x.Count);

        // Add total documents uploaded by user
        var documentsCount = await _context.Documents.CountAsync(d => d.UserId == userId);
        stats["total_documents"] = documentsCount;

        return stats;
    }
}