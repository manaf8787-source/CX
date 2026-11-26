using System.Text.Json;
using PsiCx.Application;
using PsiCx.Domain;
using PsiCx.Infrastructure;
using PsiCx.Rules;
using static PsiCx.Domain.RoleId;

namespace PsiCx.Tests;

public class SurveyLogicTests
{
    private static SurveyQuestion Q(string en, string? kind = null, SurveyRouting? next = null) => new(en, en + " ar", kind, null, next);

    [Fact]
    public void A_question_kind_comes_from_its_kind_or_its_wording()
    {
        Assert.Equal(QuestionKind.Nps, SurveyLogic.KindOf(Q("How likely, 0 to 10?")));
        Assert.Equal(QuestionKind.Rating, SurveyLogic.KindOf(Q("Rate 1 to 5")));
        Assert.Equal(QuestionKind.Yesno, SurveyLogic.KindOf(Q("Was it clear? Yes / no")));
        Assert.Equal(QuestionKind.Choice, SurveyLogic.KindOf(Q("How did you find us? (web · friend · ad)")));
        Assert.Equal(QuestionKind.Open, SurveyLogic.KindOf(Q("Anything else?")));
        Assert.Equal(QuestionKind.Rating, SurveyLogic.KindOf(Q("Anything else?", "rating")));
    }

    [Fact]
    public void Bracketed_options_become_the_answers_of_a_choice()
    {
        var q = Q("How did you find us? (web · friend · ad)");
        Assert.Equal("web,friend,ad", string.Join(",", SurveyLogic.AnswersOf(q).Select(a => a.Value)));
        Assert.Equal(11, SurveyLogic.AnswersOf(Q("x", "nps")).Count);
        Assert.Equal(5, SurveyLogic.AnswersOf(Q("x", "rating")).Count);
        Assert.Empty(SurveyLogic.AnswersOf(Q("x", "open")));
    }

    [Fact]
    public void An_answer_goes_to_the_route_that_matches_else_to_the_otherwise()
    {
        var next = new SurveyRouting([new SurveyRoute(RouteOp.AtMost, "6", RouteTarget.At(2))], RouteTarget.Finish);
        var qs = new[] { Q("Score 0 to 10", "nps", next), Q("Why?"), Q("Anything else?") };
        Assert.Equal(2, SurveyLogic.TargetOf(qs, 0, "4"));
        Assert.Null(SurveyLogic.TargetOf(qs, 0, "9"));
        Assert.Null(SurveyLogic.TargetOf(qs, 0, null));
        Assert.Equal(2, SurveyLogic.TargetOf(qs, 1, "anything"));
    }

    [Fact]
    public void A_jump_can_only_go_forward_to_a_question_that_exists()
    {
        var back = new SurveyRouting([], RouteTarget.At(0));
        var far = new SurveyRouting([], RouteTarget.At(9));
        Assert.Equal(1, SurveyLogic.Problems([Q("a"), Q("b", null, back)]).Count);
        Assert.Equal(1, SurveyLogic.Problems([Q("a", null, far), Q("b")]).Count);
        Assert.Empty(SurveyLogic.Problems([Q("a", null, new SurveyRouting([], RouteTarget.At(1))), Q("b")]));
    }

    [Fact]
    public void Problems_name_a_missing_language_a_thin_choice_and_a_route_to_nowhere()
    {
        Assert.Equal(1, SurveyLogic.Problems([new SurveyQuestion("a", "")]).Count);
        Assert.Equal(1, SurveyLogic.Problems([new SurveyQuestion("a", "ب", "choice", [new Bi("x", "س")])]).Count);
        var bad = new SurveyRouting([new SurveyRoute(RouteOp.Is, "maybe", RouteTarget.Finish)], RouteTarget.Next);
        Assert.Equal(1, SurveyLogic.Problems([Q("Was it clear? yes/no", null, bad)]).Count);
        Assert.Equal(1, SurveyLogic.Problems([]).Count);
    }
}

