using Microsoft.AspNetCore.Mvc;
using PsiCx.Application;

namespace PsiCx.Api.Controllers;

[ApiController]
[Route("api/v1/health")]
public sealed class HealthController(IClock clock) : ControllerBase
{
    /// <summary>Liveness check; also proves the JSON setup (camelCase, string enums).</summary>
    [HttpGet]
    public IActionResult Get() => Ok(new { status = "ok", at = clock.UtcNow });
}
