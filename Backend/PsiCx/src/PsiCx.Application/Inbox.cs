using PsiCx.Domain;
using PsiCx.Rules;
using PsiCx.Rules.Access;

namespace PsiCx.Application;

/// <summary>A module that puts rows into My inbox (fixes, investigations now; close-the-loop calls, mentions, gifts, sample later).</summary>
public interface IInboxSource
{
    Task<IReadOnlyList<InboxItem>> ItemsAsync(Actor actor, DateTimeOffset now, CancellationToken ct = default);
}

public sealed class InboxService(IEnumerable<IInboxSource> sources, IClock clock)
{
    public async Task<ServiceResult<IReadOnlyList<InboxItem>>> MineAsync(Actor? actor, CancellationToken ct = default)
    {
        if (actor is null) return ServiceResult<IReadOnlyList<InboxItem>>.Fail(Failure.Unauthenticated, "Sign in first.");
        if (!PageAccess.CanOpenPage(actor.Role, "/inbox")) return ServiceResult<IReadOnlyList<InboxItem>>.Fail(Failure.Forbidden, "My inbox is not open to this role.");
        var all = new List<InboxItem>();
        foreach (var s in sources) all.AddRange(await s.ItemsAsync(actor, clock.UtcNow, ct));
        // Higher priority first, then fewest days left, items without a date last, then id.
        return ServiceResult<IReadOnlyList<InboxItem>>.Ok(all
            .OrderByDescending(i => i.Priority).ThenBy(i => i.DaysLeft ?? int.MaxValue).ThenBy(i => i.Id, StringComparer.Ordinal).ToList());
    }

    /// <summary>The numbers of the "Your work today" hint: items on the role, and how many are urgent (priority 1 or more).</summary>
    public static (int Total, int Urgent) Stats(IReadOnlyList<InboxItem> items) => (items.Count, items.Count(i => i.Priority >= 1));
}

/// <summary>Fixes to approve, do and verify, and open investigations. Port of the fix part of utils/inbox.ts.</summary>
public sealed class FixInboxSource(IFixStore fixes, IInvestigationStore investigations, IFixClockInputs inputs, IPatternDirectory? patterns = null) : IInboxSource
{
    private static string Clip(string s, int n) => s.Length > n ? s[..(n - 1)] + "…" : s;

    public async Task<IReadOnlyList<InboxItem>> ItemsAsync(Actor actor, DateTimeOffset now, CancellationToken ct = default)
    {
        var items = new List<InboxItem>();
        var rules = await inputs.RulesAsync(ct);
        var today = UaeTime.ToWall(now).Date;

        if (PageAccess.CanOpenPage(actor.Role, "/actions"))
        {
            foreach (var f in await fixes.ListAsync(ct))
            {
                // L&D sees only the training-gap kind (KB section 15); environment management only its own environment.
                if (actor.Role == RoleId.Ld && f.Kind != FixKind.TrainingGap) continue;
                if (actor.Role == RoleId.Envmgmt && actor.Env is { } env && !await InEnvAsync(f, env, ct)) continue;
                var owner = new Bi(f.Owner, f.Owner);
                var target = $"/actions/corrective?fix={FixService.Trace(f.Id)}";
                switch (f.Status)
                {
                    case FixStatus.Proposed when f.Decision is null:
                        var left = FixClock.ApprovalDaysLeft(UaeTime.ToWall(f.ProposedAt), today, rules);
                        items.Add(new InboxItem($"approve:{f.Id}", InboxKind.Approve,
                            new Bi($"Approve, change, reject or investigate: {Clip(f.Title.En, 80)}", $"اعتمد أو عدّل أو ارفض أو حقّق: {Clip(f.Title.Ar, 80)}"),
                            left, DayUnit.Wd, owner, left <= 1 ? 2 : 1, target));
                        break;
                    case FixStatus.Approved or FixStatus.InProgress:
                        var d = (UaeTime.ToWall(f.DueAt).Date - today).Days;
                        items.Add(new InboxItem($"do:{f.Id}", InboxKind.Do,
                            new Bi($"Do the fix and mark it done: {f.Title.En}", $"نفّذ الحل وعلّمه منجزاً: {f.Title.Ar}"),
                            d, DayUnit.D, owner, d < 0 ? 2 : d <= 3 ? 1 : 0, target));
                        break;
                    case FixStatus.Verification:
                        var day = UaeTime.ToWall(f.VerificationDueAt).ToString("yyyy-MM-dd");
                        items.Add(new InboxItem($"verify:{f.Id}", InboxKind.Verify,
                            new Bi($"{rules.VerifyDays}-day check runs on {day}", $"فحص الـ{rules.VerifyDays} يوماً يجري في {day}"),
                            (UaeTime.ToWall(f.VerificationDueAt).Date - today).Days, DayUnit.D, new Bi("Agent 6", "الوكيل 6"), 0, target));
                        break;
                }
            }
        }

        if (actor.Role is RoleId.Cxmgr or RoleId.Cxteam && PageAccess.CanOpenPage(actor.Role, "/actions"))
        {
            foreach (var inv in await investigations.ListAsync(ct))
            {
                if (inv.Status == InvestigationStatus.Returned) continue;
                var n = inv.Id.Split('-').Last();
                var interviews = inv.Kind == InvestigationKind.CustomerInterviews;
                items.Add(new InboxItem($"inv:{inv.Id}", InboxKind.Inv,
                    interviews
                        ? new Bi($"Investigation open: INV-{n} · {inv.DoneCount}/{inv.RequestedCount ?? 0} interviews", $"تحقيق مفتوح: INV-{n} · {inv.DoneCount}/{inv.RequestedCount ?? 0} مقابلات")
                        : new Bi($"Investigation open: INV-{n} · shopper check", $"تحقيق مفتوح: INV-{n} · فحص متسوق"),
                    null, DayUnit.D, new Bi("Agent 8", "الوكيل 8"), 0, $"/actions/investigations?inv=INV-{n}"));
            }
        }
        return items;
    }

    private async Task<bool> InEnvAsync(CorrectiveAction f, EnvId env, CancellationToken ct)
    {
        if (f.PatternId is not null && patterns is not null && await patterns.FindPatternAsync(f.PatternId, ct) is { } p)
            return (await patterns.SignalsOfAsync(p, ct)).Any(s => s.EnvId == env);
        return f.EnvId is null || f.EnvId == env;
    }
}
