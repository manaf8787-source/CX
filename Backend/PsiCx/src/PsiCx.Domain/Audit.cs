namespace PsiCx.Domain;

/// <summary>Mirrors AuditKind in React-Frontend/src/data/auditLog.ts. Wire format: snake_case ("sign_in", "page_opened").</summary>
public enum AuditKind
{
    SignIn, SignOut, InviteAccepted, PageOpened,
    UserInvited, UserReinvited, UserRoleChanged, UserDeactivated, UserReactivated, InviteWithdrawn, UsersReset,
    ExportGranted, ExportRevoked, DataExported, Action
}

/// <summary>One line of the audit log: who did what, where and when. Written once, never edited or deleted.</summary>
public sealed record AuditEntry(string Id, DateTimeOffset At, string UserId, string Email, RoleId RoleId, AuditKind Kind, Bi Detail, string Path);

public sealed record AuditQuery(string? UserId = null, AuditKind? Kind = null, DateTimeOffset? From = null, DateTimeOffset? To = null, int Skip = 0, int Take = 100);

public sealed record AuditPage(IReadOnlyList<AuditEntry> Items, int Total);
