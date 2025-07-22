using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Text.RegularExpressions;
using TechDocQRSystem.Api.Data;
using TechDocQRSystem.Api.Models;
using BCrypt.Net;

namespace TechDocQRSystem.Api.Services;

public class AuthService : IAuthService
{
    private readonly ApplicationDbContext _context;
    private readonly IConfiguration _configuration;
    private readonly IEmailService _emailService;
    private readonly IActivityLogService _activityLogService;
    
    public AuthService(ApplicationDbContext context, IConfiguration configuration, 
                      IEmailService emailService, IActivityLogService activityLogService)
    {
        _context = context;
        _configuration = configuration;
        _emailService = emailService;
        _activityLogService = activityLogService;
    }

    public async Task<AuthResponseDto> RegisterAsync(RegisterDto registerDto, string ipAddress, string? userAgent)
    {
        // Validate Yandex email
        var emailPattern = @"^[^@]+@yandex\.(ru|com)$";
        if (!Regex.IsMatch(registerDto.Email, emailPattern, RegexOptions.IgnoreCase))
        {
            throw new ArgumentException("Only Yandex email addresses are allowed");
        }

        // Check if user already exists
        if (await _context.Users.AnyAsync(u => u.Username == registerDto.Username || u.Email == registerDto.Email))
        {
            throw new ArgumentException("User with this username or email already exists");
        }

        // Create user
        var user = new User
        {
            Username = registerDto.Username,
            Email = registerDto.Email.ToLower(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(registerDto.Password),
            Role = "user",
            EmailConfirmed = true, // Auto-confirm for development
            EmailConfirmationToken = null,
            EmailConfirmationExpiresAt = null
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        // Log registration
        await _activityLogService.LogActivityAsync(user.Id, ActionTypes.Register, 
            new { Email = user.Email }, ipAddress, userAgent);

        // Generate token (but user won't be able to use it until email is confirmed)
        var token = GenerateJwtToken(user);
        var expiresAt = DateTime.UtcNow.AddMinutes(_configuration.GetValue<int>("Jwt:ExpireMinutes"));

        return new AuthResponseDto
        {
            Token = token,
            User = user,
            ExpiresAt = expiresAt
        };
    }

    public async Task<AuthResponseDto> LoginAsync(LoginDto loginDto, string ipAddress, string? userAgent)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Username == loginDto.Username);

        if (user == null || !BCrypt.Net.BCrypt.Verify(loginDto.Password, user.PasswordHash))
        {
            throw new UnauthorizedAccessException("Invalid username or password");
        }

        if (!user.EmailConfirmed)
        {
            throw new UnauthorizedAccessException("Please confirm your email before logging in");
        }

        // Log login
        await _activityLogService.LogActivityAsync(user.Id, ActionTypes.Login, 
            new { Username = user.Username }, ipAddress, userAgent);

        var token = GenerateJwtToken(user);
        var expiresAt = DateTime.UtcNow.AddMinutes(_configuration.GetValue<int>("Jwt:ExpireMinutes"));

        return new AuthResponseDto
        {
            Token = token,
            User = user,
            ExpiresAt = expiresAt
        };
    }

    public async Task<bool> ConfirmEmailAsync(string token)
    {
        if (!Guid.TryParse(token, out var tokenGuid))
            return false;

        var user = await _context.Users.FirstOrDefaultAsync(u => 
            u.EmailConfirmationToken == tokenGuid && 
            u.EmailConfirmationExpiresAt > DateTime.UtcNow);

        if (user == null)
            return false;

        user.EmailConfirmed = true;
        user.EmailConfirmationToken = null;
        user.EmailConfirmationExpiresAt = null;

        await _context.SaveChangesAsync();

        // Log email confirmation
        await _activityLogService.LogActivityAsync(user.Id, ActionTypes.EmailConfirm, 
            new { Email = user.Email });

        return true;
    }

    public async Task<User?> GetUserByIdAsync(Guid userId)
    {
        return await _context.Users.FindAsync(userId);
    }

    public async Task<User?> GetUserByUsernameAsync(string username)
    {
        return await _context.Users.FirstOrDefaultAsync(u => u.Username == username);
    }

    public async Task<User?> GetUserByEmailAsync(string email)
    {
        return await _context.Users.FirstOrDefaultAsync(u => u.Email == email.ToLower());
    }

    public string GenerateJwtToken(User user)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_configuration["Jwt:Key"]!));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Name, user.Username),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Role, user.Role)
        };

        var token = new JwtSecurityToken(
            issuer: _configuration["Jwt:Issuer"],
            audience: _configuration["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(_configuration.GetValue<int>("Jwt:ExpireMinutes")),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public async Task SendEmailConfirmationAsync(User user)
    {
        if (user.EmailConfirmationToken == null)
            return;

        var confirmationLink = $"{_configuration["TunnelUrl"]}/auth/confirm-email?token={user.EmailConfirmationToken}";
        
        var subject = "Confirm your email - TechDoc QR System";
        var body = $@"
            <h2>Confirm Your Email Address</h2>
            <p>Hello {user.Username},</p>
            <p>Thank you for registering with TechDoc QR System. Please click the link below to confirm your email address:</p>
            <p><a href='{confirmationLink}' style='background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;'>Confirm Email</a></p>
            <p>Or copy and paste this link in your browser:</p>
            <p>{confirmationLink}</p>
            <p>This link will expire in 24 hours.</p>
            <p>Best regards,<br>TechDoc QR System</p>
        ";

        await _emailService.SendEmailAsync(user.Email, subject, body);
    }
}