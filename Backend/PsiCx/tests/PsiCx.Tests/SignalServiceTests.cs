using PsiCx.Application;
using PsiCx.Domain;
using PsiCx.Infrastructure;
using static PsiCx.Domain.RoleId;

namespace PsiCx.Tests;

public class SignalServiceTests
{
    private static readonly Actor Cx = new("u-cx", "cx@psi.sample", Cxmgr);
    private static readonly Actor EnvDubai = new("u-env", "env@psi.sample", Envmgmt, EnvId.Dub);
    private static readonly Actor EnvNone = new("u-env2", "env2@psi.sample", Envmgmt);

    private sealed record Rig(SignalService Signals, FixService Fixes, FakeClock Clock);

    private static Rig Make()
    {
        var clock = new FakeClock(new DateTimeOffset(2026, 11, 26, 8, 0, 0, TimeSpan.Zero));
        var inputs = new SettingsFixClockInputs(new InMemorySettingsStore(), new NoVipPatterns());
        var signals = new SignalService(new InMemorySignalStore(), inputs, clock);
        var audit = new AuditService(new InMemoryAuditStore(), clock);
        return new Rig(signals, new FixService(new InMemoryFixStore(), new InMemoryInvestigationStore(), inputs, audit, clock, signals), clock);
    }

    private static Signal Sig(string id, string category, EnvId env, DateTimeOffset at, string? agent = null) =>
        new(id, SignalKind.Complaint, ProductId.Re, env == EnvId.Dub ? "Dubai" : "Abu Dhabi", env, category, at, false, null, agent);

    private static async Task Five(Rig r, string category, EnvId env, string prefix)
    {
        for (var i = 0; i < 5; i++) await r.Signals.IngestAsync(Cx, Sig($"{prefix}{i}", category, env, r.Clock.UtcNow.AddDays(-i)));
    }

    [Fact]
    public async Task Only_CX_adds_a_signal_and_the_same_event_is_never_counted_twice()
    {
        var r = Make();
        var s = Sig("sg-1", "slow_reply", EnvId.Dub, r.Clock.UtcNow.AddDays(-1));
        Assert.Equal(Failure.Unauthenticated, (await r.Signals.IngestAsync(null, s)).Error);
        Assert.Equal(Failure.Forbidden, (await r.Signals.IngestAsync(EnvDubai, s)).Error);
        Assert.True((await r.Signals.IngestAsync(Cx, s)).IsOk);
        Assert.Equal(Failure.Conflict, (await r.Signals.IngestAsync(Cx, s)).Error);
    }

    [Fact]
    public async Task A_signal_is_checked_for_shape()
    {
        var r = Make();
        var now = r.Clock.UtcNow;
        Assert.Equal(Failure.Invalid, (await r.Signals.IngestAsync(Cx, Sig("", "x", EnvId.Dub, now))).Error);
        Assert.Equal(Failure.Invalid, (await r.Signals.IngestAsync(Cx, Sig("a", " ", EnvId.Dub, now))).Error);
        Assert.Equal(Failure.Invalid, (await r.Signals.IngestAsync(Cx, Sig("b", "x", EnvId.Dub, now.AddDays(2)))).Error);
        Assert.Equal(Failure.Invalid, (await r.Signals.IngestAsync(Cx, Sig("c", "x", EnvId.Dub, now) with { IsPublic = true, PersonId = "p-1" })).Error);
    }

    [Fact]
    public async Task Five_of_the_same_issue_make_one_pattern_with_a_PT_id()
    {
        var r = Make();
        await Five(r, "slow_reply", EnvId.Dub, "a");
        var p = (await r.Signals.PatternsAsync(Cx, null)).Value!;
        Assert.Contains(p, x => x.Id == "same_issue:slow_reply");
        Assert.True(p.All(x => x.TraceId.StartsWith("PT-")));
    }

    [Fact]
    public async Task Signals_older_than_the_window_do_not_count()
    {
        var r = Make();
        for (var i = 0; i < 5; i++) await r.Signals.IngestAsync(Cx, Sig($"o{i}", "old_issue", EnvId.Dub, r.Clock.UtcNow.AddDays(-40 - i)));
        Assert.Empty((await r.Signals.PatternsAsync(Cx, null)).Value!);
    }

    [Fact]
    public async Task The_environment_switch_narrows_and_a_fixed_role_cannot_widen_it()
    {
        var r = Make();
        await Five(r, "slow_reply", EnvId.Dub, "d");
        await Five(r, "late_callback", EnvId.Auh, "h");
        Assert.Equal(10, (await r.Signals.ListAsync(Cx, null, null)).Value!.Count);
        Assert.Equal(5, (await r.Signals.ListAsync(Cx, EnvId.Auh, null)).Value!.Count);
        // The environment manager of Dubai asks for Abu Dhabi and still gets Dubai.
        var mine = (await r.Signals.ListAsync(EnvDubai, EnvId.Auh, null)).Value!;
        Assert.Equal(5, mine.Count);
        Assert.True(mine.All(s => s.EnvId == EnvId.Dub));
        var pats = (await r.Signals.PatternsAsync(EnvDubai, EnvId.Auh)).Value!;
        Assert.Equal(1, pats.Count(x => x.Id == "same_issue:slow_reply"));
        Assert.Equal(0, pats.Count(x => x.Id == "same_issue:late_callback"));
        Assert.Equal(Failure.Forbidden, (await r.Signals.ListAsync(EnvNone, null, null)).Error);
    }

    [Fact]
    public async Task A_fix_must_hang_on_a_pattern_that_exists_and_follows_its_environment()
    {
        var r = Make();
        await Five(r, "slow_reply", EnvId.Dub, "d");
        await Five(r, "late_callback", EnvId.Auh, "h");
        var bad = new ProposeFix(FixKind.Process, "Sales team lead", ProductId.Re, new Bi("x", "س"), "same_issue:nothing");
        Assert.Equal(Failure.Invalid, (await r.Fixes.ProposeAsync(Cx, bad)).Error);
        var dub = (await r.Fixes.ProposeAsync(Cx, bad with { PatternId = "same_issue:slow_reply" })).Value!;
        var auh = (await r.Fixes.ProposeAsync(Cx, bad with { PatternId = "same_issue:late_callback" })).Value!;
        Assert.Equal(2, (await r.Fixes.ListAsync(Cx, null)).Value!.Count);
        var mine = (await r.Fixes.ListAsync(EnvDubai, EnvId.Auh)).Value!;
        Assert.Equal(dub.Id, mine.Single().Id);
        Assert.Equal(auh.Id, (await r.Fixes.ListAsync(Cx, EnvId.Auh)).Value!.Single().Id);
    }
}
