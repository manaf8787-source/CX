namespace PsiCx.Domain;

public enum UserStatus { Invited, Active, Disabled }

/// <summary>
/// One person in the directory (React-Frontend/src/data/users.ts). The invitation code is never stored: only its hash, and the code itself is shown once,
/// to the person who sent the invitation.
/// </summary>
public sealed record PortalUser(
    string Id,
    string Email,
    string Name,
    RoleId RoleId,
    string? CustomRoleId,
    EnvId? EnvId,
    UserStatus Status,
    DateTimeOffset InvitedAt,
    DateTimeOffset? ActivatedAt,
    string? InviteTokenHash,
    string? InvitedBy,
    /// <summary>"Export data" is a privilege of its own, given per person (26 Nov), never by role. Off by default.</summary>
    bool CanExport);

/// <summary>A role the super admin builds screen by screen. Only View and Edit are stored; a screen not listed is "No access".</summary>
public sealed record CustomRole(string Id, string Name, IReadOnlyDictionary<string, ScreenAccess> Screens);
