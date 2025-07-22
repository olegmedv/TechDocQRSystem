using Microsoft.AspNetCore.Mvc;
using TechDocQRSystem.Api.Services;

namespace TechDocQRSystem.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TestController : ControllerBase
{
    private readonly IQrCodeService _qrCodeService;

    public TestController(IQrCodeService qrCodeService)
    {
        _qrCodeService = qrCodeService;
    }

    [HttpGet("qr")]
    public ActionResult<string> TestQrCode([FromQuery] string text = "Test QR Code")
    {
        try
        {
            var qrCodeBase64 = _qrCodeService.GenerateQrCode(text);
            return Ok(new { 
                text = text,
                qrCodeBase64 = qrCodeBase64,
                message = "QR Code generated successfully" 
            });
        }
        catch (Exception ex)
        {
            return BadRequest(new { 
                error = ex.Message,
                message = "QR Code generation failed" 
            });
        }
    }

    [HttpGet("health")]
    public ActionResult Health()
    {
        return Ok(new { 
            status = "healthy", 
            timestamp = DateTime.UtcNow,
            version = "1.0.0"
        });
    }
}