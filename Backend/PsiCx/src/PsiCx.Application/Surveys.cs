using System.Text.Json;
using PsiCx.Domain;
using PsiCx.Rules;
using PsiCx.Rules.Access;

namespace PsiCx.Application;

/// <summary>Checks a setting's value before it becomes a version. Returns a message, or null when the value is fine.</summary>
public interface ISettingValidator
{
    bool Handles(string key);
    string? Validate(JsonElement value, JsonElement? previous);
}

/// <summary>
/// The survey sets (CX manager edits them, 22 Nov). A set has a product, an id, a name and a moment in both languages, and questions; the
/// measurement sets that feed the indicators can never be removed, and only a set added in the portal can be deleted.
/// </summary>
public sealed class SurveySetsValidator : ISettingValidator
{
    public static readonly IReadOnlyList<string> CoreSetIds = ["nps", "tx", "ces", "re2"];

    public bool Handles(string key) => key == SettingKeys.SurveySets;

    public string? Validate(JsonElement value, JsonElement? previous)
    {
        if (value.ValueKind != JsonValueKind.Array) return "The survey sets are a list.";
        var ids = new HashSet<string>();
        foreach (var set in value.EnumerateArray())
        {
            if (set.ValueKind != JsonValueKind.Object) return "Every set is an object.";
            var id = Str(set, "id");
            if (id is null) return "Every set needs an id.";
            if (!ids.Add(id)) return $"The set id '{id}' is used twice.";
            if (!Enum.TryParse<ProductId>(Str(set, "product"), ignoreCase: true, out _)) return $"Set '{id}' needs one of the products.";
            if (!Bilingual(set, "name") || !Bilingual(set, "when")) return $"Set '{id}' needs a name and a moment in English and Arabic.";
            if (!set.TryGetProperty("questions", out var qs) || qs.ValueKind != JsonValueKind.Array) return $"Set '{id}' needs its questions.";
            var problems = SurveyLogic.Problems(qs.EnumerateArray().Select(ReadQuestion).ToList());
            if (problems.Count > 0) return $"Set '{id}': {problems[0]}";
        }
        foreach (var core in CoreSetIds)
            if (previous is { ValueKind: JsonValueKind.Array } prev && Has(prev, core) && !ids.Contains(core)) return $"The measurement set '{core}' feeds the indicators and cannot be removed.";
        if (previous is { ValueKind: JsonValueKind.Array } p)
            foreach (var old in p.EnumerateArray())
            {
                var oid = Str(old, "id");
                var custom = old.TryGetProperty("custom", out var c) && c.ValueKind == JsonValueKind.True;
                if (oid is not null && !custom && !ids.Contains(oid)) return $"Set '{oid}' is not one you added, so it cannot be deleted.";
            }
        return null;
    }

    private static bool Has(JsonElement arr, string id) => arr.EnumerateArray().Any(s => Str(s, "id") == id);

    private static string? Str(JsonElement o, string name) =>
        o.ValueKind == JsonValueKind.Object && o.TryGetProperty(name, out var v) && v.ValueKind == JsonValueKind.String && !string.IsNullOrWhiteSpace(v.GetString()) ? v.GetString() : null;

    private static bool Bilingual(JsonElement o, string name) => o.TryGetProperty(name, out var b) && Str(b, "en") is not null && Str(b, "ar") is not null;

    internal static SurveyQuestion ReadQuestion(JsonElement q)
    {
        var choices = q.TryGetProperty("choices", out var ch) && ch.ValueKind == JsonValueKind.Array
            ? ch.EnumerateArray().Select(c => new Bi(c.TryGetProperty("en", out var e) ? e.GetString() ?? "" : "", c.TryGetProperty("ar", out var a) ? a.GetString() ?? "" : "")).ToList()
            : null;
        SurveyRouting? next = null;
        if (q.TryGetProperty("next", out var n) && n.ValueKind == JsonValueKind.Object)
        {
            var routes = n.TryGetProperty("routes", out var rs) && rs.ValueKind == JsonValueKind.Array
                ? rs.EnumerateArray().Select(r => new SurveyRoute(
                    Str(r, "op") switch { "atLeast" => RouteOp.AtLeast, "atMost" => RouteOp.AtMost, _ => RouteOp.Is },
                    r.TryGetProperty("value", out var v) ? v.ToString() : "",
                    Target(r.TryGetProperty("to", out var t) ? t : default))).ToList()
                : [];
            next = new SurveyRouting(routes, Target(n.TryGetProperty("otherwise", out var o) ? o : default));
        }
        return new SurveyQuestion(Str(q, "en") ?? "", Str(q, "ar") ?? "", Str(q, "kind"), choices, next);
    }

