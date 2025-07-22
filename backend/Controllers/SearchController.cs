using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using TechDocQRSystem.Api.Models;
using TechDocQRSystem.Api.Services;

namespace TechDocQRSystem.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SearchController : ControllerBase
{
    private readonly ISearchService _searchService;
    private readonly ILogger<SearchController> _logger;

    public SearchController(ISearchService searchService, ILogger<SearchController> logger)
    {
        _searchService = searchService;
        _logger = logger;
    }

    [HttpPost]
    public async Task<ActionResult<SearchResponseDto>> SearchDocuments([FromBody] SearchRequestDto request)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(request.Query))
            {
                return BadRequest(new { message = "Search query is required" });
            }

            var userId = GetCurrentUserId();
            var results = await _searchService.SearchDocumentsAsync(request, userId);
            
            return Ok(results);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Search failed for user {UserId} with query {Query}", GetCurrentUserId(), request.Query);
            return StatusCode(500, new { message = "Search failed. Please try again." });
        }
    }

    [HttpGet]
    public async Task<ActionResult<SearchResponseDto>> SearchDocumentsGet(
        [FromQuery] string query,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(query))
            {
                return BadRequest(new { message = "Search query is required" });
            }

            var request = new SearchRequestDto
            {
                Query = query,
                Page = page,
                PageSize = Math.Min(pageSize, 50) // Limit page size
            };

            var userId = GetCurrentUserId();
            var results = await _searchService.SearchDocumentsAsync(request, userId);
            
            return Ok(results);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Search failed for user {UserId} with query {Query}", GetCurrentUserId(), query);
            return StatusCode(500, new { message = "Search failed. Please try again." });
        }
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
}