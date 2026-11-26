using System.Text.Json;
using PsiCx.Application;
using PsiCx.Domain;
using PsiCx.Infrastructure;
using PsiCx.Rules;
using static PsiCx.Domain.RoleId;

namespace PsiCx.Tests;

public class AiCallSumsTests
{
    private static readonly DateOnly D = new(2026, 11, 25);
    private static AiCallDailyRow Row(string outcome, int calls, int contacts = 0, EnvId env = EnvId.Auh, string campaign = "Saadiyat Lagoons", decimal cost = 1m, DateOnly? date = null)
        => new(date ?? D, env, campaign, outcome, contacts == 0 ? calls : contacts, calls, cost);
    private static readonly IReadOnlySet<CallResult> Survey = new HashSet<CallResult> { CallResult.Appointment, CallResult.FollowUp, CallResult.Successful };
    private static AiCallFilter F(EnvId? env = null, string? campaign = null, DateOnly? from = null) => new(from ?? new DateOnly(2026, 1, 1), env is null ? EnvScope.All : EnvScope.Of(env.Value), campaign);

    private static readonly AiCallDailyRow[] Rows =
    [
        Row("No Answer", 100), Row("Voicemail", 10), Row("Dropped Calls", 20), Row("Not Interested", 30), Row("Angry Bird", 4, 3),
        Row("Interested", 5, 4, cost: 6m), Row("Scheduled Meeting", 2, 2, cost: 3m), Row("Call Back Later", 6),
        Row("DNCR UAE Blocked", 40, cost: 0m), Row("Test Call", 3), Row("No Answer", 50, env: EnvId.Dub, campaign: "Hilton JLT"),
    ];
    private static readonly AiCampaignTotals[] Camps = [new("Saadiyat Lagoons", EnvId.Auh, 1000, 400, D), new("Hilton JLT", EnvId.Dub, 500, 100, D)];

    private static AiCallSummary All(IReadOnlyDictionary<string, MappedResult>? o = null, AiCallFilter? f = null, IEnumerable<AiCallDailyExtra>? ex = null)
        => AiCallSums.Summarize(Rows, ex ?? [], Camps, o, Survey, f ?? F());

    [Fact]
    public void Every_counted_call_is_answered_not_answered_or_dropped_and_blocked_and_test_are_left_out()
    {
        var s = All();
        Assert.Equal(s.ByGroup.Answered + s.ByGroup.NoAnswer + s.ByGroup.Dropped, s.Calls);
        Assert.Equal(100 + 10 + 20 + 30 + 4 + 5 + 2 + 6 + 50, s.Calls);
        Assert.Equal(40, s.Blocked);
        Assert.Equal(3, s.ByGroup.Excluded);
    }

    [Fact]
    public void The_environment_and_campaign_filters_narrow_the_totals_and_the_campaigns()
    {
        var all = All();
        var auh = All(f: F(EnvId.Auh));
        Assert.True(auh.Calls < all.Calls);
        Assert.Equal(1000, auh.Targeted);
        Assert.True(auh.Campaigns.All(c => c.EnvId == EnvId.Auh));
        Assert.Equal(50, All(f: F(campaign: "Hilton JLT")).Calls);
        // days: only rows from the first day on
        Assert.Equal(0, All(f: F(from: D.AddDays(1))).Calls);
    }

    [Fact]
    public void Every_default_outcome_is_mapped_exactly_once()
    {
        Assert.Equal(BrightcallMapping.Defaults.Count, BrightcallMapping.Defaults.Select(d => d.Code).Distinct().Count());
        Assert.Equal(MappedResult.Appointment, BrightcallMapping.Lookup("Scheduled Meeting", null).Outcome.Result);
        Assert.Equal(CallGroup.Dropped, BrightcallMapping.Lookup("Dropped Transfer", null).Outcome.Group);
        Assert.Equal(MappedResult.Other, BrightcallMapping.Lookup("Dropped Transfer", null).Outcome.Result);
        Assert.True(BrightcallMapping.Lookup("Angry Bird", null).Outcome.Complaint);
    }