    private static RouteTarget Target(JsonElement t) => t.ValueKind switch
    {
        JsonValueKind.Number when t.TryGetInt32(out var i) => RouteTarget.At(i),
        JsonValueKind.String when t.GetString() == "end" => RouteTarget.Finish,
        _ => RouteTarget.Next,
    };
}

public interface ISurveyResponseStore
{
    Task<SurveyResponse> AddAsync(Func<string, SurveyResponse> build, CancellationToken ct = default);
    Task<SurveyResponse?> GetAsync(string id, CancellationToken ct = default);
    Task<IReadOnlyList<SurveyResponse>> ListAsync(CancellationToken ct = default);
    Task<bool> TryReplaceAsync(SurveyResponse next, CancellationToken ct = default);
}

public sealed record RecordResponse(
    string PersonId, ProductId Product, EnvId EnvId, Measure Measure, int Score, int? Scale, ChannelId Source, DateTimeOffset At, string? ReSurveyOf,
    ReachedVia Via = ReachedVia.None, string? Note = null,
    string? Comment = null, Bi? Touchpoint = null, bool Digital = false, string? HandledBy = null, string? Unit = null, Bi? Moment = null,
    /// <summary>The Classification agent's (or CX's) reason; when empty it is worked out from the comment, the touchpoint and the call notes.</summary>
    DetractorReason? Reason = null,
    /// <summary>The close-the-loop call is still to be made, so a detractor with no other clue is "pending", not "other".</summary>
    bool CallPending = true,
    string? CallId = null, CallResult? CallResult = null, CallDirection? CallDirection = null, CallHandler? CallHandler = null, string? Script = null, int? QaScore = null);

public sealed record ProductIndicators(
    ProductId Product, EnvId? Env,
    NpsResult? Nps, SharePct Csat, SharePct Ces,
    /// <summary>Average recovery delta of the re-surveys in scope; null when there are none.</summary>
    double? AverageRecoveryDelta, int ReSurveys);

public sealed record Tally<TKey>(TKey Key, int Count);

/// <summary>The Detractor analysis: every detractor in scope, why, and the breakdowns. The breakdowns ignore the reason filters so a click on a bar keeps them readable.</summary>
public sealed record DetractorAnalysis(
    int Total, int ToCall, DetractorReason? TopReason,
    IReadOnlyList<Tally<DetractorTheme>> ByTheme, IReadOnlyList<Tally<DetractorReason>> ByReason,
    IReadOnlyList<Tally<string>> ByTouchpoint, IReadOnlyList<Tally<EnvId>> ByEnvironment,
    IReadOnlyList<DetractorLine> Rows);

public sealed record DetractorLine(SurveyResponse Answer, DetractorTheme Theme);

public sealed record RecoveryPerson(string PersonId, ProductId Product, EnvId EnvId, Measure Measure, int FirstScore, int SecondScore, int Delta, bool Recovered, ReachedVia Via, string? Note, DateTimeOffset FirstAt, DateTimeOffset ReSurveyedAt);
/// <summary>Where the re-surveyed people ended: out of detractor, better but still detractor, same, worse.</summary>
public sealed record RecoveryMovement(int NoLongerDetractor, int BetterStillDetractor, int Same, int Worse);
/// <summary>The indicators with the first ratings (Before) and with the re-survey ratings in their place (After). Mixed products: pass a product for a real line.</summary>
public sealed record RecoveryIndicators(NpsResult NpsBefore, NpsResult NpsAfter, SharePct CsatBefore, SharePct CsatAfter);
public sealed record RecoveryReport(int DetractorsBefore, int ReSurveyed, int DetractorsAfter, int Recovered, int NotYetReSurveyed, double? AverageDelta, RecoveryMovement Movement, IReadOnlyList<RecoveryPerson> People, RecoveryIndicators Indicators);

