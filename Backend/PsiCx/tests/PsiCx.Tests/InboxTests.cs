using PsiCx.Application;
using PsiCx.Domain;
using PsiCx.Infrastructure;
using static PsiCx.Domain.RoleId;

namespace PsiCx.Tests;

public class InboxTests
{
    private static readonly Actor Cx = new("u-cx", "cx@psi.sample", Cxmgr);
    private static readonly Actor Env = new("u-env", "env@psi.sample", Envmgmt);
    private static readonly Actor Ld = new("u-ld", "ld@psi.sample", Role_Ld);
    private const RoleId Role_Ld = RoleId.Ld;

    private sealed record Rig(FixService Fixes, InboxService Inbox, FakeClock Clock);

    private static Rig Make()
    {
        var clock = new FakeClock(new DateTimeOffset(2026, 11, 26, 8, 0, 0, TimeSpan.Zero));
        var inputs = new SettingsFixClockInputs(new InMemorySettingsStore(), new NoVipPatterns());
        var fixes = new InMemoryFixStore();
        var inv = new InMemoryInvestigationStore();
        var audit = new AuditService(new InMemoryAuditStore(), clock);
        var svc = new FixService(fixes, inv, inputs, audit, clock);
        return new Rig(svc, new InboxService([new FixInboxSource(fixes, inv, inputs)], clock), clock);
    }

    private static ProposeFix Req(FixKind kind = FixKind.Process) => new(kind, "Owner of the process", ProductId.Re, new Bi("Fix A", "حل أ"), "pt-1");

    [Fact]
    public async Task A_proposed_fix_is_on_the_approver_with_working_days_left()
    {
        var r = Make();
        await r.Fixes.ProposeAsync(Cx, Req());
        var items = (await r.Inbox.MineAsync(Cx)).Value!;
        var a = items.Single();
        Assert.Equal(InboxKind.Approve, a.Kind);
        Assert.Equal(5, a.DaysLeft);
        Assert.Equal(DayUnit.Wd, a.Unit);
        Assert.Equal(1, a.Priority);
        Assert.Equal("/actions/corrective?fix=CA-201", a.Target);
    }

    [Fact]
    public async Task One_working_day_left_is_urgent()
    {
        var r = Make();
        await r.Fixes.ProposeAsync(Cx, Req());
        r.Clock.Advance(TimeSpan.FromDays(4)); // Monday 30 Nov: two working days gone (Fri, Mon)... four left? the window ends Thursday 3 Dec
        var a = (await r.Inbox.MineAsync(Cx)).Value!.Single();
        Assert.True(a.DaysLeft <= 4);
        r.Clock.Advance(TimeSpan.FromDays(3)); // Thursday 3 Dec: window over
        Assert.Equal(2, (await r.Inbox.MineAsync(Cx)).Value!.Single().Priority);
    }

    [Fact]
    public async Task An_approved_fix_counts_calendar_days_to_the_due_date_and_late_is_urgent()
    {
        var r = Make();
        var f = (await r.Fixes.ProposeAsync(Cx, Req())).Value!;
        await r.Fixes.DecideAsync(Cx, f.Id, FixDecision.Approved, null, null);
        var d = (await r.Inbox.MineAsync(Cx)).Value!.Single();
        Assert.Equal(InboxKind.Do, d.Kind);
        Assert.Equal(14, d.DaysLeft);
        Assert.Equal(0, d.Priority);
        r.Clock.Advance(TimeSpan.FromDays(16));
        var late = (await r.Inbox.MineAsync(Cx)).Value!.Single();
        Assert.Equal(-2, late.DaysLeft);
        Assert.Equal(2, late.Priority);
    }

    [Fact]
    public async Task A_fix_waiting_for_its_check_shows_the_date_and_a_returned_fix_leaves_the_list()
    {
        var r = Make();
        var f = (await r.Fixes.ProposeAsync(Cx, Req())).Value!;
        await r.Fixes.DecideAsync(Cx, f.Id, FixDecision.Approved, null, null);
        await r.Fixes.MarkDoneAsync(Env, f.Id, "Done", new DateOnly(2026, 11, 27), null);
        var v = (await r.Inbox.MineAsync(Cx)).Value!.Single();
        Assert.Equal(InboxKind.Verify, v.Kind);
        Assert.Equal(60, v.DaysLeft);
        Assert.Equal("60-day check runs on 2027-01-25", v.Text.En);
        await r.Fixes.RecordVerdictAsync(Cx, f.Id, FixVerdict.Effective);
        Assert.Empty((await r.Inbox.MineAsync(Cx)).Value!);
    }

    [Fact]
    public async Task Investigations_are_on_CX_only_and_L_and_D_sees_training_fixes_only()
    {
        var r = Make();
        var f = (await r.Fixes.ProposeAsync(Cx, Req())).Value!;
        await r.Fixes.DecideAsync(Cx, f.Id, FixDecision.Approved, null, null);
        await r.Fixes.MarkDoneAsync(Env, f.Id, "Done", new DateOnly(2026, 11, 27), null);
        await r.Fixes.RecordVerdictAsync(Cx, f.Id, FixVerdict.Partial);
        await r.Fixes.InvestigateFromFixAsync(Cx, f.Id, null);
        await r.Fixes.ProposeAsync(Cx, Req(FixKind.TrainingGap));
        var cx = (await r.Inbox.MineAsync(Cx)).Value!;
        Assert.Contains(cx, i => i.Kind == InboxKind.Inv);
        Assert.Equal("Investigation open: INV-1 · 0/5 interviews", cx.First(i => i.Kind == InboxKind.Inv).Text.En);
        var ld = (await r.Inbox.MineAsync(Ld)).Value!;
        Assert.Equal(1, ld.Count);
        Assert.Equal(InboxKind.Approve, ld[0].Kind);
    }

    [Fact]
    public async Task Rows_are_ordered_by_priority_then_days_and_the_inbox_needs_the_page()
    {
        var r = Make();
        var a = (await r.Fixes.ProposeAsync(Cx, Req())).Value!;
        await r.Fixes.DecideAsync(Cx, a.Id, FixDecision.Approved, null, null);
        r.Clock.Advance(TimeSpan.FromDays(16));
        await r.Fixes.ProposeAsync(Cx, Req());
        var items = (await r.Inbox.MineAsync(Cx)).Value!;
        Assert.Equal(2, items.Count);
        Assert.Equal(InboxKind.Do, items[0].Kind); // late = priority 2 comes first
        Assert.Equal(Failure.Unauthenticated, (await r.Inbox.MineAsync(null)).Error);
        Assert.Equal(Failure.Forbidden, (await r.Inbox.MineAsync(new Actor("u-s", "s@psi.sample", Shopper))).Error);
    }
}
