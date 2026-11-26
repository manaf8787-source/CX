using Microsoft.AspNetCore.Mvc;
using PsiCx.Application;

namespace PsiCx.Api.Controllers;

[ApiController]
[Route("api/v1/inbox")]
public sealed class InboxController(InboxService inbox, ICurrentUser me) : ControllerBase
{
    /// <summary>Everything that is on the signed-in role, ordered by urgency, each with a day counter.</summary>
    [HttpGet]
    public async Task<IActionResult> Mine(CancellationToken ct) => this.ToActionResult(await inbox.MineAsync(me.Actor, ct));
}
