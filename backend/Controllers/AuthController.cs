using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using TechDocQRSystem.Api.Models;
using TechDocQRSystem.Api.Services;

namespace TechDocQRSystem.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly ILogger<AuthController> _logger;

    public AuthController(IAuthService authService, ILogger<AuthController> logger)
    {
        _authService = authService;
        _logger = logger;
    }

    [HttpPost("register")]
    [ProducesResponseType(200)]
    [ProducesResponseType(400)]
    [ProducesResponseType(500)]
    public async Task<ActionResult<AuthResponseDto>> Register([FromBody] RegisterDto registerDto)
    {
        try
        {
            var ipAddress = GetClientIpAddress();
            var userAgent = Request.Headers["User-Agent"].ToString();
            
            var result = await _authService.RegisterAsync(registerDto, ipAddress, userAgent);
            
            // Set HTTP-only cookie
            SetAuthCookie(result.Token);
            
            return Ok(new { 
                message = "Registration successful. Please check your email to confirm your account.",
                user = result.User,
                expiresAt = result.ExpiresAt 
            });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Registration failed for user {Username}", registerDto.Username);
            return StatusCode(500, new { message = "Registration failed. Please try again." });
        }
    }

    [HttpPost("login")]
    [ProducesResponseType(200)]
    [ProducesResponseType(401)]
    [ProducesResponseType(500)]
    public async Task<ActionResult<AuthResponseDto>> Login([FromBody] LoginDto loginDto)
    {
        try
        {
            var ipAddress = GetClientIpAddress();
            var userAgent = Request.Headers["User-Agent"].ToString();
            
            var result = await _authService.LoginAsync(loginDto, ipAddress, userAgent);
            
            // Set HTTP-only cookie
            SetAuthCookie(result.Token);
            
            return Ok(new { 
                message = "Login successful",
                user = result.User,
                expiresAt = result.ExpiresAt,
                token = result.Token  // Add token for SignalR
            });
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Login failed for user {Username}", loginDto.Username);
            return StatusCode(500, new { message = "Login failed. Please try again." });
        }
    }

    [HttpPost("logout")]
    [Authorize]
    public IActionResult Logout()
    {
        Response.Cookies.Delete("authToken", new CookieOptions
        {
            HttpOnly = true,
            Secure = true,
            SameSite = SameSiteMode.None
        });
        
        return Ok(new { message = "Logout successful" });
    }

    [HttpGet("confirm-email")]
    public async Task<IActionResult> ConfirmEmail([FromQuery] string token)
    {
        try
        {
            var result = await _authService.ConfirmEmailAsync(token);
            
            if (result)
            {
                return Ok(new { message = "Email confirmed successfully. You can now log in." });
            }
            
            return BadRequest(new { message = "Invalid or expired confirmation token." });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Email confirmation failed for token {Token}", token);
            return StatusCode(500, new { message = "Email confirmation failed. Please try again." });
        }
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<ActionResult<User>> GetCurrentUser()
    {
        try
        {
            var userId = GetCurrentUserId();
            var user = await _authService.GetUserByIdAsync(userId);
            
            if (user == null)
            {
                return NotFound(new { message = "User not found" });
            }
            
            return Ok(user);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get current user");
            return StatusCode(500, new { message = "Failed to get user information" });
        }
    }

    [HttpPost("refresh")]
    [Authorize]
    public async Task<ActionResult> RefreshToken()
    {
        try
        {
            var userId = GetCurrentUserId();
            var user = await _authService.GetUserByIdAsync(userId);
            
            if (user == null)
            {
                return Unauthorized(new { message = "User not found" });
            }
            
            var newToken = _authService.GenerateJwtToken(user);
            var expiresAt = DateTime.UtcNow.AddMinutes(5); // 5 minutes as specified
            
            SetAuthCookie(newToken);
            
            return Ok(new { 
                message = "Token refreshed",
                expiresAt = expiresAt 
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Token refresh failed");
            return StatusCode(500, new { message = "Token refresh failed" });
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

    private void SetAuthCookie(string token)
    {
        Response.Cookies.Append("authToken", token, new CookieOptions
        {
            HttpOnly = true,
            Secure = true, // Требуется для SameSite=None при HTTPS
            SameSite = SameSiteMode.None, // Разрешаем cross-site для Cloudflare tunnel
            Expires = DateTimeOffset.UtcNow.AddMinutes(5) // 5 minutes as specified
        });
    }
}