using System.Text.Json;
using PsiCx.Application;
using PsiCx.Domain;
using PsiCx.Infrastructure;
using static PsiCx.Domain.RoleId;

namespace PsiCx.Tests;

public class FixServiceTests
{
    private static readonly Actor Cx = new("u-cx", "cx@psi.sample", Cxmgr);
    private static readonly Actor Team = new("u-team", "team@psi.sample", Cxteam);
    private static readonly Actor Env = new("u-env", "env@psi.sample", Envmgmt);
    private static readonly Actor Chief = new("u-exec", "exec@psi.sample", Exec);

    private sealed record Rig(FixService Svc, FakeClock Clock, ISettingsStore Settings, IInvestigationStore Inv, IAuditStore Audit);

    // 26 Nov 2026 is a Thursday; 08:00 UTC is noon in the UAE.
    private static Rig Make()
    {
        var clock = new FakeClock(new DateTimeOffset(2026, 11, 26, 8, 0, 0, TimeSpan.Zero));
        var settings = new InMemorySettingsStore();
        var auditStore = new InMemoryAuditStore();
        var audit = new AuditService(auditStore, clock);
        var inv = new InMemoryInvestigationStore();
        var inputs = new SettingsFixClockInputs(settings, new NoVipPatterns());
        return new Rig(new FixService(new InMemoryFixStore(), inv, inputs, audit, clock), clock, settings, inv, auditStore);
    }

    private static ProposeFix Req(string owner = "Sales team lead") =>
        new(FixKind.ServiceBehaviour, owner, ProductId.Re, new Bi("Slow first reply", "بطء الرد الأول"), "pt-1");

    private static async Task<CorrectiveAction> Proposed(Rig r) => (await r.Svc.ProposeAsync(Cx, Req())).Value!;

    private static async Task<CorrectiveAction> Done(Rig r)
    {
        var f = await Proposed(r);
        await r.Svc.DecideAsync(Cx, f.Id, FixDecision.Approved, null, null);
        return (await r.Svc.MarkDoneAsync(Env, f.Id, "Briefed the team", new DateOnly(2026, 11, 27), null)).Value!;
    }

    [Fact]
    public async Task Proposing_needs_a_signed_in_person_who_may_act_and_a_receiver_that_is_not_top_management()
    {
        var r = Make();
        Assert.Equal(Failure.Unauthenticated, (await r.Svc.ProposeAsync(null, Req())).Error);
        Assert.Equal(Failure.Forbidden, (await r.Svc.ProposeAsync(Chief, Req())).Error);
        Assert.Equal(Failure.Invalid, (await r.Svc.ProposeAsync(Cx, Req("Head of Sales"))).Error);
        Assert.Equal(Failure.Invalid, (await r.Svc.ProposeAsync(Cx, Req("  "))).Error);
        var ok = await r.Svc.ProposeAsync(Cx, Req());
        Assert.True(ok.IsOk);
        Assert.Equal("ca-1", ok.Value!.Id);
        Assert.Equal(FixStatus.Proposed, ok.Value.Status);
    }

    [Fact]
    public async Task With_no_matrix_cell_the_due_date_is_fourteen_days_and_says_so()
    {
        var r = Make();
        var f = await Proposed(r);
        Assert.Equal(FixDueSource.Fallback, f.DueSource);
        Assert.Equal(f.ProposedAt.AddDays(14), f.DueAt);
    }

    [Fact]
    public async Task A_matrix_cell_gives_working_hours_from_approval()
    {
        var r = Make();
        var json = JsonDocument.Parse("{\"re\":[{\"kind\":\"service\",\"cells\":{\"resolveH\":9}}]}").RootElement.Clone();
        await r.Settings.TryAppendAsync(new SettingVersion(SettingKeys.EscalationMatrix, 1, json, r.Clock.UtcNow, "u-cx", Cxmgr, null));
        var f = await Proposed(r);
        Assert.Equal(FixDueSource.Matrix, f.DueSource);
        // Thursday 12:00 UAE plus nine working hours (09:00 to 18:00): Friday 12:00 UAE, 08:00 UTC.
        Assert.Equal(new DateTimeOffset(2026, 11, 27, 8, 0, 0, TimeSpan.Zero), f.DueAt);
    }