public class IndicatorsTests
{
    [Fact]
    public void NPS_is_the_share_of_promoters_minus_the_share_of_detractors()
    {
        var r = Indicators.Nps([10, 9, 9, 8, 7, 6, 3, 10, 2, 9]);
        Assert.Equal(10, r.Responses);
        Assert.Equal(5, r.Promoters);
        Assert.Equal(2, r.Passives);
        Assert.Equal(3, r.Detractors);
        Assert.Equal(20, r.Score);
        Assert.Null(Indicators.Nps([]).Score);
        Assert.Equal(-100, Indicators.Nps([0, 6]).Score);
    }

    [Fact]
    public void CSAT_counts_four_and_five_and_CES_the_easy_end_of_its_scale()
    {
        Assert.Equal(50, Indicators.Csat([5, 4, 3, 1]).Pct);
        Assert.Null(Indicators.Csat([]).Pct);
        Assert.Equal(75, Indicators.Ces([7, 6, 5, 2], 7).Pct);
        Assert.Equal(50, Indicators.Ces([5, 4, 3, 1], 5).Pct);
        Assert.Equal(2, Indicators.RecoveryDelta(3, 5));
    }
}

public class SurveyServiceTests
{
    private static readonly Actor Cx = new("u-cx", "cx@psi.sample", Cxmgr);
    private static readonly Actor Exec1 = new("u-exec", "exec@psi.sample", Exec);
    private static readonly Actor EnvDubai = new("u-env", "env@psi.sample", Envmgmt, EnvId.Dub);

    private static (SurveyService Svc, FakeClock Clock) Make()
    {
        var clock = new FakeClock(new DateTimeOffset(2026, 11, 26, 8, 0, 0, TimeSpan.Zero));
        return (new SurveyService(new InMemorySurveyResponseStore(), clock), clock);
    }

    private static RecordResponse R(DateTimeOffset at, int score = 9, Measure m = Measure.Nps, ProductId p = ProductId.Re, EnvId e = EnvId.Dub, string person = "p-1", ChannelId c = ChannelId.Whatsapp, int? scale = null, string? re = null, ReachedVia via = ReachedVia.None, string? note = null)
        => new(person, p, e, m, score, scale, c, at, re, via, note);

    [Fact]
    public async Task Only_CX_records_and_the_input_is_checked()
    {
        var (s, c) = Make();
        var t = c.Now.AddDays(-1);
        Assert.Equal(Failure.Unauthenticated, (await s.RecordAsync(null, R(t))).Error);
        Assert.Equal(Failure.Forbidden, (await s.RecordAsync(Exec1, R(t))).Error);
        Assert.Equal(Failure.Invalid, (await s.RecordAsync(Cx, R(t, person: " "))).Error);
        Assert.Equal(Failure.Invalid, (await s.RecordAsync(Cx, R(t, c: ChannelId.Google))).Error);
        Assert.Equal(Failure.Invalid, (await s.RecordAsync(Cx, R(c.Now.AddDays(2)))).Error);
        Assert.Equal(Failure.Invalid, (await s.RecordAsync(Cx, R(t, score: 11))).Error);
        Assert.Equal(Failure.Invalid, (await s.RecordAsync(Cx, R(t, score: 0, m: Measure.Csat))).Error);
        Assert.Equal(Failure.Invalid, (await s.RecordAsync(Cx, R(t, score: 5, m: Measure.Ces, scale: 6))).Error);
        Assert.Equal(Failure.Invalid, (await s.RecordAsync(Cx, R(t, p: ProductId.Ev))).Error);
        Assert.True((await s.RecordAsync(Cx, R(t, score: 0))).IsOk);
    }