    [Fact]
    public void Leads_complaints_survey_candidates_and_cost_per_lead_follow_the_spec()
    {
        var s = All();
        Assert.Equal(7, s.Leads);                // Interested 5 + Scheduled Meeting 2, in calls
        Assert.Equal(3, s.Complaints);           // contacts of Angry Bird
        Assert.Equal(6, s.CanGetSurvey);         // contacts of the three completed results: 4 + 2
        Assert.Equal(17m, s.Cost); // 8 rows at 1 + 6 + 3 + 0 (blocked rows count in the cost)
        Assert.Equal(Math.Round(s.Cost / 7, 2), s.CostPerLead);
        var answered = s.ByGroup.Answered;
        Assert.Equal(Math.Round(100.0 * 7 / answered, 1), s.LeadRatePct);
        Assert.Equal(Math.Round(100.0 * answered / s.Calls, 1), s.AnswerRatePct);
        Assert.Equal(Math.Round(100.0 * 500 / 1500, 1), s.ProgressPct);
        Assert.True(s.ByResult.Single(r => r.Result == MappedResult.Successful).SendsSurvey);
        Assert.False(s.ByResult.Single(r => r.Result == MappedResult.NotInterested).SendsSurvey);
    }

    [Fact]
    public void A_new_outcome_counts_as_other_answered_until_it_is_mapped()
    {
        var rows = Rows.Append(Row("Brand New Code", 9)).ToArray();
        var s = AiCallSums.Summarize(rows, [], Camps, null, Survey, F());
        Assert.Equal("Brand New Code", string.Join(",", s.Unmapped));
        Assert.Equal(9, s.ByResult.Where(r => r.Result == MappedResult.Other).Sum(r => r.Calls));
        // the CX manager maps it to an appointment: it leaves the warning and can get the survey
        var mapped = new Dictionary<string, MappedResult> { ["Brand New Code"] = MappedResult.Appointment };
        var s2 = AiCallSums.Summarize(rows, [], Camps, mapped, Survey, F());
        Assert.Empty(s2.Unmapped);
        Assert.Equal(6 + 9, s2.CanGetSurvey);
        Assert.Equal(CallGroup.Answered, BrightcallMapping.Lookup("Brand New Code", mapped).Outcome.Group);
    }

    [Fact]
    public void Changing_a_default_results_changes_the_survey_count_and_keeps_the_group()
    {
        var o = new Dictionary<string, MappedResult> { ["Interested"] = MappedResult.Other };
        var s = All(o);
        Assert.Equal(2, s.CanGetSurvey);
        Assert.True(BrightcallMapping.Lookup("Interested", o).Edited);
        Assert.Equal(CallGroup.Answered, BrightcallMapping.Lookup("Interested", o).Outcome.Group);
    }

    [Fact]
    public void The_drop_rate_at_the_greeting_is_within_20s_over_answered_plus_within_20s_with_bands()
    {
        var ex = new[] { new AiCallDailyExtra(D, EnvId.Auh, "Saadiyat Lagoons", new DropBuckets(30, 5, 1), new SentimentSplit(3, 4, 5)) };
        var s = All(ex: ex);
        var c = s.Campaigns.Single(x => x.Campaign == "Saadiyat Lagoons");
        // answered = 30 + 4 + 5 + 2 + 6 = 47 (Not Interested, Angry Bird, Interested, Scheduled, Call Back)
        Assert.Equal(Math.Round(100.0 * 30 / (47 + 30), 1), c.GreetingDropPct);
        Assert.Equal(GreetingBand.Amber, c.GreetingBand); // 38.96
        Assert.Equal((30, 5, 1), (s.Drops.Within20s, s.Drops.After1min, s.Drops.PositiveThenDropped));
        Assert.Equal((3, 4, 5), (s.Sentiment.Positive, s.Sentiment.Neutral, s.Sentiment.Negative));
        Assert.Equal(GreetingBand.Red, AiCallSums.Band(40));
        Assert.Equal(GreetingBand.Amber, AiCallSums.Band(30));
        Assert.Equal(GreetingBand.Ok, AiCallSums.Band(29.9));
        Assert.Equal(GreetingBand.Ok, AiCallSums.Band(null));
    }
}

public class AiCallServiceTests
{
    private static readonly Actor Cx = new("u-cx", "cx@psi.sample", Cxmgr);
    private static readonly Actor Team = new("u-t", "t@psi.sample", Cxteam);
    private static readonly Actor Exec1 = new("u-exec", "exec@psi.sample", Exec);
    private static readonly Actor EnvDub = new("u-env", "env@psi.sample", Envmgmt, EnvId.Dub);

    private sealed record Rig(AiCallService Svc, CallSurveyService Surveys, SignalService Signals, FakeClock Clock, InMemoryCallContactDirectory Dir, ISettingsStore Settings);

