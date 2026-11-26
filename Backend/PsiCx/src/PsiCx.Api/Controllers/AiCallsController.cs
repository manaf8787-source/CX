using Microsoft.AspNetCore.Mvc;
using PsiCx.Application;
using PsiCx.Domain;

namespace PsiCx.Api.Controllers;

/// <summary>
/// The AI call center (BrightCall, 26 Nov). Daily totals in, one Overview out, plus the per-call events the portal acts on. CX manager and CX team.
/// The outcome mapping is the "brightcall_mapping" setting (CX manager edits, every change audited).
/// </summary>
[ApiController]
[Route("api/v1/ai-calls")]
public sealed class AiCallsController(AiCallService calls, ICurrentUser me) : ControllerBase
{
    /// <summary>The hourly and nightly refresh: the complete daily rows and extras of the range.</summary>
    [HttpPut("daily")]
    public async Task<IActionResult> Daily([FromBody] AiCallSync b, CancellationToken ct) => this.ToActionResult(await calls.SyncDailyAsync(me.Actor, b, ct));

    [HttpPut("campaigns")]
    public async Task<IActionResult> Campaigns([FromBody] List<AiCampaignTotals> b, CancellationToken ct) => this.ToActionResult(await calls.SyncCampaignsAsync(me.Actor, b, ct));

    /// <summary>The whole Overview for a period (days, default 30), environment and campaign.</summary>
    [HttpGet("summary")]
    public async Task<IActionResult> Summary([FromQuery] int? days, [FromQuery] EnvId? env, [FromQuery] string? campaign, CancellationToken ct) =>
        this.ToActionResult(await calls.SummaryAsync(me.Actor, days ?? 30, env, campaign, ct));

    [HttpGet("outcomes")]
    public async Task<IActionResult> Outcomes(CancellationToken ct) => this.ToActionResult(await calls.OutcomesAsync(me.Actor, ct));

    /// <summary>A per-call event from BrightCall (survey candidate or complaint). Any other call is answered with action "ignored".</summary>
    [HttpPost("events")]
    public async Task<IActionResult> Event([FromBody] BrightcallCall b, CancellationToken ct) => this.ToActionResult(await calls.EventAsync(me.Actor, b, ct));

    [HttpGet("events")]
    public async Task<IActionResult> Events([FromQuery] string? personId, [FromQuery] EnvId? env, [FromQuery] DateTimeOffset? from, [FromQuery] DateTimeOffset? to, CancellationToken ct) =>
        this.ToActionResult(await calls.EventsAsync(me.Actor, personId, env, from, to, ct));
}
