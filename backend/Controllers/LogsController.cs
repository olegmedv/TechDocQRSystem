using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using TechDocQRSystem.Api.Models;
using TechDocQRSystem.Api.Services;

namespace TechDocQRSystem.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class LogsController : ControllerBase
{
    private readonly IActivityLogService _activityLogService;
    private readonly ILogger<LogsController> _logger;

    public LogsController(IActivityLogService activityLogService, ILogger<LogsController> logger)
    {
        _activityLogService = activityLogService;
        _logger = logger;
    }

    [HttpGet]
    public async Task<ActionResult> GetActivityLogs(
        [FromQuery] string? username,
        [FromQuery] string? actionType,
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        try
        {
            var currentUserId = GetCurrentUserId();
            var currentUserRole = GetCurrentUserRole();
            var isAdmin = currentUserRole == "admin";

            var filter = new ActivityLogFilterDto
            {
                Username = username,
                ActionType = actionType,
                FromDate = fromDate,
                ToDate = toDate,
                Page = page,
                PageSize = Math.Min(pageSize, 100) // Limit page size
            };

            var (logs, totalCount) = await _activityLogService.GetActivityLogsAsync(filter, isAdmin, currentUserId);
            
            return Ok(new
            {
                logs = logs,
                totalCount = totalCount,
                page = page,
                pageSize = filter.PageSize,
                totalPages = (int)Math.Ceiling((double)totalCount / filter.PageSize)
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get activity logs for user {UserId}", GetCurrentUserId());
            return StatusCode(500, new { message = "Failed to retrieve activity logs" });
        }
    }

    [HttpGet("my-stats")]
    public async Task<ActionResult> GetMyStats()
    {
        try
        {
            var userId = GetCurrentUserId();
            var stats = await _activityLogService.GetUserStatsAsync(userId);
            
            return Ok(stats);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get stats for user {UserId}", GetCurrentUserId());
            return StatusCode(500, new { message = "Failed to retrieve user statistics" });
        }
    }

    [HttpGet("action-types")]
    public IActionResult GetActionTypes()
    {
        return Ok(new[]
        {
            ActionTypes.Upload,
            ActionTypes.Download,
            ActionTypes.QrGenerate,
            ActionTypes.Search,
            ActionTypes.Login,
            ActionTypes.Register,
            ActionTypes.EmailConfirm,
            ActionTypes.View
        });
    }

    private Guid GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (Guid.TryParse(userIdClaim, out var userId))
        {
            return userId;
        }
        throw new UnauthorizedAccessException("Invalid user ID in token");
    }

    private string GetCurrentUserRole()
    {
        return User.FindFirst(ClaimTypes.Role)?.Value ?? "user";
    }
}