    [Fact]
    public async Task The_approval_window_is_five_working_days_and_counts_down()
    {
        var r = Make();
        var f = await Proposed(r);
        var listed = (await r.Svc.ListAsync(Cx, null)).Value!;
        Assert.Equal(5, listed[0].ApprovalDaysLeft);
        r.Clock.Advance(TimeSpan.FromDays(10));
        Assert.True((await r.Svc.GetAsync(Cx, f.Id)).Value!.ApprovalDaysLeft < 0);
    }

    [Fact]
    public async Task Approving_starts_the_due_clock_and_writes_a_trail()
    {
        var r = Make();
        var f = await Proposed(r);
        r.Clock.Advance(TimeSpan.FromDays(2));
        var a = (await r.Svc.DecideAsync(Env, f.Id, FixDecision.Approved, null, null)).Value!;
        Assert.Equal(FixStatus.Approved, a.Status);
        Assert.Equal(r.Clock.UtcNow, a.ApprovedAt);
        Assert.Equal(a.ApprovedAt!.Value.AddDays(14), a.DueAt);
        Assert.Equal(2, a.AuditLog.Count);
        Assert.Equal("envmgmt", a.AuditLog[1].ByRole);
        Assert.Equal(1, (await r.Audit.QueryAsync(new AuditQuery(Kind: AuditKind.Action, Take: 50))).Items.Count(e => e.Detail.En.StartsWith("Approved")));
    }

    [Fact]
    public async Task Rejecting_or_modifying_needs_a_reason_and_a_rejected_fix_stays_rejected()
    {
        var r = Make();
        var f = await Proposed(r);
        Assert.Equal(Failure.Invalid, (await r.Svc.DecideAsync(Cx, f.Id, FixDecision.Rejected, " ", null)).Error);
        var m = (await r.Svc.DecideAsync(Cx, f.Id, FixDecision.Modified, "Owner is the wrong team", "Team lead")).Value!;
        Assert.Equal(FixStatus.Proposed, m.Status);
        Assert.Equal("Team lead", m.Owner);
        Assert.Equal(Failure.Invalid, (await r.Svc.DecideAsync(Cx, f.Id, FixDecision.Modified, "Bad", "Chief of Staff")).Error);
        var rej = (await r.Svc.DecideAsync(Cx, f.Id, FixDecision.Rejected, "Not a real pattern", null)).Value!;
        Assert.Equal(FixDecision.Rejected, rej.Decision);
        Assert.Equal(Failure.Conflict, (await r.Svc.DecideAsync(Cx, f.Id, FixDecision.Approved, null, null)).Error);
    }

    [Fact]
    public async Task Only_an_approved_fix_is_started_or_done_and_done_needs_what_was_done()
    {
        var r = Make();
        var f = await Proposed(r);
        Assert.Equal(Failure.Conflict, (await r.Svc.StartAsync(Env, f.Id)).Error);
        Assert.Equal(Failure.Conflict, (await r.Svc.MarkDoneAsync(Env, f.Id, "x", new DateOnly(2026, 11, 27), null)).Error);
        await r.Svc.DecideAsync(Cx, f.Id, FixDecision.Approved, null, null);
        Assert.Equal(Failure.Invalid, (await r.Svc.MarkDoneAsync(Env, f.Id, " ", new DateOnly(2026, 11, 27), null)).Error);
        Assert.Equal(FixStatus.InProgress, (await r.Svc.StartAsync(Env, f.Id)).Value!.Status);
        Assert.Equal(Failure.Conflict, (await r.Svc.StartAsync(Env, f.Id)).Error);
    }