    private static Rig Make()
    {
        var clock = new FakeClock(DateTimeOffset.Parse("2026-11-26T08:00:00Z"));
        var dir = new InMemoryCallContactDirectory();
        dir.Set(new CallContact("p-1", ProductId.Re, false, true, true, "+971501111111"));
        var settings = new InMemorySettingsStore();
        var answers = new InMemorySurveyResponseStore();
        var surveys = new CallSurveyService(new InMemoryCallSurveyStore(), dir, new FakeSender(), new SettingsCallSurveyRuleSource(settings), new DefaultRules(), answers, new SurveyService(answers, clock), clock);
        var signals = new SignalService(new InMemorySignalStore(), new SettingsFixClockInputs(settings, new NoVipPatterns()), clock);
        var svc = new AiCallService(new InMemoryAiCallStore(), new SettingsBrightcallMappingSource(settings), new SettingsCallSurveyRuleSource(settings), surveys, signals, dir, clock);
        return new Rig(svc, surveys, signals, clock, dir, settings);
    }

    private static readonly DateOnly Today = new(2026, 11, 26);
    private static AiCallDailyRow Row(DateOnly d, string outcome, int calls, EnvId env = EnvId.Auh) => new(d, env, "Saadiyat Lagoons", outcome, calls, calls, 1m);

    [Fact]
    public async Task The_sync_replaces_the_range_so_a_reclassified_outcome_disappears_and_is_validated()
    {
        var r = Make();
        var first = new AiCallSync(Today.AddDays(-1), Today, [Row(Today.AddDays(-1), "No Answer", 10), Row(Today, "Interested", 5), Row(Today, "Brand New", 2)], []);
        var ok = (await r.Svc.SyncDailyAsync(Cx, first)).Value!;
        Assert.Equal(3, ok.Rows);
        Assert.Equal("Brand New", string.Join(",", ok.Unmapped));
        // the nightly re-run of the last two days: BrightCall moved the 5 "Interested" calls to "Not Interested"
        await r.Svc.SyncDailyAsync(Cx, new AiCallSync(Today.AddDays(-1), Today, [Row(Today.AddDays(-1), "No Answer", 10), Row(Today, "Not Interested", 5)], []));
        var s = (await r.Svc.SummaryAsync(Cx, 7, null, null)).Value!;
        Assert.Equal(15, s.Calls);
        Assert.Equal(0, s.Leads);
        Assert.Empty(s.Unmapped);
        Assert.Equal(r.Clock.Now, s.LastRefreshAt);

        Assert.Equal(Failure.Invalid, (await r.Svc.SyncDailyAsync(Cx, new AiCallSync(Today, Today.AddDays(-1), [], []))).Error);
        Assert.Equal(Failure.Invalid, (await r.Svc.SyncDailyAsync(Cx, new AiCallSync(Today, Today.AddDays(1), [], []))).Error);
        Assert.Equal(Failure.Invalid, (await r.Svc.SyncDailyAsync(Cx, new AiCallSync(Today, Today, [Row(Today.AddDays(-3), "Busy", 1)], []))).Error);
        Assert.Equal(Failure.Invalid, (await r.Svc.SyncDailyAsync(Cx, new AiCallSync(Today, Today, [Row(Today, "Busy", -1)], []))).Error);
        Assert.Equal(Failure.Invalid, (await r.Svc.SyncDailyAsync(Cx, new AiCallSync(Today, Today, [Row(Today, "Busy", 1), Row(Today, "Busy", 2)], []))).Error);
        Assert.Equal(Failure.Invalid, (await r.Svc.SyncDailyAsync(Cx, new AiCallSync(Today.AddDays(-400), Today, [], []))).Error);
    }

