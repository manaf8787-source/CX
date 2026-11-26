using PsiCx.Domain;

namespace PsiCx.Api;

/// <summary>A person as the API shows them. Never carries the invitation hash.</summary>
public sealed record UserDto(string Id, string Email, string Name, RoleId RoleId, string? CustomRoleId, EnvId? EnvId, UserStatus Status,
    DateTimeOffset InvitedAt, DateTimeOffset? ActivatedAt, string? InvitedBy, bool CanExport)
{
    public static UserDto From(PortalUser u) => new(u.Id, u.Email, u.Name, u.RoleId, u.CustomRoleId, u.EnvId, u.Status, u.InvitedAt, u.ActivatedAt, u.InvitedBy, u.CanExport);
}

/// <summary>The answer to an invitation: the person and the code, shown once. The link is built by the client (it knows its own address).</summary>
public sealed record InviteDto(UserDto User, string InviteToken);