/// <summary>Survey answers and the indicators computed from them. Each product is its own line; there is no group NPS.</summary>
public sealed class SurveyService(ISurveyResponseStore store, IClock clock)
{
    /// <summary>Answers come from the survey channels. CX records one by hand (a call survey, a paper form) until the channels feed them. [Proposed]</summary>
    public async Task<ServiceResult<SurveyResponse>> RecordAsync(Actor? actor, RecordResponse r, CancellationToken ct = default)
    {
        if (actor is null) return ServiceResult<SurveyResponse>.Fail(Failure.Unauthenticated, "Sign in first.");
        if (actor.Role is not (RoleId.Cxmgr or RoleId.Cxteam)) return ServiceResult<SurveyResponse>.Fail(Failure.Forbidden, "Only CX records a survey answer by hand.");
        if (string.IsNullOrWhiteSpace(r.PersonId)) return Invalid("An unidentified customer is never surveyed.");
        if (SurveyRules.IsPublicChannel(r.Source)) return Invalid("Public channels are never surveyed.");
        if (r.At > clock.UtcNow.AddMinutes(5)) return Invalid("An answer cannot be in the future.");
        if (r.Measure == Measure.Nps && !SurveyRules.ProductHasNps(r.Product)) return Invalid("This product has no NPS.");
        var scale = r.Measure switch { Measure.Nps => 10, Measure.Csat => 5, _ => r.Scale ?? 7 };
        if (r.Measure == Measure.Ces && scale is not (5 or 7)) return Invalid("CES is on a scale of 1 to 5 or 1 to 7.");
        var low = r.Measure == Measure.Nps ? 0 : 1;
        if (r.Score < low || r.Score > scale) return Invalid($"A {r.Measure.ToString().ToUpperInvariant()} score is {low} to {scale}.");

        int? delta = null;
        if (r.ReSurveyOf is not null)
        {
            var first = await store.GetAsync(r.ReSurveyOf, ct);
            if (first is null) return ServiceResult<SurveyResponse>.Fail(Failure.NotFound, "The first answer was not found.");
            if (first.ReSurveyOf is not null) return Invalid("A re-survey follows a first answer, not another re-survey.");
            if (first.PersonId != r.PersonId || first.Measure != r.Measure || first.Product != r.Product) return Invalid("A re-survey asks the same person the same measure on the same product.");
            if (r.At <= first.At) return Invalid("A re-survey comes after the first answer.");
            delta = Indicators.RecoveryDelta(first.Score, r.Score);
        }
        var first1 = r.ReSurveyOf is null;
        // a first answer that is a detractor gets a reason; a re-survey does not (it is the follow-up, not a new complaint)
        DetractorReason? reason = first1 && IsDetractor(r.Measure, r.Score)
            ? r.Reason ?? DetractorReasons.Classify(r.Comment, null, r.Digital, r.Touchpoint is { } tp && IsMaintenance(tp), r.CallPending)
            : null;
        var saved = await store.AddAsync(id => new SurveyResponse(id, r.PersonId, r.Product, r.EnvId, r.Measure, r.Score, scale, r.Source, r.At, r.ReSurveyOf, delta,
            first1 ? ReachedVia.None : r.Via, first1 ? null : r.Note?.Trim(),
            r.Comment?.Trim(), r.Touchpoint, r.Digital, r.HandledBy, r.Unit, r.Moment, reason,
            r.CallId, r.CallResult, r.CallDirection, r.CallHandler, r.Script, r.QaScore), ct);
        // the call notes of the re-survey tell why, when the answer itself did not
        if (!first1 && !string.IsNullOrWhiteSpace(r.Note))
        {
            var firstAnswer = await store.GetAsync(r.ReSurveyOf!, ct);
            if (firstAnswer is { Reason: null or DetractorReason.Pending } && IsDetractor(firstAnswer.Measure, firstAnswer.Score))
                await store.TryReplaceAsync(firstAnswer with { Reason = DetractorReasons.Classify(firstAnswer.Comment, r.Note, firstAnswer.Digital, firstAnswer.Touchpoint is { } t2 && IsMaintenance(t2), callPending: false) }, ct);
        }
        return ServiceResult<SurveyResponse>.Ok(saved);
    }

