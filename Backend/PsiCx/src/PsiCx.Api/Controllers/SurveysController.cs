using Microsoft.AspNetCore.Mvc;
using PsiCx.Application;
using PsiCx.Domain;

namespace PsiCx.Api.Controllers;

/// <summary>Survey answers and the indicators computed from them. The survey sets themselves are the "survey_sets" setting.</summary>
[ApiController]
[Route("api/v1/surveys")]
public sealed class SurveysController(SurveyService surveys, ICurrentUser me) : ControllerBase
{
    public sealed record ResponseRequest(string PersonId, ProductId Product, EnvId EnvId, Measure Measure, int Score, int? Scale, ChannelId Source, DateTimeOffset At, string? ReSurveyOf, ReachedVia? Via, string? Note,
        string? Comment, Bi? Touchpoint, bool? Digital, string? HandledBy, string? Unit, Bi? Moment, DetractorReason? Reason, bool? CallPending);
    public sealed record ReasonRequest(DetractorReason Reason);

    [HttpGet("responses")]
    public async Task<IActionResult> List([FromQuery] ProductId? product, [FromQuery] EnvId? env, CancellationToken ct) =>
        this.ToActionResult(await surveys.ListAsync(me.Actor, product, env, ct));

    [HttpPost("responses")]
    public async Task<IActionResult> Record([FromBody] ResponseRequest b, CancellationToken ct) =>
        this.ToActionResult(await surveys.RecordAsync(me.Actor, new RecordResponse(b.PersonId, b.Product, b.EnvId, b.Measure, b.Score, b.Scale, b.Source, b.At, b.ReSurveyOf, b.Via ?? ReachedVia.None, b.Note,
            b.Comment, b.Touchpoint, b.Digital ?? false, b.HandledBy, b.Unit, b.Moment, b.Reason, b.CallPending ?? true), ct));

    /// <summary>One product's NPS, CSAT and CES. There is no group number: the product is required.</summary>
    [HttpGet("indicators")]
    public async Task<IActionResult> Indicators([FromQuery] ProductId product, [FromQuery] EnvId? env, [FromQuery] DateTimeOffset? from, [FromQuery] DateTimeOffset? to, CancellationToken ct) =>
        this.ToActionResult(await surveys.IndicatorsAsync(me.Actor, product, env, from, to, ct));

    /// <summary>The recovery results page: detractors before and after the re-survey, with the call notes. CX only.</summary>
    [HttpGet("recovery")]
    public async Task<IActionResult> Recovery([FromQuery] ProductId? product, [FromQuery] Measure? measure, [FromQuery] ReachedVia? via, [FromQuery] EnvId? env, CancellationToken ct) =>
        this.ToActionResult(await surveys.RecoveryAsync(me.Actor, product, measure, via, env, ct));

    /// <summary>Detractor analysis: every detractor in scope with why, and the breakdowns. CX only. `days=90` is what the daily brief reads.</summary>
    [HttpGet("detractors")]
    public async Task<IActionResult> Detractors([FromQuery] ProductId? product, [FromQuery] Measure? measure, [FromQuery] EnvId? env, [FromQuery] int? days, [FromQuery] DetractorReason? reason, [FromQuery] DetractorTheme? theme, CancellationToken ct) =>
        this.ToActionResult(await surveys.DetractorsAsync(me.Actor, product, measure ?? Measure.Nps, env, days, reason, theme, ct));

    [HttpPut("responses/{id}/reason")]
    public async Task<IActionResult> SetReason(string id, [FromBody] ReasonRequest b, CancellationToken ct) =>
        this.ToActionResult(await surveys.SetReasonAsync(me.Actor, id, b.Reason, ct));
}
