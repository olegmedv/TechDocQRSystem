using TechDocQRSystem.Api.Models;

namespace TechDocQRSystem.Api.Services;

public interface IDocumentService
{
    Task<DocumentResponseDto> UploadDocumentAsync(IFormFile file, Guid userId, string ipAddress, string? userAgent);
    Task<(Stream fileStream, string fileName, string contentType)> GetDocumentAsync(Guid accessToken, Guid? userId = null);
    Task<List<DocumentResponseDto>> GetUserDocumentsAsync(Guid userId);
    Task<bool> DeleteDocumentAsync(Guid documentId, Guid userId);
    Task<DocumentResponseDto?> GetDocumentByIdAsync(Guid documentId, Guid userId);
}