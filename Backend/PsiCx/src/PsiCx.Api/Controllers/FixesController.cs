using Microsoft.AspNetCore.Mvc;
using PsiCx.Application;
using PsiCx.Domain;

namespace PsiCx.Api.Controllers;

/// <summary>Corrective actions (CA-n): propose, decide, done, the 60-day verdict and decision 3.</summary>
[ApiController]
[Route("api/v1/fixes")]
public sealed class FixesController(FixService fixes, ICurrentUser me) : ControllerBase
{
    public sealed record ProposeRequest(FixKind Kind, string Owner, ProductId Product, Bi Title, string? PatternId, EnvId? EnvId);
    public sealed record DecideRequest(FixDecision Decision, string? Reason, string? NewOwner);
    public sealed record DoneRequest(string Note, DateOnly DoneOn, string? Evidence);
    public sealed record VerdictRequest(FixVerdict Verdict);
    public sealed record InvestigateRequest(string? Environment);

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] EnvId? env, CancellationToken ct) => this.ToActionResult(await fixes.ListAsync(me.Actor, env, ct));

    [HttpGet("{id}")]
    public async Task<IActionResult> Get(string id, CancellationToken ct) => this.ToActionResult(await fixes.GetAsync(me.Actor, id, ct));

    [HttpPost]
    public async Task<IActionResult> Propose([FromBody] ProposeRequest b, CancellationToken ct) =>
        this.ToActionResult(await fixes.ProposeAsync(me.Actor, new ProposeFix(b.Kind, b.Owner, b.Product, b.Title, b.PatternId, b.EnvId), ct));

    [HttpPost("{id}/decision")]
    public async Task<IActionResult> Decide(string id, [FromBody] DecideRequest b, CancellationToken ct) =>
        this.ToActionResult(await fixes.DecideAsync(me.Actor, id, b.Decision, b.Reason, b.NewOwner, ct));

    [HttpPost("{id}/investigate-first")]
    public async Task<IActionResult> InvestigateFirst(string id, CancellationToken ct) => this.ToActionResult(await fixes.SendToInvestigationAsync(me.Actor, id, ct));

    [HttpPost("{id}/start")]
    public async Task<IActionResult> Start(string id, CancellationToken ct) => this.ToActionResult(await fixes.StartAsync(me.Actor, id, ct));

    [HttpPost("{id}/done")]
    public async Task<IActionResult> Done(string id, [FromBody] DoneRequest b, CancellationToken ct) =>
        this.ToActionResult(await fixes.MarkDoneAsync(me.Actor, id, b.Note, b.DoneOn, b.Evidence, ct));

    [HttpPost("{id}/verdict")]
    public async Task<IActionResult> Verdict(string id, [FromBody] VerdictRequest b, CancellationToken ct) =>
        this.ToActionResult(await fixes.RecordVerdictAsync(me.Actor, id, b.Verdict, ct));

    [HttpPost("{id}/second-step")]
    public async Task<IActionResult> SecondStep(string id, CancellationToken ct) => this.ToActionResult(await fixes.RequestSecondStepAsync(me.Actor, id, ct));

    [HttpPost("{id}/investigation")]
    public async Task<IActionResult> Investigate(string id, [FromBody] InvestigateRequest b, CancellationToken ct) =>
        this.ToActionResult(await fixes.InvestigateFromFixAsync(me.Actor, id, b.Environment, ct));

    [HttpPost("{id}/accept-as-is")]
    public async Task<IActionResult> Accept(string id, CancellationToken ct) => this.ToActionResult(await fixes.AcceptAsIsAsync(me.Actor, id, ct));
}

[ApiController]
[Route("api/v1/investigations")]
public sealed class InvestigationsController(FixService fixes, ICurrentUser me) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List(CancellationToken ct) => this.ToActionResult(await fixes.InvestigationsAsync(me.Actor, ct));
}
