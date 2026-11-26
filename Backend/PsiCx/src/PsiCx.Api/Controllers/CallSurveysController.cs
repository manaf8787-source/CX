using Microsoft.AspNetCore.Mvc;
using PsiCx.Application;
using PsiCx.Domain;
using PsiCx.Rules;

namespace PsiCx.Api.Controllers;

/// <summary>
/// The survey after a call-center call (26 Nov). The rule itself is the "call_survey_rule" setting (CX manager edits, others read);
/// when no version is saved yet the defaults apply and GET /rule returns them.
/// </summary>
[ApiController]
[Route("api/v1/call-surveys")]
public sealed class CallSurveysController(CallSurveyService calls, ICallSurveyRuleSource ruleSource, ICurrentUser me) : ControllerBase
{
    public sealed record AnswerRequest(int Csat, int Ces, string? Comment, DateTimeOffset? At);
    public sealed record QaRequest(int Score);
    public sealed record PreviewRequest(CallSurveyRule Rule, int? Days);

    /// <summary>The "call ended" event from the call center. Sent twice, it is stored once.</summary>
    [HttpPost("calls")]
    public async Task<IActionResult> Ingest([FromBody] CallEnded b, CancellationToken ct) => this.ToActionResult(await calls.IngestAsync(me.Actor, b, ct));

    [HttpGet("calls")]
    public async Task<IActionResult> List([FromQuery] EnvId? env, [FromQuery] CallSurveyStatus? status, [FromQuery] DateTimeOffset? from, [FromQuery] DateTimeOffset? to, CancellationToken ct) =>
        this.ToActionResult(await calls.ListAsync(me.Actor, env, status, from, to, ct));

    [HttpPost("calls/{callId}/answer")]
    public async Task<IActionResult> Answer(string callId, [FromBody] AnswerRequest b, CancellationToken ct) =>
        this.ToActionResult(await calls.AnswerAsync(me.Actor, callId, new CallSurveyAnswer(b.Csat, b.Ces, b.Comment, b.At), ct));

    [HttpPut("calls/{callId}/qa")]
    public async Task<IActionResult> Qa(string callId, [FromBody] QaRequest b, CancellationToken ct) => this.ToActionResult(await calls.AttachQaAsync(me.Actor, callId, b.Score, ct));

    [HttpGet("report")]
    public async Task<IActionResult> Report([FromQuery] EnvId? env, [FromQuery] DateTimeOffset? from, [FromQuery] DateTimeOffset? to, CancellationToken ct) =>
        this.ToActionResult(await calls.ReportAsync(me.Actor, env, from, to, ct));

    [HttpPost("preview")]
    public async Task<IActionResult> Preview([FromBody] PreviewRequest b, CancellationToken ct) => this.ToActionResult(await calls.PreviewAsync(me.Actor, b.Rule, b.Days ?? 30, ct));

    /// <summary>The rule in force (saved version, or the defaults). Any signed-in role.</summary>
    [HttpGet("rule")]
    public async Task<IActionResult> Rule(CancellationToken ct) => me.Actor is null ? Unauthorized() : Ok(await ruleSource.RuleAsync(ct) is var r ? r with { SendOn = r.Results } : null);

    /// <summary>Sends what is due now (the background job does this every minute). CX manager.</summary>
    [HttpPost("dispatch")]
    public async Task<IActionResult> Dispatch(CancellationToken ct) => this.ToActionResult(await calls.DispatchNowAsync(me.Actor, ct));
}
