using PsiCx.Domain;
using PsiCx.Rules.Access;

namespace PsiCx.Application;

/// <summary>Storage of the audit log. There is no update, no delete and no clear: a real log is never edited.</summary>
public interface IAuditStore
{
    Task AppendAsync(AuditEntry entry, CancellationToken ct = default);
    /// <summary>The newest entry of one person, for the double-event check.</summary>
    Task<AuditEntry?> LastByUserAsync(string userId, CancellationToken ct = default);
    Task<AuditPage> QueryAsync(AuditQuery query, CancellationToken ct = default);
}

public sealed class AuditService(IAuditStore store, IClock clock)
{
    /// <summary>The same person, event and page within two seconds is one event (a double click, a re-render): same rule as the prototype, per person.</summary>
    public static readonly TimeSpan DuplicateWindow = TimeSpan.FromSeconds(2);

    public const int MaxTake = 500;

    /// <summary>Appends one entry. Returns false when it was skipped as a duplicate.</summary>
    public async Task<bool> RecordAsync(Actor actor, AuditKind kind, Bi detail, string path, CancellationToken ct = default)
    {
        var now = clock.UtcNow;
        var last = await store.LastByUserAsync(actor.UserId, ct);
        if (last is not null && last.Kind == kind && last.Path == path && last.Detail.En == detail.En && now - last.At < DuplicateWindow)
            return false;
        await store.AppendAsync(new AuditEntry(Guid.NewGuid().ToString("N"), now, actor.UserId, actor.Email, actor.Role, kind, detail, path), ct);
        return true;
    }

    /// <summary>The super admin's audit log page: only a role that may open /admin/audit reads it.</summary>
    public async Task<ServiceResult<AuditPage>> QueryAsync(Actor? actor, AuditQuery query, CancellationToken ct = default)
    {
        if (actor is null) return ServiceResult<AuditPage>.Fail(Failure.Unauthenticated, "Sign in first.");
        if (!PageAccess.CanOpenPage(actor.Role, PageAccess.AuditPage)) return ServiceResult<AuditPage>.Fail(Failure.Forbidden, "The audit log is not open to this role.");
        var q = query with { Skip = Math.Max(0, query.Skip), Take = Math.Clamp(query.Take, 1, MaxTake) };
        return ServiceResult<AuditPage>.Ok(await store.QueryAsync(q, ct));
    }
}
