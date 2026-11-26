using Microsoft.AspNetCore.Mvc;
using PsiCx.Application;
using PsiCx.Domain;

namespace PsiCx.Api.Controllers;

[ApiController]
[Route("api/v1")]
public sealed class SignalsController(SignalService signals, ICurrentUser me) : ControllerBase
{
    public sealed record SignalRequest(string Id, SignalKind Kind, ProductId Product, string Environment, EnvId EnvId, string Category,
        DateTimeOffset OccurredAt, bool IsPublic, string? PersonId, string? AgentRef, string[]? EventIds);

    [HttpGet("signals")]
    public async Task<IActionResult> List([FromQuery] EnvId? env, [FromQuery] SignalKind? kind, CancellationToken ct) =>
        this.ToActionResult(await signals.ListAsync(me.Actor, env, kind, ct));

    [HttpPost("signals")]
    public async Task<IActionResult> Add([FromBody] SignalRequest b, CancellationToken ct) =>
        this.ToActionResult(await signals.IngestAsync(me.Actor,
            new Signal(b.Id, b.Kind, b.Product, b.Environment, b.EnvId, b.Category, b.OccurredAt, b.IsPublic, b.PersonId, b.AgentRef, b.EventIds), ct));

    [HttpGet("patterns")]
    public async Task<IActionResult> Patterns([FromQuery] EnvId? env, CancellationToken ct) => this.ToActionResult(await signals.PatternsAsync(me.Actor, env, ct));
}