    [Fact]
    public async Task The_period_environment_scope_and_access_are_applied()
    {
        var r = Make();
        await r.Svc.SyncDailyAsync(Cx, new AiCallSync(Today.AddDays(-40), Today, [Row(Today.AddDays(-40), "No Answer", 7), Row(Today.AddDays(-5), "No Answer", 10), Row(Today, "No Answer", 20, EnvId.Dub)], []));
        Assert.Equal(30, (await r.Svc.SummaryAsync(Cx, 7, null, null)).Value!.Calls);
        Assert.Equal(37, (await r.Svc.SummaryAsync(Team, 90, null, null)).Value!.Calls);
        Assert.Equal(20, (await r.Svc.SummaryAsync(Cx, 7, EnvId.Dub, null)).Value!.Calls);
        // today counts as day one: a 1-day period has only today's rows
        Assert.Equal(20, (await r.Svc.SummaryAsync(Cx, 1, null, null)).Value!.Calls);
        Assert.Equal(Failure.Invalid, (await r.Svc.SummaryAsync(Cx, 0, null, null)).Error);
        Assert.Equal(Failure.Forbidden, (await r.Svc.SummaryAsync(Exec1, 30, null, null)).Error);
        Assert.Equal(Failure.Unauthenticated, (await r.Svc.SummaryAsync(null, 30, null, null)).Error);
        Assert.Equal(Failure.Forbidden, (await r.Svc.SyncDailyAsync(Exec1, new AiCallSync(Today, Today, [], []))).Error);
        Assert.Equal(Failure.Forbidden, (await r.Svc.SummaryAsync(EnvDub, 30, null, null)).Error); // not a CX role
    }

    [Fact]
    public async Task The_cx_manager_mapping_changes_the_overview_and_the_outcome_list()
    {
        var r = Make();
        await r.Svc.SyncDailyAsync(Cx, new AiCallSync(Today, Today, [Row(Today, "Interested", 5), Row(Today, "Brand New", 2)], []));
        Assert.Equal(5, (await r.Svc.SummaryAsync(Cx, 7, null, null)).Value!.CanGetSurvey);
        Assert.Equal("Brand New", string.Join(",", (await r.Svc.OutcomesAsync(Cx)).Value!.Unmapped));
        var json = JsonSerializer.SerializeToElement(new Dictionary<string, string> { ["Interested"] = "other", ["Brand New"] = "follow_up" });
        Assert.Null(new BrightcallMappingValidator().Validate(json, null));
        await r.Settings.TryAppendAsync(new SettingVersion(SettingKeys.BrightcallMapping, 1, json, r.Clock.Now, "u-cx", Cxmgr, null));
        var s = (await r.Svc.SummaryAsync(Cx, 7, null, null)).Value!;
        Assert.Equal(2, s.CanGetSurvey);
        var list = (await r.Svc.OutcomesAsync(Cx)).Value!;
        Assert.Empty(list.Unmapped);
        Assert.True(list.Outcomes.Single(o => o.Code == "Interested").Edited);
        Assert.False(list.Outcomes.Single(o => o.Code == "Interested").SendsSurvey);
        Assert.True(list.Outcomes.Single(o => o.Code == "Brand New").SendsSurvey);
        Assert.Equal(BrightcallMapping.Defaults.Count + 1, list.Outcomes.Count);
    }

    [Fact]
    public void Only_the_cx_manager_edits_the_mapping_and_it_is_validated()
    {
        Assert.True(SettingKeys.CanEdit(SettingKeys.BrightcallMapping, Cxmgr));
        Assert.False(SettingKeys.CanEdit(SettingKeys.BrightcallMapping, Cxteam));
        var v = new BrightcallMappingValidator();
        JsonElement J(object o) => JsonSerializer.SerializeToElement(o);
        Assert.NotNull(v.Validate(J(new Dictionary<string, string> { ["Interested"] = "nonsense" }), null));
        Assert.NotNull(v.Validate(J(new[] { "x" }), null));
        Assert.NotNull(v.Validate(J(new Dictionary<string, int> { ["Interested"] = 3 }), null));
        Assert.Null(v.Validate(J(new Dictionary<string, string> { ["Test Call"] = "excluded", ["Voicemail"] = "no_answer" }), null));
    }

    private static BrightcallCall Call(string id = "BC-1", string outcome = "Scheduled Meeting", string? phone = "+971501111111", int talk = 90, TimeSpan? ago = null)
        => new(id, DateTimeOffset.Parse("2026-11-26T08:00:00Z") - (ago ?? TimeSpan.FromMinutes(5)), EnvId.Auh, "Saadiyat Lagoons", outcome, CallDirection.Outbound, CallHandler.Ai, talk, phone, null, CallSentiment.Positive, "https://aidashboards.psiwebs.com/rec/1");