    [Fact]
    public async Task Done_starts_the_sixty_day_check_from_done()
    {
        var r = Make();
        var f = await Proposed(r);
        await r.Svc.DecideAsync(Cx, f.Id, FixDecision.Approved, null, null);
        r.Clock.Advance(TimeSpan.FromDays(3));
        var d = (await r.Svc.MarkDoneAsync(Env, f.Id, "Briefed the team", new DateOnly(2026, 11, 29), "photo.png")).Value!;
        Assert.Equal(FixStatus.Verification, d.Status);
        Assert.Equal(r.Clock.UtcNow.AddDays(60), d.VerificationDueAt);
        Assert.Equal("Briefed the team", d.Completion!.Note);
        Assert.Equal("envmgmt", d.Completion.ByRole);
        Assert.Contains(d.AuditLog, l => l.What.En == "What was done: Briefed the team");
    }

    [Fact]
    public async Task The_receiver_never_closes_the_check_only_CX_does()
    {
        var r = Make();
        var f = await Done(r);
        Assert.Equal(Failure.Forbidden, (await r.Svc.RecordVerdictAsync(Env, f.Id, FixVerdict.Effective)).Error);
        var v = (await r.Svc.RecordVerdictAsync(Team, f.Id, FixVerdict.Effective)).Value!;
        Assert.Equal(FixStatus.Effective, v.Status);
        Assert.Equal(FixVerdict.Effective, v.VerificationResult);
        Assert.Equal(Failure.Conflict, (await r.Svc.RecordVerdictAsync(Cx, f.Id, FixVerdict.Failed)).Error);
    }

    [Fact]
    public async Task A_partial_verdict_asks_for_a_second_step_that_is_a_new_fix_with_a_parent()
    {
        var r = Make();
        var f = await Done(r);
        Assert.Equal(Failure.Conflict, (await r.Svc.RequestSecondStepAsync(Cx, f.Id)).Error);
        await r.Svc.RecordVerdictAsync(Cx, f.Id, FixVerdict.Partial);
        Assert.Equal(Failure.Forbidden, (await r.Svc.RequestSecondStepAsync(Env, f.Id)).Error);
        var child = (await r.Svc.RequestSecondStepAsync(Cx, f.Id)).Value!;
        Assert.Equal(f.Id, child.ParentFixId);
        Assert.Equal(FixVerdict.Partial, child.ParentOutcome);
        Assert.Equal(FixStatus.Proposed, child.Status);
        Assert.Equal("Second step on CA-201: Slow first reply", child.Title.En);
        Assert.Equal(f.Owner, child.Owner);
        Assert.Equal("pt-1", child.PatternId);
        Assert.Equal("CX manager, after a partial result", child.ProposedBy!.En);
        var parent = (await r.Svc.GetAsync(Cx, f.Id)).Value!;
        Assert.Equal(FixStatus.Partial, parent.Status);
        Assert.Contains(parent.AuditLog, l => l.What.En == "Second step requested: CA-202");
        Assert.Equal(Failure.Conflict, (await r.Svc.RequestSecondStepAsync(Cx, f.Id)).Error);
    }

    [Fact]
    public async Task A_rejected_second_step_can_be_asked_again()
    {
        var r = Make();
        var f = await Done(r);
        await r.Svc.RecordVerdictAsync(Cx, f.Id, FixVerdict.Failed);
        var child = (await r.Svc.RequestSecondStepAsync(Cx, f.Id)).Value!;
        await r.Svc.DecideAsync(Cx, child.Id, FixDecision.Rejected, "Wrong approach", null);
        Assert.True((await r.Svc.RequestSecondStepAsync(Cx, f.Id)).IsOk);
    }

