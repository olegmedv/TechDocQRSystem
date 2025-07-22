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

    public async Task NotifyDocumentProcessingStarted(Guid userId, Guid documentId, string filename)
    {
        try
        {
            await _hubContext.Clients.Group($"User_{userId}").SendAsync("DocumentProcessingStarted", new
            {
                DocumentId = documentId,
                Filename = filename,
                Status = "processing",
                Timestamp = DateTime.UtcNow
            });
            
            _logger.LogInformation("Sent processing started notification to user {UserId} for document {DocumentId}", userId, documentId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send processing started notification to user {UserId} for document {DocumentId}", userId, documentId);
        }
    }

    public async Task NotifyDocumentProcessingCompleted(Guid userId, Guid documentId, string filename, string summary, List<string> tags)
    {
        try
        {
            await _hubContext.Clients.Group($"User_{userId}").SendAsync("DocumentProcessingCompleted", new
            {
                DocumentId = documentId,
                Filename = filename,
                Status = "completed",
                Summary = summary,
                Tags = tags,
                Timestamp = DateTime.UtcNow
            });
            
            _logger.LogInformation("Sent processing completed notification to user {UserId} for document {DocumentId}", userId, documentId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send processing completed notification to user {UserId} for document {DocumentId}", userId, documentId);
        }
    }

    public async Task NotifyDocumentProcessingFailed(Guid userId, Guid documentId, string filename, string error)
    {
        try
        {
            await _hubContext.Clients.Group($"User_{userId}").SendAsync("DocumentProcessingFailed", new
            {
                DocumentId = documentId,
                Filename = filename,
                Status = "failed",
                Error = error,
                Timestamp = DateTime.UtcNow
            });
            
            _logger.LogInformation("Sent processing failed notification to user {UserId} for document {DocumentId}", userId, documentId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send processing failed notification to user {UserId} for document {DocumentId}", userId, documentId);
        }
    }
}