using System.Text.Json;
using PsiCx.Application;
using PsiCx.Domain;
using PsiCx.Infrastructure;
using static PsiCx.Domain.RoleId;

namespace PsiCx.Tests;

internal sealed class FakeClock(DateTimeOffset start) : IClock
{
    public DateTimeOffset Now = start;
    public DateTimeOffset UtcNow => Now;
    public void Advance(TimeSpan by) => Now += by;
}

public class AuditServiceTests
{
    private static readonly Actor Super = new("u-1", "admin@psi.test", Admin);
    private static readonly Actor Cx = new("u-2", "cx@psi.test", Cxmgr);

    private static (AuditService Svc, FakeClock Clock) Make()
    {
        var clock = new FakeClock(new DateTimeOffset(2026, 11, 26, 8, 0, 0, TimeSpan.Zero));
        return (new AuditService(new InMemoryAuditStore(), clock), clock);
    }

    private static readonly Bi D = new("Opened Home", "فتح الرئيسية");

    [Fact]
    public async Task The_same_person_event_and_page_within_two_seconds_is_one_event()
    {
        var (svc, clock) = Make();
        Assert.True(await svc.RecordAsync(Cx, AuditKind.PageOpened, D, "/home"));
        clock.Advance(TimeSpan.FromMilliseconds(1500));
        Assert.False(await svc.RecordAsync(Cx, AuditKind.PageOpened, D, "/home"));
        clock.Advance(TimeSpan.FromMilliseconds(600)); // 2.1 s after the first
        Assert.True(await svc.RecordAsync(Cx, AuditKind.PageOpened, D, "/home"));
    }

    [Fact]
    public async Task Another_person_or_page_or_kind_is_a_new_event()
    {
        var (svc, _) = Make();
        Assert.True(await svc.RecordAsync(Cx, AuditKind.PageOpened, D, "/home"));
        Assert.True(await svc.RecordAsync(Super, AuditKind.PageOpened, D, "/home"));
        Assert.True(await svc.RecordAsync(Cx, AuditKind.PageOpened, D, "/inbox"));
        Assert.True(await svc.RecordAsync(Cx, AuditKind.Action, D, "/inbox"));
    }

    [Fact]
    public async Task Only_the_super_admin_reads_the_log()
    {
        var (svc, _) = Make();
        await svc.RecordAsync(Cx, AuditKind.SignIn, new Bi("Signed in", "سجّل الدخول"), "/");
        var ok = await svc.QueryAsync(Super, new AuditQuery());
        Assert.True(ok.IsOk);
        Assert.Equal(1, ok.Value!.Total);
        foreach (var role in new[] { Cxmgr, Cxteam, Useradmin, Exec, Auditmkt })
            Assert.Equal(Failure.Forbidden, (await svc.QueryAsync(new Actor("x", "x@psi.test", role), new AuditQuery())).Error);
        Assert.Equal(Failure.Unauthenticated, (await svc.QueryAsync(null, new AuditQuery())).Error);
    }

    [Fact]
    public async Task Newest_first_with_filters_and_paging()
    {
        var (svc, clock) = Make();
        for (var i = 0; i < 5; i++)
        {
            await svc.RecordAsync(Cx, AuditKind.PageOpened, new Bi($"p{i}", $"ص{i}"), $"/p{i}");
            clock.Advance(TimeSpan.FromSeconds(5));
        }
        await svc.RecordAsync(Super, AuditKind.UserInvited, new Bi("Invited", "دعا"), "/admin/users");

        var all = (await svc.QueryAsync(Super, new AuditQuery())).Value!;
        Assert.Equal(6, all.Total);
        Assert.Equal("/admin/users", all.Items[0].Path);

        var mine = (await svc.QueryAsync(Super, new AuditQuery(UserId: "u-2", Take: 2, Skip: 1))).Value!;
        Assert.Equal(5, mine.Total);
        Assert.Equal("/p3,/p2", string.Join(",", mine.Items.Select(i => i.Path)));

        var invites = (await svc.QueryAsync(Super, new AuditQuery(Kind: AuditKind.UserInvited))).Value!;
        Assert.Equal(1, invites.Total);

        var window = (await svc.QueryAsync(Super, new AuditQuery(From: clock.Now.AddSeconds(-12), To: clock.Now.AddSeconds(-3)))).Value!;
        Assert.Equal(2, window.Total);
    }

    [Fact]
    public async Task Take_is_clamped()
    {
        var (svc, _) = Make();
        var page = (await svc.QueryAsync(Super, new AuditQuery(Take: 100000, Skip: -5))).Value!;
        Assert.Equal(0, page.Total);
    }
}

public class SettingsServiceTests
{
    private static readonly Actor Manager = new("u-2", "cx@psi.test", Cxmgr);
    private static readonly Actor Auditor = new("u-3", "audit@psi.test", Auditmkt);
    private static readonly Actor Team = new("u-4", "team@psi.test", Cxteam);
    private static readonly Actor Super = new("u-1", "admin@psi.test", Admin);

    private static JsonElement Json(string raw) => JsonDocument.Parse(raw).RootElement.Clone();

    private static (SettingsService Svc, AuditService Audit) Make()
    {
        var clock = new FakeClock(new DateTimeOffset(2026, 11, 26, 8, 0, 0, TimeSpan.Zero));
        var audit = new AuditService(new InMemoryAuditStore(), clock);
        return (new SettingsService(new InMemorySettingsStore(), audit, clock), audit);
    }

