using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using System.Security.Claims;

namespace TechDocQRSystem.Api.Hubs;

[Authorize]
public class DocumentProcessingHub : Hub
{
    private readonly ILogger<DocumentProcessingHub> _logger;

    public DocumentProcessingHub(ILogger<DocumentProcessingHub> logger)
    {
        _logger = logger;
    }

    public async Task JoinUserGroup()
    {
        var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var groupName = $"User_{userId}";
        
        if (!string.IsNullOrEmpty(userId))
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, groupName);
            _logger.LogInformation("🔗 SignalR: User {UserId} with connection {ConnectionId} joined group {GroupName}", 
                userId, Context.ConnectionId, groupName);
        }
        else
        {
            _logger.LogWarning("⚠️ SignalR: No userId found in claims for connection {ConnectionId}", Context.ConnectionId);
        }
    }

    public async Task LeaveUserGroup()
    {
        var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var groupName = $"User_{userId}";
        
        if (!string.IsNullOrEmpty(userId))
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, groupName);
            _logger.LogInformation("🔗 SignalR: User {UserId} with connection {ConnectionId} left group {GroupName}", 
                userId, Context.ConnectionId, groupName);
        }
    }

    public override async Task OnConnectedAsync()
    {
        var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        _logger.LogInformation("🔌 SignalR: Client connected - ConnectionId: {ConnectionId}, UserId: {UserId}", 
            Context.ConnectionId, userId ?? "Unknown");
        
        await JoinUserGroup();
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        _logger.LogInformation("🔌 SignalR: Client disconnected - ConnectionId: {ConnectionId}, UserId: {UserId}, Exception: {Exception}", 
            Context.ConnectionId, userId ?? "Unknown", exception?.Message ?? "None");
        
        await LeaveUserGroup();
        await base.OnDisconnectedAsync(exception);
    }
}