    [Fact]
    public async Task A_call_that_can_send_the_survey_goes_to_the_call_survey_with_the_campaign_as_its_script()
    {
        var r = Make();
        var res = (await r.Svc.EventAsync(Cx, Call())).Value!;
        Assert.Equal(AiCallAction.Survey, res.Action);
        Assert.Equal(CallResult.Appointment, res.Survey!.Result);
        Assert.Equal("Saadiyat Lagoons", res.Survey.Script);
        Assert.Equal(CallSurveyStatus.Scheduled, res.Survey.Status);
        Assert.Equal("p-1", res.Event!.PersonId);
        Assert.Equal("https://aidashboards.psiwebs.com/rec/1", res.Event.RecordingUrl);
        Assert.Null(res.Survey.Phone);
        Assert.Single((await r.Surveys.ListAsync(Cx, null, null, null, null)).Value!);
        // sent twice: stored once
        var again = (await r.Svc.EventAsync(Cx, Call())).Value!;
        Assert.True(again.Duplicate);
        Assert.Single((await r.Svc.EventsAsync(Cx, null, null, null, null)).Value!);
        Assert.Single((await r.Svc.EventsAsync(Cx, "p-1", null, null, null)).Value!);
        Assert.Empty((await r.Svc.EventsAsync(Cx, "p-9", null, null, null)).Value!);
    }

    [Fact]
    public async Task An_angry_bird_call_becomes_a_complaint_signal_linked_when_the_contact_is_known_and_counted_when_it_is_not()
    {
        var r = Make();
        var known = (await r.Svc.EventAsync(Cx, Call("A1", "Angry Bird"))).Value!;
        Assert.Equal(AiCallAction.Complaint, known.Action);
        Assert.Null(known.Survey);
        var unknown = (await r.Svc.EventAsync(Cx, Call("A2", "Angry Bird", "+971509999999"))).Value!;
        Assert.Equal(AiCallAction.Complaint, unknown.Action);
        var list = (await r.Signals.ListAsync(Cx, null, SignalKind.Complaint)).Value!;
        Assert.Equal(2, list.Count);
        Assert.Equal("p-1", list.Single(s => s.Id == "sg-call-A1").PersonId);
        Assert.Null(list.Single(s => s.Id == "sg-call-A2").PersonId);
        Assert.Equal("Abu Dhabi", list[0].Environment);
        Assert.Empty((await r.Surveys.ListAsync(Cx, null, null, null, null)).Value!);
    }

    [Fact]
    public async Task Other_calls_are_ignored_and_the_survey_rule_decides_which_results_count()
    {
        var r = Make();
        Assert.Equal(AiCallAction.Ignored, (await r.Svc.EventAsync(Cx, Call("N1", "Not Interested"))).Value!.Action);
        Assert.Equal(AiCallAction.Ignored, (await r.Svc.EventAsync(Cx, Call("N2", "DNCR UAE Blocked"))).Value!.Action);
        Assert.Equal(AiCallAction.Ignored, (await r.Svc.EventAsync(Cx, Call("N3", "Brand New Code"))).Value!.Action);
        Assert.Empty((await r.Svc.EventsAsync(Cx, null, null, null, null)).Value!);
        // the CX manager switches the follow-up result off in the survey rule: "Considering" is no longer a candidate
        var rule = JsonSerializer.SerializeToElement(new { sendOn = new[] { "appointment", "successful" } });
        await r.Settings.TryAppendAsync(new SettingVersion(SettingKeys.CallSurveyRule, 1, rule, r.Clock.Now, "u-cx", Cxmgr, null));
        Assert.Equal(AiCallAction.Ignored, (await r.Svc.EventAsync(Cx, Call("N4", "Considering"))).Value!.Action);
        Assert.Equal(AiCallAction.Survey, (await r.Svc.EventAsync(Cx, Call("N5", "Interested"))).Value!.Action);
    }

    [Fact]
    public async Task Events_are_checked()
    {
        var r = Make();
        Assert.Equal(Failure.Forbidden, (await r.Svc.EventAsync(Exec1, Call())).Error);
        Assert.Equal(Failure.Invalid, (await r.Svc.EventAsync(Cx, Call(" "))).Error);
        Assert.Equal(Failure.Invalid, (await r.Svc.EventAsync(Cx, Call(phone: "0501111111"))).Error);
        Assert.Equal(Failure.Invalid, (await r.Svc.EventAsync(Cx, Call() with { RecordingUrl = "http://x/rec" })).Error);
        Assert.Equal(Failure.Invalid, (await r.Svc.EventAsync(Cx, Call(ago: TimeSpan.FromHours(-1)))).Error);
        Assert.Equal(Failure.Invalid, (await r.Svc.EventAsync(Cx, Call(talk: -3))).Error);
    }
}
