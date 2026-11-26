using Microsoft.AspNetCore.Mvc;
using PsiCx.Application;
using PsiCx.Domain;

namespace PsiCx.Api.Controllers;

/// <summary>Survey answers and the indicators computed from them. The survey sets themselves are the "survey_sets" setting.</summary>
[ApiController]
[Route("api/v1/surveys")]
public sealed class SurveysController(SurveyService surveys, ICurrentUser me) : ControllerBase
{
    public sealed record ResponseRequest(string PersonId, ProductId Product, EnvId EnvId, Measure Measure, int Score, int? Scale, ChannelId Source, DateTimeOffset At, string? ReSurveyOf);

    [HttpGet("responses")]
    public async Task<IActionResult> List([FromQuery] ProductId? product, [FromQuery] EnvId? env, CancellationToken ct) =>
        this.ToActionResult(await surveys.ListAsync(me.Actor, product, env, ct));

    [HttpPost("responses")]
    public async Task<IActionResult> Record([FromBody] ResponseRequest b, CancellationToken ct) =>
        this.ToActionResult(await surveys.RecordAsync(me.Actor, new RecordResponse(b.PersonId, b.Product, b.EnvId, b.Measure, b.Score, b.Scale, b.Source, b.At, b.ReSurveyOf), ct));

    /// <summary>One product's NPS, CSAT and CES. There is no group number: the product is required.</summary>
    [HttpGet("indicators")]
    public async Task<IActionResult> Indicators([FromQuery] ProductId product, [FromQuery] EnvId? env, [FromQuery] DateTimeOffset? from, [FromQuery] DateTimeOffset? to, CancellationToken ct) =>
        this.ToActionResult(await surveys.IndicatorsAsync(me.Actor, product, env, from, to, ct));
}