    [Fact]
    public async Task Indicators_are_per_product_and_follow_the_environment_switch()
    {
        var (s, c) = Make();
        var t = c.Now.AddDays(-3);
        foreach (var sc in new[] { 10, 9, 3 }) await s.RecordAsync(Cx, R(t, sc, person: $"p{sc}"));
        await s.RecordAsync(Cx, R(t, 10, e: EnvId.Auh, person: "q1"));
        await s.RecordAsync(Cx, R(t, 2, p: ProductId.Af, person: "z1"));
        await s.RecordAsync(Cx, R(t, 5, Measure.Csat, person: "w1"));
        var all = (await s.IndicatorsAsync(Cx, ProductId.Re, null, null, null)).Value!;
        // 25 Nov (owner): PSI Real Estate's line includes the After-Sales answers (z1, a detractor): 3 promoters, 2 detractors out of 5
        Assert.Equal(5, all.Nps!.Responses);
        Assert.Equal(20, all.Nps.Score);
        Assert.Equal(100, all.Csat.Pct);
        Assert.Null(all.Ces.Pct);
        var dub = (await s.IndicatorsAsync(Cx, ProductId.Re, EnvId.Dub, null, null)).Value!;
        Assert.Equal(4, dub.Nps!.Responses);
        // Environment management does not open the CX indicators page at all.
        Assert.Equal(Failure.Forbidden, (await s.IndicatorsAsync(EnvDubai, ProductId.Re, EnvId.Auh, null, null)).Error);
        // After-Sales keeps its own line with only its answers
        Assert.Equal(1, (await s.IndicatorsAsync(Cx, ProductId.Af, null, null, null)).Value!.Nps!.Responses);
        Assert.Null((await s.IndicatorsAsync(Cx, ProductId.Ev, null, null, null)).Value!.Nps);
        Assert.Equal(Failure.Forbidden, (await s.IndicatorsAsync(new Actor("u-s", "s@psi.sample", Shopper), ProductId.Re, null, null, null)).Error);
    }

    [Fact]
    public async Task A_re_survey_gives_the_recovery_delta_and_replaces_the_first_rating_in_the_indicators()
    {
        var (s, c) = Make();
        var first = (await s.RecordAsync(Cx, R(c.Now.AddDays(-20), 3))).Value!;
        Assert.Equal(Failure.Invalid, (await s.RecordAsync(Cx, R(c.Now.AddDays(-25), 8, re: first.Id))).Error);
        Assert.Equal(Failure.Invalid, (await s.RecordAsync(Cx, R(c.Now.AddDays(-9), 8, person: "other", re: first.Id))).Error);
        Assert.Equal(Failure.NotFound, (await s.RecordAsync(Cx, R(c.Now.AddDays(-9), 8, re: "sr-99"))).Error);
        var re = (await s.RecordAsync(Cx, R(c.Now.AddDays(-9), 8, re: first.Id))).Value!;
        Assert.Equal(5, re.RecoveryDelta);
        Assert.Equal(Failure.Invalid, (await s.RecordAsync(Cx, R(c.Now.AddDays(-5), 9, re: re.Id))).Error);
        var ind = (await s.IndicatorsAsync(Cx, ProductId.Re, null, null, null)).Value!;
        // The first rating (3, a detractor) is gone; the re-survey (8, a passive) counts in its place. One answer, not two.
        Assert.Equal(1, ind.Nps!.Responses);
        Assert.Equal(1, ind.Nps.Passives);
        Assert.Equal(0, ind.Nps.Detractors);
        Assert.Equal(5.0, ind.AverageRecoveryDelta);
        Assert.Equal(1, ind.ReSurveys);
    }

    [Fact]
    public async Task The_latest_re_survey_wins_and_CSAT_follows_too()
    {
        var (s, c) = Make();
        var f = (await s.RecordAsync(Cx, R(c.Now.AddDays(-30), 3))).Value!;
        await s.RecordAsync(Cx, R(c.Now.AddDays(-20), 8, re: f.Id));
        await s.RecordAsync(Cx, R(c.Now.AddDays(-10), 10, re: f.Id));
        var fc = (await s.RecordAsync(Cx, R(c.Now.AddDays(-30), 1, Measure.Csat, person: "p-2"))).Value!;
        await s.RecordAsync(Cx, R(c.Now.AddDays(-10), 5, Measure.Csat, person: "p-2", re: fc.Id));
        var ind = (await s.IndicatorsAsync(Cx, ProductId.Re, null, null, null)).Value!;
        Assert.Equal(1, ind.Nps!.Promoters);
        Assert.Equal(100, ind.Nps.Score);
        Assert.Equal(100, ind.Csat.Pct);
    }

