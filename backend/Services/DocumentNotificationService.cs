using Microsoft.AspNetCore.SignalR;
using TechDocQRSystem.Api.Hubs;

namespace TechDocQRSystem.Api.Services;

public class DocumentNotificationService : IDocumentNotificationService
{
    private readonly IHubContext<DocumentProcessingHub> _hubContext;
    private readonly ILogger<DocumentNotificationService> _logger;

    public DocumentNotificationService(IHubContext<DocumentProcessingHub> hubContext, ILogger<DocumentNotificationService> logger)
    {
        _hubContext = hubContext;
        _logger = logger;
    }

    private async Task<string> GetConnectedClientsCount(string groupName)
    {
        try
        {
            // Для простоты вернём строку, так как точный подсчёт клиентов в группе требует дополнительной логики
            return "Unknown (group exists)";
        }
        catch
        {
            return "Error getting count";
        }
    }

    public async Task NotifyDocumentProcessingStarted(Guid userId, Guid documentId, string filename)
    {
        var groupName = $"User_{userId}";
        var payload = new
        {
            DocumentId = documentId,
            Filename = filename,
            Status = "processing",
            Timestamp = DateTime.UtcNow
        };

        try
        {
            _logger.LogInformation("🔔 SignalR: Sending processing started notification to group {GroupName} for document {DocumentId} ({Filename})", 
                groupName, documentId, filename);
            _logger.LogInformation("🔔 SignalR: Payload: {@Payload}", payload);
            _logger.LogInformation("🔔 SignalR: HubContext available: {HubContextNotNull}", _hubContext != null);

            var clientsCount = await GetConnectedClientsCount(groupName);
            _logger.LogInformation("👥 SignalR: Connected clients in group {GroupName}: {ClientsCount}", groupName, clientsCount);

            await _hubContext.Clients.Group(groupName).SendAsync("DocumentProcessingStarted", payload);
            
            _logger.LogInformation("✅ SignalR: Successfully sent processing started notification to user {UserId} for document {DocumentId}", userId, documentId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "❌ SignalR: Failed to send processing started notification to user {UserId} for document {DocumentId}", userId, documentId);
        }
    }

    public async Task NotifyDocumentProcessingCompleted(Guid userId, Guid documentId, string filename, string summary, List<string> tags)
    {
        var groupName = $"User_{userId}";
        var payload = new
        {
            DocumentId = documentId,
            Filename = filename,
            Status = "completed",
            Summary = summary,
            Tags = tags,
            Timestamp = DateTime.UtcNow
        };

        try
        {
            _logger.LogInformation("🔔 SignalR: Sending processing completed notification to group {GroupName} for document {DocumentId} ({Filename})", 
                groupName, documentId, filename);
            _logger.LogInformation("🔔 SignalR: Payload: {@Payload}", payload);
            _logger.LogInformation("🔔 SignalR: HubContext available: {HubContextNotNull}", _hubContext != null);

            var clientsCount = await GetConnectedClientsCount(groupName);
            _logger.LogInformation("👥 SignalR: Connected clients in group {GroupName}: {ClientsCount}", groupName, clientsCount);

            await _hubContext.Clients.Group(groupName).SendAsync("DocumentProcessingCompleted", payload);
            
            _logger.LogInformation("✅ SignalR: Successfully sent processing completed notification to user {UserId} for document {DocumentId}", userId, documentId);
            _logger.LogInformation("📄 Document processing complete: {Filename} - Summary: {Summary}, Tags: {Tags}", 
                filename, summary?.Substring(0, Math.Min(100, summary?.Length ?? 0)), string.Join(", ", tags ?? new List<string>()));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "❌ SignalR: Failed to send processing completed notification to user {UserId} for document {DocumentId}", userId, documentId);
        }
    }

    public async Task NotifyDocumentProcessingFailed(Guid userId, Guid documentId, string filename, string error)
    {
        var groupName = $"User_{userId}";
        var payload = new
        {
            DocumentId = documentId,
            Filename = filename,
            Status = "failed",
            Error = error,
            Timestamp = DateTime.UtcNow
        };

        try
        {
            _logger.LogInformation("🔔 SignalR: Sending processing failed notification to group {GroupName} for document {DocumentId} ({Filename})", 
                groupName, documentId, filename);
            _logger.LogInformation("🔔 SignalR: Payload: {@Payload}", payload);

            await _hubContext.Clients.Group(groupName).SendAsync("DocumentProcessingFailed", payload);
            
            _logger.LogInformation("✅ SignalR: Successfully sent processing failed notification to user {UserId} for document {DocumentId}", userId, documentId);
            _logger.LogError("💥 Document processing failed: {Filename} - Error: {Error}", filename, error);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "❌ SignalR: Failed to send processing failed notification to user {UserId} for document {DocumentId}", userId, documentId);
        }
    }
}