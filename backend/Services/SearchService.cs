using Microsoft.EntityFrameworkCore;
using TechDocQRSystem.Api.Data;
using TechDocQRSystem.Api.Models;

namespace TechDocQRSystem.Api.Services;

public class SearchService : ISearchService
{
    private readonly ApplicationDbContext _context;
    private readonly IQrCodeService _qrCodeService;
    private readonly IConfiguration _configuration;
    private readonly IActivityLogService _activityLogService;

    public SearchService(ApplicationDbContext context, IQrCodeService qrCodeService, 
                        IConfiguration configuration, IActivityLogService activityLogService)
    {
        _context = context;
        _qrCodeService = qrCodeService;
        _configuration = configuration;
        _activityLogService = activityLogService;
    }

    public async Task<SearchResponseDto> SearchDocumentsAsync(SearchRequestDto request, Guid userId)
    {
        var query = _context.Documents.AsQueryable();

        // Full-text search using PostgreSQL
        if (!string.IsNullOrEmpty(request.Query))
        {
            var searchTerms = request.Query.Split(' ', StringSplitOptions.RemoveEmptyEntries);
            
            foreach (var term in searchTerms)
            {
                var searchTerm = term.ToLower();
                query = query.Where(d => 
                    EF.Functions.Like(d.Filename.ToLower(), $"%{searchTerm}%") ||
                    EF.Functions.Like(d.Summary!.ToLower(), $"%{searchTerm}%") ||
                    d.Tags.Any(tag => EF.Functions.Like(tag.ToLower(), $"%{searchTerm}%")) ||
                    EF.Functions.Like(d.OcrText!.ToLower(), $"%{searchTerm}%"));
            }
        }

        var totalCount = await query.CountAsync();

        var documents = await query
            .OrderByDescending(d => d.CreatedAt)
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync();

        var results = new List<SearchResultDto>();

        foreach (var doc in documents)
        {
            // Count how many times current user accessed this document
            var userAccessCount = await _context.ActivityLogs
                .CountAsync(al => al.UserId == userId && 
                           al.DocumentId == doc.Id && 
                           al.ActionType == ActionTypes.Download);

            var accessLink = $"{_configuration["TunnelUrl"]}/api/documents/download/{doc.AccessToken}";
            var qrCodeBase64 = _qrCodeService.GenerateQrCode(accessLink);

            results.Add(new SearchResultDto
            {
                Id = doc.Id,
                Filename = doc.Filename,
                Summary = doc.Summary,
                Tags = doc.Tags,
                AccessLink = accessLink,
                QrCodeBase64 = qrCodeBase64,
                CreatedAt = doc.CreatedAt,
                UserAccessCount = userAccessCount
            });
        }

        // Log search activity
        await _activityLogService.LogActivityAsync(userId, ActionTypes.Search, 
            new { Query = request.Query, ResultsCount = results.Count });

        return new SearchResponseDto
        {
            Results = results,
            TotalCount = totalCount,
            Page = request.Page,
            PageSize = request.PageSize
        };
    }
}