    [Fact]
    public async Task The_recovery_report_shows_before_and_after_with_the_call_notes_for_CX_only()
    {
        var (s, c) = Make();
        // Five detractors on NPS; three are re-surveyed: one by call (recovered), one by gift (better, still detractor), one by call and gift (same).
        var ids = new List<string>();
        for (var i = 1; i <= 5; i++) ids.Add((await s.RecordAsync(Cx, R(c.Now.AddDays(-30), 2, person: $"d{i}"))).Value!.Id);
        await s.RecordAsync(Cx, R(c.Now.AddDays(-10), 9, person: "d1", re: ids[0], via: ReachedVia.Call, note: " Wanted the handover date. "));
        await s.RecordAsync(Cx, R(c.Now.AddDays(-9), 5, person: "d2", re: ids[1], via: ReachedVia.Gift));
        await s.RecordAsync(Cx, R(c.Now.AddDays(-8), 2, person: "d3", re: ids[2], via: ReachedVia.CallAndGift));
        await s.RecordAsync(Cx, R(c.Now.AddDays(-30), 10, person: "pro"));
        var r = (await s.RecoveryAsync(Cx, ProductId.Re, null, null, null)).Value!;
        Assert.Equal(5, r.DetractorsBefore);
        Assert.Equal(3, r.ReSurveyed);
        Assert.Equal(4, r.DetractorsAfter);
        Assert.Equal(1, r.Recovered);
        Assert.Equal(2, r.NotYetReSurveyed);
        Assert.Equal(1, r.Movement.NoLongerDetractor);
        Assert.Equal(1, r.Movement.BetterStillDetractor);
        Assert.Equal(1, r.Movement.Same);
        Assert.Equal(3.3, r.AverageDelta);
        Assert.Equal("Wanted the handover date.", r.People.Single(p => p.PersonId == "d1").Note);
        // Overall: six NPS answers before (5 detractors, 1 promoter = -67), after d1 moves to promoter (4 detractors, 2 promoters = -33).
        Assert.Equal(-67, r.Indicators.NpsBefore.Score);
        Assert.Equal(-33, r.Indicators.NpsAfter.Score);
        // How reached is a filter and the headline follows it.
        var calls = (await s.RecoveryAsync(Cx, null, null, ReachedVia.Call, null)).Value!;
        Assert.Equal(1, calls.ReSurveyed);
        Assert.Equal(0, calls.DetractorsAfter);
        Assert.Equal(Failure.Forbidden, (await s.RecoveryAsync(Exec1, null, null, null, null)).Error);
        Assert.Equal(Failure.Unauthenticated, (await s.RecoveryAsync(null, null, null, null, null)).Error);
    }

    [Fact]
    public async Task CES_on_seven_points_leads_and_a_date_range_narrows()
    {
        var (s, c) = Make();
        await s.RecordAsync(Cx, R(c.Now.AddDays(-40), 7, Measure.Ces, scale: 7, person: "a"));
        await s.RecordAsync(Cx, R(c.Now.AddDays(-2), 2, Measure.Ces, scale: 7, person: "b"));
        await s.RecordAsync(Cx, R(c.Now.AddDays(-2), 5, Measure.Ces, scale: 5, person: "c"));
        Assert.Equal(50, (await s.IndicatorsAsync(Cx, ProductId.Re, null, null, null)).Value!.Ces.Pct);
        Assert.Equal(0, (await s.IndicatorsAsync(Cx, ProductId.Re, null, c.Now.AddDays(-10), null)).Value!.Ces.Pct);
    }
}

public class DetractorAnalysisTests
{
    private static readonly Actor Cx = new("u-cx", "cx@psi.sample", Cxmgr);
    private static readonly Actor Boss = new("u-e", "e@psi.sample", Exec);

    private static (SurveyService S, FakeClock C) Make()
    {
        var clock = new FakeClock(new DateTimeOffset(2026, 11, 26, 8, 0, 0, TimeSpan.Zero));
        return (new SurveyService(new InMemorySurveyResponseStore(), clock), clock);
    }