    [Fact]
    public async Task Investigating_first_opens_five_interviews_on_the_pattern()
    {
        var r = Make();
        var f = await Done(r);
        Assert.Equal(Failure.Conflict, (await r.Svc.InvestigateFromFixAsync(Cx, f.Id, "dub")).Error);
        await r.Svc.RecordVerdictAsync(Cx, f.Id, FixVerdict.Partial);
        var inv = (await r.Svc.InvestigateFromFixAsync(Cx, f.Id, "dub")).Value!;
        Assert.Equal("pt-1", inv.PatternId);
        Assert.Equal(InvestigationKind.CustomerInterviews, inv.Kind);
        Assert.Equal(5, inv.RequestedCount);
        Assert.Equal(InvestigationStatus.InProgress, inv.Status);
        Assert.Equal("Requested from CA-201 after a partial result.", inv.Note!.En);
        var fix = (await r.Svc.GetAsync(Cx, f.Id)).Value!;
        Assert.Equal(inv.Id, fix.InvestigationId);
        Assert.Contains(fix.AuditLog, l => l.What.En == "Investigation requested: 5 interviews (INV-1)");
        Assert.Single((await r.Svc.InvestigationsAsync(Cx)).Value!);
    }

    [Fact]
    public async Task A_fix_without_a_pattern_cannot_open_an_investigation()
    {
        var r = Make();
        var f = (await r.Svc.ProposeAsync(Cx, Req() with { PatternId = null })).Value!;
        await r.Svc.DecideAsync(Cx, f.Id, FixDecision.Approved, null, null);
        await r.Svc.MarkDoneAsync(Env, f.Id, "Done", new DateOnly(2026, 11, 27), null);
        await r.Svc.RecordVerdictAsync(Cx, f.Id, FixVerdict.Failed);
        Assert.Equal(Failure.Invalid, (await r.Svc.InvestigateFromFixAsync(Cx, f.Id, null)).Error);
    }

    [Fact]
    public async Task Accepting_as_is_closes_a_failed_fix_as_effective()
    {
        var r = Make();
        var f = await Done(r);
        Assert.Equal(Failure.Conflict, (await r.Svc.AcceptAsIsAsync(Cx, f.Id)).Error);
        await r.Svc.RecordVerdictAsync(Cx, f.Id, FixVerdict.Failed);
        var a = (await r.Svc.AcceptAsIsAsync(Cx, f.Id)).Value!;
        Assert.Equal(FixStatus.Effective, a.Status);
        Assert.Equal(FixVerdict.Effective, a.VerificationResult);
        Assert.Contains(a.AuditLog, l => l.What.En == "Accepted as is after a failed result");
    }

    [Fact]
    public async Task Sending_to_investigation_before_a_decision_only_flags_the_fix()
    {
        var r = Make();
        var f = await Proposed(r);
        var s = (await r.Svc.SendToInvestigationAsync(Cx, f.Id)).Value!;
        Assert.True(s.SentToInvestigation);
        Assert.Equal(FixStatus.Proposed, s.Status);
        Assert.Null(s.Decision);
    }

    [Fact]
    public async Task Employee_fixes_stay_with_CX_and_line_management()
    {
        var r = Make();
        var emp = Req() with { Kind = FixKind.Employee };
        Assert.Equal(Failure.Forbidden, (await r.Svc.ProposeAsync(new Actor("u-ld", "ld@psi.sample", Ld), emp)).Error);
        Assert.True((await r.Svc.ProposeAsync(Cx, emp)).IsOk);
    }

    [Fact]
    public async Task Missing_ids_are_not_found_and_the_list_needs_the_page()
    {
        var r = Make();
        Assert.Equal(Failure.NotFound, (await r.Svc.DecideAsync(Cx, "ca-99", FixDecision.Approved, null, null)).Error);
        Assert.Equal(Failure.Unauthenticated, (await r.Svc.ListAsync(null, null)).Error);
        Assert.Equal(Failure.Forbidden, (await r.Svc.ListAsync(new Actor("u-s", "s@psi.sample", Shopper), null)).Error);
    }
}
