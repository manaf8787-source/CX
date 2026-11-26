using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using PsiCx.Application;

namespace PsiCx.Api.Controllers;

[ApiController]
[Route("api/v1/settings")]
public sealed class SettingsController(SettingsService settings, ICurrentUser me) : ControllerBase
{
    public sealed record PutRequest(JsonElement Value, int ExpectedVersion, string? Note);
    public sealed record RestoreRequest(int Version, int ExpectedVersion);

    /// <summary>The names of the settings the portal keeps.</summary>
    [HttpGet]
    public IActionResult Keys() => me.Actor is null ? Unauthorized() : Ok(SettingKeys.All);

    [HttpGet("{key}")]
    public async Task<IActionResult> Get(string key, CancellationToken ct) => this.ToActionResult(await settings.GetAsync(me.Actor, key, ct));

    [HttpGet("{key}/history")]
    public async Task<IActionResult> History(string key, CancellationToken ct) => this.ToActionResult(await settings.HistoryAsync(me.Actor, key, ct));

    /// <summary>Saves the next version. Send the version you were looking at as expectedVersion (0 for the first save); a stale one gets 409.</summary>
    [HttpPut("{key}")]
    public async Task<IActionResult> Put(string key, [FromBody] PutRequest body, CancellationToken ct) =>
        this.ToActionResult(await settings.PutAsync(me.Actor, key, body.Value, body.ExpectedVersion, body.Note, ct));

    [HttpPost("{key}/restore")]
    public async Task<IActionResult> Restore(string key, [FromBody] RestoreRequest body, CancellationToken ct) =>
        this.ToActionResult(await settings.RestoreAsync(me.Actor, key, body.Version, body.ExpectedVersion, ct));
}
