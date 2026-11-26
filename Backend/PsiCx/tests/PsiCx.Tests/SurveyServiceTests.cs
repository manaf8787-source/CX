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

    private static RecordResponse R(DateTimeOffset at, int score = 9, Measure m = Measure.Nps, ProductId p = ProductId.Re, EnvId e = EnvId.Dub, string person = "p-1", ChannelId c = ChannelId.Whatsapp, int? scale = null, string? re = null)
        => new(person, p, e, m, score, scale, c, at, re);

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
        Assert.Equal(4, all.Nps!.Responses);
        Assert.Equal(50, all.Nps.Score);
        Assert.Equal(100, all.Csat.Pct);
        Assert.Null(all.Ces.Pct);
        var dub = (await s.IndicatorsAsync(Cx, ProductId.Re, EnvId.Dub, null, null)).Value!;
        Assert.Equal(3, dub.Nps!.Responses);
        // Environment management does not open the CX indicators page at all.
        Assert.Equal(Failure.Forbidden, (await s.IndicatorsAsync(EnvDubai, ProductId.Re, EnvId.Auh, null, null)).Error);
        Assert.Equal(1, (await s.IndicatorsAsync(Cx, ProductId.Af, null, null, null)).Value!.Nps!.Responses);
        Assert.Null((await s.IndicatorsAsync(Cx, ProductId.Ev, null, null, null)).Value!.Nps);
        Assert.Equal(Failure.Forbidden, (await s.IndicatorsAsync(new Actor("u-s", "s@psi.sample", Shopper), ProductId.Re, null, null, null)).Error);
    }

    [Fact]
    public async Task A_re_survey_gives_the_recovery_delta_and_is_not_counted_as_an_indicator_answer()
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
        Assert.Equal(1, ind.Nps!.Responses);
        Assert.Equal(5.0, ind.AverageRecoveryDelta);
        Assert.Equal(1, ind.ReSurveys);
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
