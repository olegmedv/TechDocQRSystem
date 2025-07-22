using TechDocQRSystem.Api.Models;

namespace TechDocQRSystem.Api.Services;

public interface IActivityLogService
{
    Task LogActivityAsync(Guid userId, string actionType, object? details = null, string? ipAddress = null, string? userAgent = null, Guid? documentId = null);
    Task<(List<ActivityLogDto> logs, int totalCount)> GetActivityLogsAsync(ActivityLogFilterDto filter, bool isAdmin, Guid? currentUserId = null);
    Task<Dictionary<string, int>> GetUserStatsAsync(Guid userId);
}