    /// <summary>One product's indicators in the environment scope. A re-survey replaces the first rating of that person (the latest re-survey wins); the first one is no longer counted. 26 Nov, owner.</summary>
    public async Task<ServiceResult<ProductIndicators>> IndicatorsAsync(Actor? actor, ProductId product, EnvId? env, DateTimeOffset? from, DateTimeOffset? to, CancellationToken ct = default)
    {
        if (actor is null) return ServiceResult<ProductIndicators>.Fail(Failure.Unauthenticated, "Sign in first.");
        if (!PageAccess.CanAccessPath(actor.Role, "/overview")) return ServiceResult<ProductIndicators>.Fail(Failure.Forbidden, "The CX indicators are not open to this role.");
        var scope = EnvAccess.Effective(actor, env);
        if (!scope.IsOk) return ServiceResult<ProductIndicators>.Fail(scope.Error!.Value, scope.Message!);
        var line = SurveyRules.IndicatorScope(product);
        var rows = (await store.ListAsync(ct))
            .Where(x => line.Contains(x.Product) && scope.Value.Includes(x.EnvId) && (from is null || x.At >= from) && (to is null || x.At <= to)).ToList();
        // 26 Nov (owner): a re-survey REPLACES the first rating, so the indicators count the effective score of each answer.
        var first = Effective(rows);
        var re = rows.Where(x => x.RecoveryDelta is not null).ToList();
        return ServiceResult<ProductIndicators>.Ok(new ProductIndicators(
            product, scope.Value.Env,
            SurveyRules.ProductHasNps(product) ? Indicators.Nps(first.Where(x => x.Measure == Measure.Nps).Select(x => x.Score).ToList()) : null,
            Indicators.Csat(first.Where(x => x.Measure == Measure.Csat).Select(x => x.Score).ToList()),
            // CES on a 1 to 5 and a 1 to 7 scale are different questions: the indicator takes the 1 to 7 ones, the 1 to 5 ones when there are no others.
            CesOf(first),
            re.Count == 0 ? null : Math.Round(re.Average(x => x.RecoveryDelta!.Value), 1), re.Count));
    }

    /// <summary>The answers that count: each first answer, with its score swapped for the latest re-survey's when there is one.</summary>
    internal static List<SurveyResponse> Effective(IEnumerable<SurveyResponse> rows)
    {
        var list = rows.ToList();
        var latest = list.Where(x => x.ReSurveyOf is not null).GroupBy(x => x.ReSurveyOf!).ToDictionary(g => g.Key, g => g.OrderByDescending(x => x.At).First());
        return list.Where(x => x.ReSurveyOf is null).Select(x => latest.TryGetValue(x.Id, out var re) ? x with { Score = re.Score, Scale = re.Scale } : x).ToList();
    }

    private static bool IsMaintenance(Bi touchpoint) => touchpoint.En.Contains("maintenance", StringComparison.OrdinalIgnoreCase);

    internal static bool IsDetractor(Measure m, int score) => m switch { Measure.Nps => score <= 6, _ => score <= 2 };

