using TechDocQRSystem.Api.Models;

namespace TechDocQRSystem.Api.Services;

public interface IAuthService
{
    Task<AuthResponseDto> RegisterAsync(RegisterDto registerDto, string ipAddress, string? userAgent);
    Task<AuthResponseDto> LoginAsync(LoginDto loginDto, string ipAddress, string? userAgent);
    Task<bool> ConfirmEmailAsync(string token);
    Task<User?> GetUserByIdAsync(Guid userId);
    Task<User?> GetUserByUsernameAsync(string username);
    Task<User?> GetUserByEmailAsync(string email);
    string GenerateJwtToken(User user);
    Task SendEmailConfirmationAsync(User user);
}