    private static RecordResponse D(DateTimeOffset at, string person, int score = 3, ProductId p = ProductId.Re, EnvId e = EnvId.Dub, string? comment = null, bool digital = false, string? touch = null, string? re = null, string? note = null, DetractorReason? reason = null, bool callPending = true)
        => new(person, p, e, Measure.Nps, score, null, ChannelId.Whatsapp, at, re, note is null ? ReachedVia.None : ReachedVia.Call, note, comment, touch is null ? null : new Bi(touch, touch), digital, null, null, null, reason, callPending);

    [Fact]
    public async Task The_classifier_reads_the_comment_then_the_touchpoint_then_the_call_notes()
    {
        Assert.Equal(DetractorReason.SlowReply, DetractorReasons.Classify("Nobody called back after the viewing.", null, false, false, true));
        Assert.Equal(DetractorReason.Price, DetractorReasons.Classify("The price changed after I agreed.", null, false, false, true));
        Assert.Equal(DetractorReason.Paperwork, DetractorReasons.Classify("Deposit refund is still pending.", null, false, false, true));
        Assert.Equal(DetractorReason.Knowledge, DetractorReasons.Classify("The agent could not answer basic questions about service charges.", null, false, false, true));
        Assert.Equal(DetractorReason.AppErrors, DetractorReasons.Classify(null, null, true, false, true));
        Assert.Equal(DetractorReason.Maintenance, DetractorReasons.Classify(null, null, false, true, true));
        Assert.Equal(DetractorReason.Communication, DetractorReasons.Classify(null, "He said the agent was rude", false, false, false));
        Assert.Equal(DetractorReason.Pending, DetractorReasons.Classify(null, null, false, false, true));
        Assert.Equal(DetractorReason.Other, DetractorReasons.Classify(null, null, false, false, false));
        Assert.Equal(DetractorTheme.People, DetractorReasons.ThemeOf(DetractorReason.Other));
        Assert.Equal(DetractorTheme.Process, DetractorReasons.ThemeOf(DetractorReason.Maintenance));
        Assert.Equal(DetractorTheme.Pending, DetractorReasons.ThemeOf(DetractorReason.Pending));
        await Task.CompletedTask;
    }

    [Fact]
    public async Task Every_detractor_gets_a_reason_and_the_analysis_counts_by_theme_reason_and_environment()
    {
        var (s, c) = Make();
        var t = c.Now.AddDays(-5);
        await s.RecordAsync(Cx, D(t, "a", comment: "Maintenance took two weeks.", touch: "Maintenance visit"));
        await s.RecordAsync(Cx, D(t, "b", comment: "Nobody called back after the viewing.", e: EnvId.Auh));
        await s.RecordAsync(Cx, D(t, "c", digital: true, touch: "App · Uploading documents"));
        await s.RecordAsync(Cx, D(t, "d"));                                  // nothing to read yet: pending
        await s.RecordAsync(Cx, D(t, "e", score: 9));                        // a promoter is not a detractor
        await s.RecordAsync(Cx, D(t, "f", p: ProductId.Af, comment: "The agent was rude on the phone."));
        var re = (await s.DetractorsAsync(Cx, ProductId.Re, Measure.Nps, null, null, null, null)).Value!;
        Assert.Equal(5, re.Total);                                           // PSI Real Estate includes After-Sales
        Assert.Equal(1, re.ToCall);
        Assert.Equal(1, re.ByTheme.Single(x => x.Key == DetractorTheme.Digital).Count);
        Assert.Equal(1, re.ByTheme.Single(x => x.Key == DetractorTheme.Pending).Count);
        Assert.Equal(2, re.ByTheme.Single(x => x.Key == DetractorTheme.People).Count);
        Assert.Equal(2, re.ByEnvironment.Sum(x => x.Count) - 3);             // Dubai 4, Abu Dhabi 1
        Assert.Equal(1, re.ByTouchpoint.Single(x => x.Key == "Maintenance visit").Count);
        Assert.NotNull(re.TopReason);
        Assert.NotEqual(DetractorReason.Pending, re.TopReason);
        Assert.Equal(1, (await s.DetractorsAsync(Cx, ProductId.Af, Measure.Nps, null, null, null, null)).Value!.Total);
        Assert.Equal(1, (await s.DetractorsAsync(Cx, null, Measure.Nps, EnvId.Auh, null, null, null)).Value!.Total);
    }

