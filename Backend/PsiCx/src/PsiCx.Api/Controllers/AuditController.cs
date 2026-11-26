using Microsoft.AspNetCore.Mvc;
using PsiCx.Application;
using PsiCx.Domain;

namespace PsiCx.Api.Controllers;

[ApiController]
[Route("api/v1/audit")]
public sealed class AuditController(AuditService audit, ICurrentUser me) : ControllerBase
{
    /// <summary>The audit log, newest first. The super admin only.</summary>
    [HttpGet]
    public async Task<IActionResult> List([FromQuery] string? userId, [FromQuery] AuditKind? kind, [FromQuery] DateTimeOffset? from, [FromQuery] DateTimeOffset? to,
        [FromQuery] int skip = 0, [FromQuery] int take = 100, CancellationToken ct = default) =>
        this.ToActionResult(await audit.QueryAsync(me.Actor, new AuditQuery(userId, kind, from, to, skip, take), ct));

    public sealed record PageOpenedRequest(Bi Detail, string Path);

    /// <summary>The browser reports a page view. It is the only kind a client may write; every other kind is written by the server when it happens.</summary>
    [HttpPost("page-opened")]
    public async Task<IActionResult> PageOpened([FromBody] PageOpenedRequest body, CancellationToken ct)
    {
        if (me.Actor is null) return Unauthorized();
        if (string.IsNullOrWhiteSpace(body.Path) || body.Path.Length > 300 || body.Detail is null) return BadRequest();
        await audit.RecordAsync(me.Actor, AuditKind.PageOpened, body.Detail, body.Path, ct);
        return NoContent();
    }
}
