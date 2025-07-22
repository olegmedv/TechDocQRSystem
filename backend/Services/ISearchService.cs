using TechDocQRSystem.Api.Models;

namespace TechDocQRSystem.Api.Services;

public interface ISearchService
{
    Task<SearchResponseDto> SearchDocumentsAsync(SearchRequestDto request, Guid userId);
}