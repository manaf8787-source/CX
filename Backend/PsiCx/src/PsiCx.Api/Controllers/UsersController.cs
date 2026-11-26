using Microsoft.AspNetCore.Mvc;
using PsiCx.Application;
using PsiCx.Domain;

namespace PsiCx.Api.Controllers;

[ApiController]
[Route("api/v1/users")]
public sealed class UsersController(UserService users, ICurrentUser me) : ControllerBase
{
    public sealed record InviteRequest(string Email, string Name, RoleId RoleId, string? CustomRoleId, EnvId? EnvId);
    public sealed record RoleRequest(RoleId RoleId, string? CustomRoleId, EnvId? EnvId);
    public sealed record ExportRequest(bool On);

    private static ServiceResult<UserDto> Dto(ServiceResult<PortalUser> r) => r.IsOk ? ServiceResult<UserDto>.Ok(UserDto.From(r.Value!)) : ServiceResult<UserDto>.Fail(r.Error!.Value, r.Message!);
    private static ServiceResult<InviteDto> Dto(ServiceResult<InviteResult> r) => r.IsOk ? ServiceResult<InviteDto>.Ok(new InviteDto(UserDto.From(r.Value!.User), r.Value.Token)) : ServiceResult<InviteDto>.Fail(r.Error!.Value, r.Message!);

    [HttpGet]
    public async Task<IActionResult> List(CancellationToken ct)
    {
        var r = await users.ListAsync(me.Actor, ct);
        return this.ToActionResult(r.IsOk ? ServiceResult<IReadOnlyList<UserDto>>.Ok(r.Value!.Select(UserDto.From).ToList()) : ServiceResult<IReadOnlyList<UserDto>>.Fail(r.Error!.Value, r.Message!));
    }

    [HttpPost("invite")]
    public async Task<IActionResult> Invite([FromBody] InviteRequest b, CancellationToken ct) =>
        this.ToActionResult(Dto(await users.InviteAsync(me.Actor, b.Email ?? "", b.Name ?? "", b.RoleId, b.CustomRoleId, b.EnvId, ct)));

    [HttpPost("{id}/reinvite")]
    public async Task<IActionResult> Reinvite(string id, CancellationToken ct) => this.ToActionResult(Dto(await users.ReinviteAsync(me.Actor, id, ct)));

    [HttpPost("{id}/role")]
    public async Task<IActionResult> ChangeRole(string id, [FromBody] RoleRequest b, CancellationToken ct) =>
        this.ToActionResult(Dto(await users.ChangeRoleAsync(me.Actor, id, b.RoleId, b.CustomRoleId, b.EnvId, ct)));

    [HttpPut("{id}/export")]
    public async Task<IActionResult> SetExport(string id, [FromBody] ExportRequest b, CancellationToken ct) => this.ToActionResult(Dto(await users.SetExportAsync(me.Actor, id, b.On, ct)));

    [HttpPost("{id}/deactivate")]
    public async Task<IActionResult> Deactivate(string id, CancellationToken ct) => this.ToActionResult(Dto(await users.DeactivateAsync(me.Actor, id, ct)));

    [HttpPost("{id}/reactivate")]
    public async Task<IActionResult> Reactivate(string id, CancellationToken ct) => this.ToActionResult(Dto(await users.ReactivateAsync(me.Actor, id, ct)));

    /// <summary>Takes back an open invitation (an accepted person is deactivated, never deleted).</summary>
    [HttpDelete("{id}/invitation")]
    public async Task<IActionResult> Withdraw(string id, CancellationToken ct)
    {
        var r = await users.WithdrawInviteAsync(me.Actor, id, ct);
        return r.IsOk ? NoContent() : this.ToActionResult(r);
    }
}

[ApiController]
[Route("api/v1/invitations")]
public sealed class InvitationsController(UserService users) : ControllerBase
{
    public sealed record AcceptRequest(string Token, string? Name);

    /// <summary>The invited person opens the link. No sign-in yet: the code is the proof. Replaced by the company sign-in when it exists.</summary>
    [HttpPost("accept")]
    public async Task<IActionResult> Accept([FromBody] AcceptRequest b, CancellationToken ct)
    {
        var r = await users.AcceptInviteAsync(b.Token ?? "", b.Name, ct);
        return this.ToActionResult(r.IsOk ? ServiceResult<UserDto>.Ok(UserDto.From(r.Value!)) : ServiceResult<UserDto>.Fail(r.Error!.Value, r.Message!));
    }
}

[ApiController]
[Route("api/v1/custom-roles")]
public sealed class CustomRolesController(UserService users, ICurrentUser me) : ControllerBase
{
    public sealed record SaveRequest(string Name, Dictionary<string, ScreenAccess> Screens);

    [HttpGet]
    public async Task<IActionResult> List(CancellationToken ct) => this.ToActionResult(await users.ListCustomRolesAsync(me.Actor, ct));

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] SaveRequest b, CancellationToken ct) =>
        this.ToActionResult(await users.SaveCustomRoleAsync(me.Actor, null, b.Name ?? "", b.Screens ?? [], ct));

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(string id, [FromBody] SaveRequest b, CancellationToken ct) =>
        this.ToActionResult(await users.SaveCustomRoleAsync(me.Actor, id, b.Name ?? "", b.Screens ?? [], ct));

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id, CancellationToken ct)
    {
        var r = await users.DeleteCustomRoleAsync(me.Actor, id, ct);
        return r.IsOk ? NoContent() : this.ToActionResult(r);
    }
}
