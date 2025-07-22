using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using TechDocQRSystem.Api.Models;
using TechDocQRSystem.Api.Services;

namespace TechDocQRSystem.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DocumentsController : ControllerBase
{
    private readonly IDocumentService _documentService;
    private readonly IActivityLogService _activityLogService;
    private readonly ILogger<DocumentsController> _logger;

    public DocumentsController(IDocumentService documentService, 
                              IActivityLogService activityLogService,
                              ILogger<DocumentsController> logger)
    {
        _documentService = documentService;
        _activityLogService = activityLogService;
        _logger = logger;
    }

    [HttpPost("upload")]
    public async Task<ActionResult<DocumentResponseDto>> UploadDocument([FromForm] DocumentUploadDto uploadDto)
    {
        try
        {
            var userId = GetCurrentUserId();
            var ipAddress = GetClientIpAddress();
            var userAgent = Request.Headers["User-Agent"].ToString();

            var result = await _documentService.UploadDocumentAsync(uploadDto.File, userId, ipAddress, userAgent);
            
            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Document upload failed for user {UserId}", GetCurrentUserId());
            return StatusCode(500, new { message = "Document upload failed. Please try again." });
        }
    }

    [HttpGet("my-documents")]
    public async Task<ActionResult<List<DocumentResponseDto>>> GetMyDocuments()
    {
        try
        {
            var userId = GetCurrentUserId();
            var documents = await _documentService.GetUserDocumentsAsync(userId);
            
            return Ok(documents);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get documents for user {UserId}", GetCurrentUserId());
            return StatusCode(500, new { message = "Failed to retrieve documents" });
        }
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<DocumentResponseDto>> GetDocument(Guid id)
    {
        try
        {
            var userId = GetCurrentUserId();
            var document = await _documentService.GetDocumentByIdAsync(id, userId);
            
            if (document == null)
            {
                return NotFound(new { message = "Document not found" });
            }
            
            // Log view activity
            await _activityLogService.LogActivityAsync(userId, ActionTypes.View, 
                new { DocumentName = document.Filename }, null, null, id);
            
            return Ok(document);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get document {DocumentId} for user {UserId}", id, GetCurrentUserId());
            return StatusCode(500, new { message = "Failed to retrieve document" });
        }
    }

    [HttpGet("download/{accessToken}")]
    [AllowAnonymous]
    public async Task<IActionResult> DownloadDocument(Guid accessToken)
    {
        try
        {
            var userId = GetCurrentUserIdOrNull();
            var (fileStream, fileName, contentType) = await _documentService.GetDocumentAsync(accessToken, userId);
            
            return File(fileStream, contentType, fileName);
        }
        catch (FileNotFoundException)
        {
            return NotFound(new { message = "Document not found" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Download failed for access token {AccessToken}", accessToken);
            return StatusCode(500, new { message = "Download failed" });
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteDocument(Guid id)
    {
        try
        {
            var userId = GetCurrentUserId();
            var result = await _documentService.DeleteDocumentAsync(id, userId);
            
            if (!result)
            {
                return NotFound(new { message = "Document not found" });
            }
            
            return Ok(new { message = "Document deleted successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to delete document {DocumentId} for user {UserId}", id, GetCurrentUserId());
            return StatusCode(500, new { message = "Failed to delete document" });
        }
    }

    private string GetClientIpAddress()
    {
        var ipAddress = Request.Headers["X-Forwarded-For"].FirstOrDefault();
        if (string.IsNullOrEmpty(ipAddress))
        {
            ipAddress = Request.Headers["X-Real-IP"].FirstOrDefault();
        }
        if (string.IsNullOrEmpty(ipAddress))
        {
            ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
        }
        return ipAddress ?? "unknown";
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

    private Guid? GetCurrentUserIdOrNull()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (Guid.TryParse(userIdClaim, out var userId))
        {
            return userId;
        }
        return null;
    }
}