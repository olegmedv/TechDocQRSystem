using QRCoder;

namespace TechDocQRSystem.Api.Services;

public class QrCodeService : IQrCodeService
{
    public string GenerateQrCode(string data)
    {
        var qrCodeBytes = GenerateQrCodeBytes(data);
        return Convert.ToBase64String(qrCodeBytes);
    }

    public byte[] GenerateQrCodeBytes(string data)
    {
        using var qrGenerator = new QRCodeGenerator();
        using var qrCodeData = qrGenerator.CreateQrCode(data, QRCodeGenerator.ECCLevel.Q);
        using var qrCode = new PngByteQRCode(qrCodeData);
        
        return qrCode.GetGraphic(20);
    }
}