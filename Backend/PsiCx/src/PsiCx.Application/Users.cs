using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using PsiCx.Domain;
using PsiCx.Rules.Access;

namespace PsiCx.Application;

public interface IUserStore
{
    Task<PortalUser?> GetAsync(string id, CancellationToken ct = default);
    Task<PortalUser?> GetByEmailAsync(string email, CancellationToken ct = default);
    Task<PortalUser?> GetByTokenHashAsync(string hash, CancellationToken ct = default);
    Task<IReadOnlyList<PortalUser>> ListAsync(CancellationToken ct = default);
    /// <summary>False when the email is already taken.</summary>
    Task<bool> AddAsync(PortalUser user, CancellationToken ct = default);
    Task UpdateAsync(PortalUser user, CancellationToken ct = default);
    Task RemoveAsync(string id, CancellationToken ct = default);
}

public interface ICustomRoleStore
{
    Task<IReadOnlyList<CustomRole>> ListAsync(CancellationToken ct = default);
    Task<CustomRole?> GetAsync(string id, CancellationToken ct = default);
    Task UpsertAsync(CustomRole role, CancellationToken ct = default);
    Task RemoveAsync(string id, CancellationToken ct = default);
}

/// <summary>Invitation codes: random, shown once, stored as a hash.</summary>
public static class InviteToken
{
    private const string Alphabet = "abcdefghjkmnpqrstuvwxyz23456789";

    /// <summary>"inv-" and ten characters from an alphabet without look-alikes, like the prototype; from a cryptographic generator.</summary>
    public static string New()
    {
        var sb = new StringBuilder("inv-");
        for (var i = 0; i < 10; i++) sb.Append(Alphabet[RandomNumberGenerator.GetInt32(Alphabet.Length)]);
        return sb.ToString();
    }

    public static string Hash(string token) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token)));
}

public sealed record InviteResult(PortalUser User, string Token);

/// <summary>
/// The user directory (port of the rules in React-Frontend/src/data/users.ts and pages/admin/Users.tsx). The Super admin and the Admin run it;
/// an Admin cannot touch Admin or Super admin rows, cannot give the Admin role, and the Super admin's own role never changes.
/// </summary>
public sealed partial class UserService(IUserStore users, ICustomRoleStore customRoles, AuditService audit, IClock clock)
{
    /// <summary>The roles that can be given from the list. The Super admin is not on it; the Admin role is added for the Super admin only.</summary>
    public static readonly IReadOnlyList<RoleId> InvitableRoles =
        [RoleId.Cxmgr, RoleId.Cxteam, RoleId.Envmgmt, RoleId.Teamlead, RoleId.Aslead, RoleId.Marketing, RoleId.Auditmkt, RoleId.Ld, RoleId.Hrspec, RoleId.Hrmgr, RoleId.Exec, RoleId.Shopper];

    public const int MaxNameLength = 81; // first and last name, 40 each, and a space

    [GeneratedRegex(@"^[^\s@]+@[^\s@]+\.[^\s@]+$")]
    private static partial Regex EmailPattern();

    public static string NormaliseEmail(string email) => email.Trim().ToLowerInvariant();

    private static bool IsAdminRow(PortalUser u) => u.RoleId is RoleId.Admin or RoleId.Useradmin;

    private static ServiceResult<T> Gate<T>(Actor? actor, out Actor? ok)
    {
        ok = actor;
        if (actor is null) return ServiceResult<T>.Fail(Failure.Unauthenticated, "Sign in first.");
        if (!Permissions.CanManageUsers(actor.Role)) return ServiceResult<T>.Fail(Failure.Forbidden, "This role cannot manage users.");
        return ServiceResult<T>.Ok(default!);
    }

    /// <summary>The user list: whoever may open the Users page (the Super admin, the Admin and the CX manager read it).</summary>
    public async Task<ServiceResult<IReadOnlyList<PortalUser>>> ListAsync(Actor? actor, CancellationToken ct = default)
    {
        if (actor is null) return ServiceResult<IReadOnlyList<PortalUser>>.Fail(Failure.Unauthenticated, "Sign in first.");
        if (!PageAccess.CanOpenPage(actor.Role, PageAccess.UsersPage)) return ServiceResult<IReadOnlyList<PortalUser>>.Fail(Failure.Forbidden, "The user list is not open to this role.");
        return ServiceResult<IReadOnlyList<PortalUser>>.Ok(await users.ListAsync(ct));
    }

