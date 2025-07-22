namespace TechDocQRSystem.Api.Services;

public interface IQrCodeService
{
    string GenerateQrCode(string data);
    byte[] GenerateQrCodeBytes(string data);
}