    [Fact]
    public async Task A_setting_with_no_version_yet_is_not_found_and_an_unknown_key_too()
    {
        var (svc, _) = Make();
        Assert.Equal(Failure.NotFound, (await svc.GetAsync(Manager, "rules")).Error);
        Assert.Equal(Failure.NotFound, (await svc.GetAsync(Manager, "nope")).Error);
        Assert.Equal(Failure.Unauthenticated, (await svc.GetAsync(null, "rules")).Error);
    }

    [Fact]
    public async Task Each_change_adds_the_next_version_and_history_is_newest_first()
    {
        var (svc, _) = Make();
        var v1 = await svc.PutAsync(Manager, "rules", Json("{\"approveDays\":5}"), 0, "first");
        var v2 = await svc.PutAsync(Manager, "rules", Json("{\"approveDays\":4}"), 1, null);
        Assert.Equal(1, v1.Value!.Version);
        Assert.Equal(2, v2.Value!.Version);
        Assert.Equal("{\"approveDays\":4}", (await svc.GetAsync(Auditor, "rules")).Value!.Value.GetRawText());
        var hist = (await svc.HistoryAsync(Manager, "rules")).Value!;
        Assert.Equal("2,1", string.Join(",", hist.Select(h => h.Version)));
        Assert.Equal("u-2", hist[0].ByUserId);
        Assert.Equal(Cxmgr, hist[0].ByRole);
    }

    [Fact]
    public async Task A_stale_edit_is_refused_not_merged()
    {
        var (svc, _) = Make();
        await svc.PutAsync(Manager, "rules", Json("{\"a\":1}"), 0, null);
        await svc.PutAsync(Manager, "rules", Json("{\"a\":2}"), 1, null);
        var stale = await svc.PutAsync(Manager, "rules", Json("{\"a\":3}"), 1, null);
        Assert.Equal(Failure.Conflict, stale.Error);
        Assert.Equal(2, (await svc.GetAsync(Manager, "rules")).Value!.Version);
        // a first save must say it saw nothing
        Assert.Equal(Failure.Conflict, (await svc.PutAsync(Manager, "crm_mapping", Json("{}"), 3, null)).Error);
    }

    [Fact]
    public async Task Who_may_change_which_setting_follows_the_page_permissions()
    {
        var (svc, _) = Make();
        Assert.True((await svc.PutAsync(Auditor, "crm_mapping", Json("{}"), 0, null)).IsOk);
        Assert.True((await svc.PutAsync(Auditor, "escalation_matrix", Json("{}"), 0, null)).IsOk);
        Assert.Equal(Failure.Forbidden, (await svc.PutAsync(Auditor, "rules", Json("{}"), 0, null)).Error);
        Assert.Equal(Failure.Forbidden, (await svc.PutAsync(Team, "crm_mapping", Json("{}"), 0, null)).Error);
        Assert.Equal(Failure.Forbidden, (await svc.PutAsync(Super, "rules", Json("{}"), 0, null)).Error);
        Assert.True((await svc.PutAsync(Manager, "agent_settings", Json("{}"), 0, null)).IsOk);
        Assert.True((await svc.PutAsync(Manager, "reply_library", Json("{}"), 0, null)).IsOk);
        Assert.Equal(Failure.NotFound, (await svc.PutAsync(Manager, "unknown", Json("{}"), 0, null)).Error);
    }

    [Fact]
    public async Task A_null_value_is_invalid() =>
        Assert.Equal(Failure.Invalid, (await Make().Svc.PutAsync(Manager, "rules", Json("null"), 0, null)).Error);

    [Fact]
    public async Task Restore_puts_an_old_value_back_as_a_new_version_and_keeps_history()
    {
        var (svc, _) = Make();
        await svc.PutAsync(Manager, "rules", Json("{\"a\":1}"), 0, null);
        await svc.PutAsync(Manager, "rules", Json("{\"a\":2}"), 1, null);
        var restored = await svc.RestoreAsync(Manager, "rules", 1, 2);
        Assert.Equal(3, restored.Value!.Version);
        Assert.Equal("{\"a\":1}", restored.Value.Value.GetRawText());
        Assert.Equal("Restored from version 1", restored.Value.Note);
        Assert.Equal(3, (await svc.HistoryAsync(Manager, "rules")).Value!.Count);
        Assert.Equal(Failure.NotFound, (await svc.RestoreAsync(Manager, "rules", 9, 3)).Error);
        Assert.Equal(Failure.Forbidden, (await svc.RestoreAsync(Team, "rules", 1, 3)).Error);
    }

    [Fact]
    public async Task A_change_is_written_to_the_audit_log()
    {
        var (svc, audit) = Make();
        await svc.PutAsync(Manager, "rules", Json("{\"a\":1}"), 0, null);
        var log = (await audit.QueryAsync(Super, new AuditQuery())).Value!;
        Assert.Equal(1, log.Total);
        Assert.Equal(AuditKind.Action, log.Items[0].Kind);
        Assert.Equal("Changed setting rules (version 1)", log.Items[0].Detail.En);
        Assert.Equal("u-2", log.Items[0].UserId);
        // a refused change leaves no entry
        await svc.PutAsync(Team, "rules", Json("{}"), 1, null);
        Assert.Equal(1, (await audit.QueryAsync(Super, new AuditQuery())).Value!.Total);
    }
}