    /// <summary>Checks a role (and custom role, environment) may be given by this actor; returns the cleaned values.</summary>
    private async Task<ServiceResult<(string? CustomRoleId, EnvId? EnvId)>> CheckRoleAsync(Actor actor, RoleId role, string? customRoleId, EnvId? envId, CancellationToken ct)
    {
        if (role == RoleId.Admin) return ServiceResult<(string?, EnvId?)>.Fail(Failure.Forbidden, "The Super admin role cannot be given.");
        if (role == RoleId.Useradmin && !Permissions.CanManageAdmins(actor.Role)) return ServiceResult<(string?, EnvId?)>.Fail(Failure.Forbidden, "Only the Super admin gives the Admin role.");
        if (role != RoleId.Useradmin && role != RoleId.Custom && !InvitableRoles.Contains(role)) return ServiceResult<(string?, EnvId?)>.Fail(Failure.Invalid, "That role cannot be given.");
        if (role == RoleId.Custom)
        {
            var custom = customRoleId is null ? null : await customRoles.GetAsync(customRoleId, ct);
            if (custom is null) return ServiceResult<(string?, EnvId?)>.Fail(Failure.Invalid, "A custom role needs an existing custom role.");
            if (CustomRoleAccess.TouchesAdministration(custom.Screens) && !Permissions.CanManageAdmins(actor.Role))
                return ServiceResult<(string?, EnvId?)>.Fail(Failure.Forbidden, "Only the Super admin gives a role that opens administration screens.");
        }
        if (role == RoleId.Envmgmt && envId is null) return ServiceResult<(string?, EnvId?)>.Fail(Failure.Invalid, "An environment manager needs an environment.");
        return ServiceResult<(string?, EnvId?)>.Ok((role == RoleId.Custom ? customRoleId : null, role == RoleId.Envmgmt ? envId : null));
    }

    public async Task<ServiceResult<InviteResult>> InviteAsync(Actor? actor, string email, string name, RoleId role, string? customRoleId, EnvId? envId, CancellationToken ct = default)
    {
        var gate = Gate<InviteResult>(actor, out var a);
        if (!gate.IsOk) return gate;
        email = NormaliseEmail(email);
        name = name.Trim();
        if (!EmailPattern().IsMatch(email) || email.Length > 200) return ServiceResult<InviteResult>.Fail(Failure.Invalid, "That is not a valid email address.");
        if (name.Length == 0 || name.Length > MaxNameLength) return ServiceResult<InviteResult>.Fail(Failure.Invalid, "A name of one to 81 characters is needed.");
        var checkedRole = await CheckRoleAsync(a!, role, customRoleId, envId, ct);
        if (!checkedRole.IsOk) return ServiceResult<InviteResult>.Fail(checkedRole.Error!.Value, checkedRole.Message!);

        var token = InviteToken.New();
        var user = new PortalUser(Guid.NewGuid().ToString("N"), email, name, role, checkedRole.Value.CustomRoleId, checkedRole.Value.EnvId,
            UserStatus.Invited, clock.UtcNow, null, InviteToken.Hash(token), a!.UserId, false);
        if (!await users.AddAsync(user, ct)) return ServiceResult<InviteResult>.Fail(Failure.Conflict, "That email is already in the directory.");
        await audit.RecordAsync(a, AuditKind.UserInvited, new Bi($"Invited {email}", $"دعا {email}"), PageAccess.UsersPage, ct);
        return ServiceResult<InviteResult>.Ok(new InviteResult(user, token));
    }

    /// <summary>A new code for someone who has not accepted (or was deactivated): the old link stops working.</summary>
    public async Task<ServiceResult<InviteResult>> ReinviteAsync(Actor? actor, string id, CancellationToken ct = default)
    {
        var gate = Gate<InviteResult>(actor, out var a);
        if (!gate.IsOk) return gate;
        var target = await users.GetAsync(id, ct);
        if (target is null) return ServiceResult<InviteResult>.Fail(Failure.NotFound, "No such user.");
        if (IsAdminRow(target) && !Permissions.CanManageAdmins(a!.Role)) return ServiceResult<InviteResult>.Fail(Failure.Forbidden, "Admin rows are the Super admin's.");
        if (target.Status == UserStatus.Active) return ServiceResult<InviteResult>.Fail(Failure.Conflict, "An active person has no invitation to reissue.");
        var token = InviteToken.New();
        var next = target with { Status = UserStatus.Invited, InviteTokenHash = InviteToken.Hash(token), InvitedAt = clock.UtcNow };
        await users.UpdateAsync(next, ct);
        await audit.RecordAsync(a!, AuditKind.UserReinvited, new Bi($"Re-invited {target.Email}", $"أعاد دعوة {target.Email}"), PageAccess.UsersPage, ct);
        return ServiceResult<InviteResult>.Ok(new InviteResult(next, token));
    }

