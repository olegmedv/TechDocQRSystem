namespace TechDocQRSystem.Api.Services;

public interface IDocumentNotificationService
{
    Task NotifyDocumentProcessingStarted(Guid userId, Guid documentId, string filename);
    Task NotifyDocumentProcessingCompleted(Guid userId, Guid documentId, string filename, string summary, List<string> tags);
    Task NotifyDocumentProcessingFailed(Guid userId, Guid documentId, string filename, string error);
}