    [Fact]
    public async Task A_reason_filter_narrows_the_rows_but_not_the_breakdowns_and_the_window_limits_by_days()
    {
        var (s, c) = Make();
        await s.RecordAsync(Cx, D(c.Now.AddDays(-5), "a", comment: "The price changed after I agreed."));
        await s.RecordAsync(Cx, D(c.Now.AddDays(-5), "b", comment: "Nobody called back after the viewing."));
        await s.RecordAsync(Cx, D(c.Now.AddDays(-200), "old", comment: "Nobody called back after the viewing."));
        var all = (await s.DetractorsAsync(Cx, null, Measure.Nps, null, null, DetractorReason.Price, null)).Value!;
        Assert.Single(all.Rows);
        Assert.Equal(3, all.Total);
        Assert.Equal(2, all.ByReason.Count);
        var ninety = (await s.DetractorsAsync(Cx, null, Measure.Nps, null, 90, null, null)).Value!;
        Assert.Equal(2, ninety.Total);
        Assert.Equal(Failure.Invalid, (await s.DetractorsAsync(Cx, null, Measure.Nps, null, 0, null, null)).Error);
        Assert.Equal(Failure.Forbidden, (await s.DetractorsAsync(Boss, null, Measure.Nps, null, null, null, null)).Error);
        Assert.Equal(Failure.Unauthenticated, (await s.DetractorsAsync(null, null, Measure.Nps, null, null, null, null)).Error);
    }

    [Fact]
    public async Task The_call_notes_of_the_re_survey_classify_a_detractor_that_was_pending_and_CX_can_set_the_reason()
    {
        var (s, c) = Make();
        var first = (await s.RecordAsync(Cx, D(c.Now.AddDays(-20), "a"))).Value!;
        Assert.Equal(DetractorReason.Pending, first.Reason);
        await s.RecordAsync(Cx, D(c.Now.AddDays(-9), "a", score: 8, re: first.Id, note: "Wrong unit area on the contract."));
        var after = (await s.DetractorsAsync(Cx, null, Measure.Nps, null, null, null, null)).Value!;
        Assert.Equal(DetractorReason.Knowledge, after.Rows.Single().Answer.Reason);
        Assert.Equal(Failure.Forbidden, (await s.SetReasonAsync(Boss, first.Id, DetractorReason.Price)).Error);
        Assert.Equal(DetractorReason.Price, (await s.SetReasonAsync(Cx, first.Id, DetractorReason.Price)).Value!.Reason);
        Assert.Equal(Failure.NotFound, (await s.SetReasonAsync(Cx, "sr-99", DetractorReason.Price)).Error);
        var promoter = (await s.RecordAsync(Cx, D(c.Now.AddDays(-3), "p", score: 10))).Value!;
        Assert.Equal(Failure.Invalid, (await s.SetReasonAsync(Cx, promoter.Id, DetractorReason.Price)).Error);
    }

    [Fact]
    public async Task The_recovery_report_follows_the_product_line_so_Real_Estate_includes_After_Sales()
    {
        var (s, c) = Make();
        var af = (await s.RecordAsync(Cx, D(c.Now.AddDays(-20), "x", p: ProductId.Af))).Value!;
        await s.RecordAsync(Cx, D(c.Now.AddDays(-9), "x", score: 9, p: ProductId.Af, re: af.Id, note: "Fixed"));
        Assert.Equal(1, (await s.RecoveryAsync(Cx, ProductId.Re, null, null, null)).Value!.Recovered);
        Assert.Equal(1, (await s.RecoveryAsync(Cx, ProductId.Af, null, null, null)).Value!.Recovered);
    }
}

public class SurveySetsSettingTests
{
    private static readonly Actor Mgr = new("u-cx", "cx@psi.sample", Cxmgr);

    private static SettingsService Make()
    {
        var clock = new FakeClock(new DateTimeOffset(2026, 11, 26, 8, 0, 0, TimeSpan.Zero));
        return new SettingsService(new InMemorySettingsStore(), new AuditService(new InMemoryAuditStore(), clock), clock, [new SurveySetsValidator()]);
    }