    /// <summary>
    /// The recovery results page: detractors before and after the re-survey, how they moved, and each person with the call notes.
    /// "Before" = every first answer that was a detractor in scope; "after" = the same people with the re-survey in place of the first rating.
    /// </summary>
    public async Task<ServiceResult<RecoveryReport>> RecoveryAsync(Actor? actor, ProductId? product, Measure? measure, ReachedVia? via, EnvId? env, CancellationToken ct = default)
    {
        if (actor is null) return ServiceResult<RecoveryReport>.Fail(Failure.Unauthenticated, "Sign in first.");
        if (actor.Role is not (RoleId.Cxmgr or RoleId.Cxteam)) return ServiceResult<RecoveryReport>.Fail(Failure.Forbidden, "The recovery results, with the call notes, are read by CX only.");
        var scope = EnvAccess.Effective(actor, env);
        if (!scope.IsOk) return ServiceResult<RecoveryReport>.Fail(scope.Error!.Value, scope.Message!);
        var all = (await store.ListAsync(ct)).Where(x => scope.Value.Includes(x.EnvId) && (product is null || SurveyRules.IndicatorScope(product.Value).Contains(x.Product)) && (measure is null || x.Measure == measure)).ToList();
        var latest = all.Where(x => x.ReSurveyOf is not null).GroupBy(x => x.ReSurveyOf!).ToDictionary(g => g.Key, g => g.OrderByDescending(x => x.At).First());
        var detractors = all.Where(x => x.ReSurveyOf is null && IsDetractor(x.Measure, x.Score)).ToList();
        var people = detractors.Where(d => latest.ContainsKey(d.Id)).Select(d =>
        {
            var re = latest[d.Id];
            return new RecoveryPerson(d.PersonId, d.Product, d.EnvId, d.Measure, d.Score, re.Score, re.Score - d.Score, !IsDetractor(re.Measure, re.Score), re.Via, re.Note, d.At, re.At);
        }).Where(p => via is null || p.Via == via).OrderByDescending(p => p.ReSurveyedAt).ToList();
        var before = detractors.Count;
        var recovered = people.Count(p => p.Recovered);
        // The "how reached" filter narrows the people; the headline counts follow it too, so a filtered view stays consistent.
        var scopedBefore = via is null ? before : people.Count;
        var reSurveyed = people.Count;
        var after = via is null ? before - recovered : people.Count - recovered;
        var moves = new RecoveryMovement(
            people.Count(p => p.Recovered), people.Count(p => !p.Recovered && p.Delta > 0), people.Count(p => p.Delta == 0), people.Count(p => p.Delta < 0));
        var effective = Effective(all);
        var baseline = all.Where(x => x.ReSurveyOf is null).ToList();
        return ServiceResult<RecoveryReport>.Ok(new RecoveryReport(
            scopedBefore, reSurveyed, after, recovered, scopedBefore - reSurveyed,
            people.Count == 0 ? null : Math.Round(people.Average(p => p.Delta), 1),
            moves, people,
            new RecoveryIndicators(
                Indicators.Nps(baseline.Where(x => x.Measure == Measure.Nps).Select(x => x.Score).ToList()),
                Indicators.Nps(effective.Where(x => x.Measure == Measure.Nps).Select(x => x.Score).ToList()),
                Indicators.Csat(baseline.Where(x => x.Measure == Measure.Csat).Select(x => x.Score).ToList()),
                Indicators.Csat(effective.Where(x => x.Measure == Measure.Csat).Select(x => x.Score).ToList()))));
    }

    /// <summary>
    /// Detractors in scope (a first answer that is a detractor on the measure; NPS by default), with the reason each one has. `days` limits to the
    /// last N days (the daily brief reads 90). The product scope follows the indicator line, so PSI Real Estate includes After-Sales. CX only.
    /// </summary>
    public async Task<ServiceResult<DetractorAnalysis>> DetractorsAsync(Actor? actor, ProductId? product, Measure measure, EnvId? env, int? days, DetractorReason? reason, DetractorTheme? theme, CancellationToken ct = default)
    {
        if (actor is null) return ServiceResult<DetractorAnalysis>.Fail(Failure.Unauthenticated, "Sign in first.");
        if (actor.Role is not (RoleId.Cxmgr or RoleId.Cxteam)) return ServiceResult<DetractorAnalysis>.Fail(Failure.Forbidden, "Detractor analysis, with names and comments, is read by CX only.");
        if (days is < 1) return ServiceResult<DetractorAnalysis>.Fail(Failure.Invalid, "The window is at least one day.");
        var scope = EnvAccess.Effective(actor, env);
        if (!scope.IsOk) return ServiceResult<DetractorAnalysis>.Fail(scope.Error!.Value, scope.Message!);
        var since = days is { } d ? clock.UtcNow.AddDays(-d) : (DateTimeOffset?)null;
        var line = product is null ? null : SurveyRules.IndicatorScope(product.Value);
        var inScope = (await store.ListAsync(ct))
            .Where(x => x.ReSurveyOf is null && x.Measure == measure && IsDetractor(x.Measure, x.Score) && scope.Value.Includes(x.EnvId)
                        && (line is null || line.Contains(x.Product)) && (since is null || x.At >= since)).ToList();
        DetractorReason Of(SurveyResponse x) => x.Reason ?? DetractorReason.Pending;
        var rows = inScope.Where(x => (reason is null || Of(x) == reason) && (theme is null || DetractorReasons.ThemeOf(Of(x)) == theme))
            .OrderByDescending(x => x.At).Select(x => new DetractorLine(x, DetractorReasons.ThemeOf(Of(x)))).ToList();
        var byReason = inScope.GroupBy(Of).Select(g => new Tally<DetractorReason>(g.Key, g.Count())).OrderByDescending(t => t.Count).ThenBy(t => t.Key).ToList();
        return ServiceResult<DetractorAnalysis>.Ok(new DetractorAnalysis(
            inScope.Count, inScope.Count(x => Of(x) == DetractorReason.Pending),
            // the top reason is a real one: "not classified yet" is not a reason
            byReason.Where(t => t.Key != DetractorReason.Pending).Select(t => (DetractorReason?)t.Key).FirstOrDefault(),
            inScope.GroupBy(x => DetractorReasons.ThemeOf(Of(x))).Select(g => new Tally<DetractorTheme>(g.Key, g.Count())).OrderByDescending(t => t.Count).ToList(),
            byReason,
            inScope.Where(x => x.Touchpoint is not null).GroupBy(x => x.Touchpoint!.En).Select(g => new Tally<string>(g.Key, g.Count())).OrderByDescending(t => t.Count).ToList(),
            inScope.GroupBy(x => x.EnvId).Select(g => new Tally<EnvId>(g.Key, g.Count())).OrderByDescending(t => t.Count).ToList(),
            rows));
    }

