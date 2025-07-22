using TechDocQRSystem.Api.Models;

namespace TechDocQRSystem.Api.Services;

public interface IDocumentService
{
    Task<DocumentResponseDto> UploadDocumentAsync(IFormFile file, Guid userId, string ipAddress, string? userAgent);
    Task<(Stream fileStream, string fileName, string contentType)> GetDocumentAsync(Guid accessToken, Guid? userId = null);
    Task<List<DocumentResponseDto>> GetUserDocumentsAsync(Guid userId);
    Task<List<DocumentResponseDto>> GetAllDocumentsAsync();
    Task<bool> DeleteDocumentAsync(Guid documentId, Guid userId);
    Task<DocumentResponseDto?> GetDocumentByIdAsync(Guid documentId, Guid userId);
    Task<(Stream fileStream, string fileName, string contentType)> DownloadDocumentByIdAsync(Guid documentId, Guid userId, string userRole, string ipAddress, string userAgent);
    Task GenerateQRAsync(Guid documentId, Guid userId, string userRole, string ipAddress, string userAgent);
    Task<List<DocumentResponseDto>> SearchDocumentsAsync(string query, Guid userId, string userRole);
}