    private static JsonElement J(string json) => JsonDocument.Parse(json).RootElement.Clone();

    private static string Set(string id, string questions = "[{\"en\":\"Score 0 to 10\",\"ar\":\"درجة\"}]", bool custom = false) =>
        $"{{\"id\":\"{id}\",\"product\":\"re\",\"name\":{{\"en\":\"N\",\"ar\":\"ن\"}},\"when\":{{\"en\":\"W\",\"ar\":\"و\"}},\"questions\":{questions}{(custom ? ",\"custom\":true" : "")}}}";

    [Fact]
    public async Task A_valid_list_of_sets_is_saved_and_a_broken_one_is_refused_with_the_reason()
    {
        var s = Make();
        Assert.True((await s.PutAsync(Mgr, SettingKeys.SurveySets, J($"[{Set("nps")},{Set("tx")}]"), 0, null)).IsOk);
        var bad = await s.PutAsync(Mgr, SettingKeys.SurveySets, J($"[{Set("nps")},{Set("nps")}]"), 1, null);
        Assert.Equal(Failure.Invalid, bad.Error);
        Assert.Equal("The set id 'nps' is used twice.", bad.Message);
        Assert.Equal(Failure.Invalid, (await s.PutAsync(Mgr, SettingKeys.SurveySets, J("{}"), 1, null)).Error);
        Assert.Equal(Failure.Invalid, (await s.PutAsync(Mgr, SettingKeys.SurveySets, J($"[{Set("x", "[{\"en\":\"a\",\"ar\":\"\"}]")}]"), 1, null)).Error);
        Assert.Equal(Failure.Invalid, (await s.PutAsync(Mgr, SettingKeys.SurveySets, J($"[{{\"id\":\"x\",\"product\":\"zz\",\"name\":{{\"en\":\"N\",\"ar\":\"ن\"}},\"when\":{{\"en\":\"W\",\"ar\":\"و\"}},\"questions\":[]}}]"), 1, null)).Error);
    }

    [Fact]
    public async Task A_core_set_stays_and_only_a_set_added_in_the_portal_can_be_deleted()
    {
        var s = Make();
        await s.PutAsync(Mgr, SettingKeys.SurveySets, J($"[{Set("nps")},{Set("c-1", custom: true)},{Set("other")}]"), 0, null);
        var core = await s.PutAsync(Mgr, SettingKeys.SurveySets, J($"[{Set("c-1", custom: true)},{Set("other")}]"), 1, null);
        Assert.Equal(Failure.Invalid, core.Error);
        Assert.Contains("nps", core.Message!);
        var notCustom = await s.PutAsync(Mgr, SettingKeys.SurveySets, J($"[{Set("nps")},{Set("c-1", custom: true)}]"), 1, null);
        Assert.Equal(Failure.Invalid, notCustom.Error);
        Assert.True((await s.PutAsync(Mgr, SettingKeys.SurveySets, J($"[{Set("nps")},{Set("other")}]"), 1, null)).IsOk);
    }

    [Fact]
    public async Task A_jump_backwards_in_a_set_is_refused_and_other_settings_are_not_checked()
    {
        var s = Make();
        var loop = "[{\"en\":\"a\",\"ar\":\"أ\",\"next\":{\"routes\":[],\"otherwise\":0}},{\"en\":\"b\",\"ar\":\"ب\"}]";
        Assert.Equal(Failure.Invalid, (await s.PutAsync(Mgr, SettingKeys.SurveySets, J($"[{Set("nps", loop)}]"), 0, null)).Error);
        var fwd = "[{\"en\":\"a\",\"ar\":\"أ\",\"next\":{\"routes\":[],\"otherwise\":1}},{\"en\":\"b\",\"ar\":\"ب\"}]";
        Assert.True((await s.PutAsync(Mgr, SettingKeys.SurveySets, J($"[{Set("nps", fwd)}]"), 0, null)).IsOk);
        Assert.True((await s.PutAsync(Mgr, SettingKeys.Rules, J("{\"anything\":1}"), 0, null)).IsOk);
    }
}
