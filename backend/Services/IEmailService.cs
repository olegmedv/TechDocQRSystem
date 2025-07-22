namespace TechDocQRSystem.Api.Services;

public interface IEmailService
{
    Task SendEmailAsync(string to, string subject, string htmlBody);
    Task SendPlainTextEmailAsync(string to, string subject, string textBody);
}