    /// <summary>The invited person opens the link: active from now on, the code is spent. Before sign-in exists there is no actor; the code is the proof.</summary>
    public async Task<ServiceResult<PortalUser>> AcceptInviteAsync(string token, string? name, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(token)) return ServiceResult<PortalUser>.Fail(Failure.Invalid, "An invitation code is needed.");
        var user = await users.GetByTokenHashAsync(InviteToken.Hash(token.Trim()), ct);
        if (user is null || user.Status != UserStatus.Invited) return ServiceResult<PortalUser>.Fail(Failure.NotFound, "This invitation is not valid any more.");
        var cleaned = name?.Trim();
        if (cleaned is { Length: > MaxNameLength }) return ServiceResult<PortalUser>.Fail(Failure.Invalid, "That name is too long.");
        var next = user with { Status = UserStatus.Active, ActivatedAt = clock.UtcNow, InviteTokenHash = null, Name = string.IsNullOrEmpty(cleaned) ? user.Name : cleaned };
        await users.UpdateAsync(next, ct);
        await audit.RecordAsync(new Actor(next.Id, next.Email, next.RoleId), AuditKind.InviteAccepted, new Bi("Accepted the invitation", "قبل الدعوة"), "/login", ct);
        return ServiceResult<PortalUser>.Ok(next);
    }

    public async Task<ServiceResult<PortalUser>> ChangeRoleAsync(Actor? actor, string id, RoleId role, string? customRoleId, EnvId? envId, CancellationToken ct = default)
    {
        var gate = Gate<PortalUser>(actor, out var a);
        if (!gate.IsOk) return gate;
        var target = await users.GetAsync(id, ct);
        if (target is null) return ServiceResult<PortalUser>.Fail(Failure.NotFound, "No such user.");
        if (target.Id == a!.UserId) return ServiceResult<PortalUser>.Fail(Failure.Forbidden, "Nobody changes their own role.");
        if (target.RoleId == RoleId.Admin) return ServiceResult<PortalUser>.Fail(Failure.Forbidden, "The Super admin's role does not change.");
        if (IsAdminRow(target) && !Permissions.CanManageAdmins(a.Role)) return ServiceResult<PortalUser>.Fail(Failure.Forbidden, "Admin rows are the Super admin's.");
        var checkedRole = await CheckRoleAsync(a, role, customRoleId, envId, ct);
        if (!checkedRole.IsOk) return ServiceResult<PortalUser>.Fail(checkedRole.Error!.Value, checkedRole.Message!);
        var next = target with { RoleId = role, CustomRoleId = checkedRole.Value.CustomRoleId, EnvId = checkedRole.Value.EnvId };
        await users.UpdateAsync(next, ct);
        await audit.RecordAsync(a, AuditKind.UserRoleChanged, new Bi($"Changed the role of {target.Email} to {role.ToString().ToLowerInvariant()}", $"غيّر دور {target.Email} إلى {role.ToString().ToLowerInvariant()}"), PageAccess.UsersPage, ct);
        return ServiceResult<PortalUser>.Ok(next);
    }

    /// <summary>"Export data" per person. Locked for a disabled person and for Admin rows unless the actor is the Super admin.</summary>
    public async Task<ServiceResult<PortalUser>> SetExportAsync(Actor? actor, string id, bool on, CancellationToken ct = default)
    {
        var gate = Gate<PortalUser>(actor, out var a);
        if (!gate.IsOk) return gate;
        var target = await users.GetAsync(id, ct);
        if (target is null) return ServiceResult<PortalUser>.Fail(Failure.NotFound, "No such user.");
        if (IsAdminRow(target) && !Permissions.CanManageAdmins(a!.Role)) return ServiceResult<PortalUser>.Fail(Failure.Forbidden, "Admin rows are the Super admin's.");
        if (target.Status == UserStatus.Disabled) return ServiceResult<PortalUser>.Fail(Failure.Conflict, "A deactivated person's export setting is locked.");
        if (target.CanExport == on) return ServiceResult<PortalUser>.Ok(target);
        var next = target with { CanExport = on };
        await users.UpdateAsync(next, ct);
        await audit.RecordAsync(a!, on ? AuditKind.ExportGranted : AuditKind.ExportRevoked,
            on ? new Bi($"Gave export permission to {target.Email}", $"منح صلاحية التصدير لـ {target.Email}") : new Bi($"Removed export permission from {target.Email}", $"سحب صلاحية التصدير من {target.Email}"),
            PageAccess.UsersPage, ct);
        return ServiceResult<PortalUser>.Ok(next);
    }

    public async Task<ServiceResult<PortalUser>> DeactivateAsync(Actor? actor, string id, CancellationToken ct = default)
    {
        var gate = Gate<PortalUser>(actor, out var a);
        if (!gate.IsOk) return gate;
        var target = await users.GetAsync(id, ct);
        if (target is null) return ServiceResult<PortalUser>.Fail(Failure.NotFound, "No such user.");
        if (target.Id == a!.UserId) return ServiceResult<PortalUser>.Fail(Failure.Forbidden, "Nobody deactivates themselves.");
        if (IsAdminRow(target) && !Permissions.CanManageAdmins(a.Role)) return ServiceResult<PortalUser>.Fail(Failure.Forbidden, "Admin rows are the Super admin's.");
        if (target.Status != UserStatus.Active) return ServiceResult<PortalUser>.Fail(Failure.Conflict, "Only an active person can be deactivated.");
        if (target.RoleId == RoleId.Admin)
        {
            // never lock everyone out: at least one other active Super admin must remain
            var others = (await users.ListAsync(ct)).Count(u => u.RoleId == RoleId.Admin && u.Status == UserStatus.Active && u.Id != target.Id);
            if (others == 0) return ServiceResult<PortalUser>.Fail(Failure.Conflict, "The last active Super admin cannot be deactivated.");
        }
        var next = target with { Status = UserStatus.Disabled };
        await users.UpdateAsync(next, ct);
        await audit.RecordAsync(a, AuditKind.UserDeactivated, new Bi($"Deactivated {target.Email}", $"أوقف {target.Email}"), PageAccess.UsersPage, ct);
        return ServiceResult<PortalUser>.Ok(next);
    }

    public async Task<ServiceResult<PortalUser>> ReactivateAsync(Actor? actor, string id, CancellationToken ct = default)
    {
        var gate = Gate<PortalUser>(actor, out var a);
        if (!gate.IsOk) return gate;
        var target = await users.GetAsync(id, ct);
        if (target is null) return ServiceResult<PortalUser>.Fail(Failure.NotFound, "No such user.");
        if (IsAdminRow(target) && !Permissions.CanManageAdmins(a!.Role)) return ServiceResult<PortalUser>.Fail(Failure.Forbidden, "Admin rows are the Super admin's.");
        if (target.Status != UserStatus.Disabled) return ServiceResult<PortalUser>.Fail(Failure.Conflict, "Only a deactivated person can be reactivated.");
        var next = target with { Status = UserStatus.Active };
        await users.UpdateAsync(next, ct);
        await audit.RecordAsync(a!, AuditKind.UserReactivated, new Bi($"Reactivated {target.Email}", $"أعاد تفعيل {target.Email}"), PageAccess.UsersPage, ct);
        return ServiceResult<PortalUser>.Ok(next);
    }

    /// <summary>Takes back an invitation that was never accepted. The row goes; an accepted person is never deleted, only deactivated.</summary>
    public async Task<ServiceResult<bool>> WithdrawInviteAsync(Actor? actor, string id, CancellationToken ct = default)
    {
        var gate = Gate<bool>(actor, out var a);
        if (!gate.IsOk) return gate;
        var target = await users.GetAsync(id, ct);
        if (target is null) return ServiceResult<bool>.Fail(Failure.NotFound, "No such user.");
        if (IsAdminRow(target) && !Permissions.CanManageAdmins(a!.Role)) return ServiceResult<bool>.Fail(Failure.Forbidden, "Admin rows are the Super admin's.");
        if (target.Status != UserStatus.Invited) return ServiceResult<bool>.Fail(Failure.Conflict, "Only an open invitation can be withdrawn.");
        await users.RemoveAsync(id, ct);
        await audit.RecordAsync(a!, AuditKind.InviteWithdrawn, new Bi($"Withdrew the invitation of {target.Email}", $"سحب دعوة {target.Email}"), PageAccess.UsersPage, ct);
        return ServiceResult<bool>.Ok(true);
    }

    // --- custom roles ---

    public async Task<ServiceResult<IReadOnlyList<CustomRole>>> ListCustomRolesAsync(Actor? actor, CancellationToken ct = default)
    {
        var gate = Gate<IReadOnlyList<CustomRole>>(actor, out _);
        if (!gate.IsOk) return gate;
        return ServiceResult<IReadOnlyList<CustomRole>>.Ok(await customRoles.ListAsync(ct));
    }

    /// <summary>Creates a custom role (id null) or replaces its screens. Only View and Edit are stored. Administration screens are the Super admin's to tick.</summary>
    public async Task<ServiceResult<CustomRole>> SaveCustomRoleAsync(Actor? actor, string? id, string name, IReadOnlyDictionary<string, ScreenAccess> screens, CancellationToken ct = default)
    {
        var gate = Gate<CustomRole>(actor, out var a);
        if (!gate.IsOk) return gate;
        name = name.Trim();
        if (name.Length is 0 or > 60) return ServiceResult<CustomRole>.Fail(Failure.Invalid, "A role name of one to 60 characters is needed.");
        if (screens.Count == 0) return ServiceResult<CustomRole>.Fail(Failure.Invalid, "Give the role at least one screen.");
        foreach (var (path, level) in screens)
        {
            if (!path.StartsWith('/') || path.Length > 100 || path.Contains(' ') || path.Contains("//")) return ServiceResult<CustomRole>.Fail(Failure.Invalid, $"'{path}' is not a screen path.");
            if (level == ScreenAccess.None) return ServiceResult<CustomRole>.Fail(Failure.Invalid, "List only screens with View or Edit; the rest are no access.");
        }
        if (CustomRoleAccess.TouchesAdministration(screens) && !Permissions.CanManageAdmins(a!.Role))
            return ServiceResult<CustomRole>.Fail(Failure.Forbidden, "Only the Super admin ticks administration screens.");

        CustomRole role;
        if (id is null) role = new CustomRole($"cr-{Guid.NewGuid().ToString("N")[..10]}", name, new Dictionary<string, ScreenAccess>(screens));
        else
        {
            var existing = await customRoles.GetAsync(id, ct);
            if (existing is null) return ServiceResult<CustomRole>.Fail(Failure.NotFound, "No such custom role.");
            // an Admin may not rewrite a role that already opens administration screens
            if (CustomRoleAccess.TouchesAdministration(existing.Screens) && !Permissions.CanManageAdmins(a!.Role))
                return ServiceResult<CustomRole>.Fail(Failure.Forbidden, "Only the Super admin changes a role that opens administration screens.");
            role = existing with { Name = name, Screens = new Dictionary<string, ScreenAccess>(screens) };
        }
        await customRoles.UpsertAsync(role, ct);
        await audit.RecordAsync(a!, AuditKind.UserRoleChanged, new Bi($"Saved the custom role “{name}”", $"حفظ الدور المخصص «{name}»"), PageAccess.UsersPage, ct);
        return ServiceResult<CustomRole>.Ok(role);
    }

    /// <summary>A role given to someone cannot be deleted: change their role first.</summary>
    public async Task<ServiceResult<bool>> DeleteCustomRoleAsync(Actor? actor, string id, CancellationToken ct = default)
    {
        var gate = Gate<bool>(actor, out var a);
        if (!gate.IsOk) return gate;
        var role = await customRoles.GetAsync(id, ct);
        if (role is null) return ServiceResult<bool>.Fail(Failure.NotFound, "No such custom role.");
        if (CustomRoleAccess.TouchesAdministration(role.Screens) && !Permissions.CanManageAdmins(a!.Role))
            return ServiceResult<bool>.Fail(Failure.Forbidden, "Only the Super admin deletes a role that opens administration screens.");
        if ((await users.ListAsync(ct)).Any(u => u.CustomRoleId == id)) return ServiceResult<bool>.Fail(Failure.Conflict, "This role is given to someone: change their role first.");
        await customRoles.RemoveAsync(id, ct);
        await audit.RecordAsync(a!, AuditKind.UserRoleChanged, new Bi($"Deleted the custom role “{role.Name}”", $"حذف الدور المخصص «{role.Name}»"), PageAccess.UsersPage, ct);
        return ServiceResult<bool>.Ok(true);
    }
}