    /// <summary>CX (or the Classification agent, later) sets the reason of a detractor, for example after the call.</summary>
    public async Task<ServiceResult<SurveyResponse>> SetReasonAsync(Actor? actor, string id, DetractorReason reason, CancellationToken ct = default)
    {
        if (actor is null) return ServiceResult<SurveyResponse>.Fail(Failure.Unauthenticated, "Sign in first.");
        if (actor.Role is not (RoleId.Cxmgr or RoleId.Cxteam)) return ServiceResult<SurveyResponse>.Fail(Failure.Forbidden, "Only CX sets the reason of a detractor.");
        var x = await store.GetAsync(id, ct);
        if (x is null) return ServiceResult<SurveyResponse>.Fail(Failure.NotFound, "The answer was not found.");
        if (x.ReSurveyOf is not null || !IsDetractor(x.Measure, x.Score)) return Invalid("Only a detractor answer has a reason.");
        var next = x with { Reason = reason };
        return await store.TryReplaceAsync(next, ct) ? ServiceResult<SurveyResponse>.Ok(next) : ServiceResult<SurveyResponse>.Fail(Failure.NotFound, "The answer was not found.");
    }

    private static SharePct CesOf(List<SurveyResponse> first)
    {
        var ces = first.Where(x => x.Measure == Measure.Ces).ToList();
        var seven = ces.Where(x => x.Scale == 7).ToList();
        return seven.Count > 0 ? Indicators.Ces(seven.Select(x => x.Score).ToList(), 7) : Indicators.Ces(ces.Select(x => x.Score).ToList(), 5);
    }

    public async Task<ServiceResult<IReadOnlyList<SurveyResponse>>> ListAsync(Actor? actor, ProductId? product, EnvId? env, CancellationToken ct = default)
    {
        if (actor is null) return ServiceResult<IReadOnlyList<SurveyResponse>>.Fail(Failure.Unauthenticated, "Sign in first.");
        if (actor.Role is not (RoleId.Cxmgr or RoleId.Cxteam)) return ServiceResult<IReadOnlyList<SurveyResponse>>.Fail(Failure.Forbidden, "Answers by person are read by CX only.");
        var scope = EnvAccess.Effective(actor, env);
        if (!scope.IsOk) return ServiceResult<IReadOnlyList<SurveyResponse>>.Fail(scope.Error!.Value, scope.Message!);
        return ServiceResult<IReadOnlyList<SurveyResponse>>.Ok((await store.ListAsync(ct))
            .Where(x => (product is null || x.Product == product) && scope.Value.Includes(x.EnvId)).OrderByDescending(x => x.At).ToList());
    }

    private static ServiceResult<SurveyResponse> Invalid(string m) => ServiceResult<SurveyResponse>.Fail(Failure.Invalid, m);
}
