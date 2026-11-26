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
}

public sealed record RecordResponse(string PersonId, ProductId Product, EnvId EnvId, Measure Measure, int Score, int? Scale, ChannelId Source, DateTimeOffset At, string? ReSurveyOf);

public sealed record ProductIndicators(
    ProductId Product, EnvId? Env,
    NpsResult? Nps, SharePct Csat, SharePct Ces,
    /// <summary>Average recovery delta of the re-surveys in scope; null when there are none.</summary>
    double? AverageRecoveryDelta, int ReSurveys);

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
        var saved = await store.AddAsync(id => new SurveyResponse(id, r.PersonId, r.Product, r.EnvId, r.Measure, r.Score, scale, r.Source, r.At, r.ReSurveyOf, delta), ct);
        return ServiceResult<SurveyResponse>.Ok(saved);
    }

    /// <summary>One product's indicators in the environment scope. A re-survey is the recovery measure, not a fresh indicator answer, so it is not counted in NPS, CSAT or CES. [Proposed]</summary>
    public async Task<ServiceResult<ProductIndicators>> IndicatorsAsync(Actor? actor, ProductId product, EnvId? env, DateTimeOffset? from, DateTimeOffset? to, CancellationToken ct = default)
    {
        if (actor is null) return ServiceResult<ProductIndicators>.Fail(Failure.Unauthenticated, "Sign in first.");
        if (!PageAccess.CanAccessPath(actor.Role, "/overview")) return ServiceResult<ProductIndicators>.Fail(Failure.Forbidden, "The CX indicators are not open to this role.");
        var scope = EnvAccess.Effective(actor, env);
        if (!scope.IsOk) return ServiceResult<ProductIndicators>.Fail(scope.Error!.Value, scope.Message!);
        var rows = (await store.ListAsync(ct))
            .Where(x => x.Product == product && scope.Value.Includes(x.EnvId) && (from is null || x.At >= from) && (to is null || x.At <= to)).ToList();
        var first = rows.Where(x => x.ReSurveyOf is null).ToList();
        var re = rows.Where(x => x.RecoveryDelta is not null).ToList();
        return ServiceResult<ProductIndicators>.Ok(new ProductIndicators(
            product, scope.Value.Env,
            SurveyRules.ProductHasNps(product) ? Indicators.Nps(first.Where(x => x.Measure == Measure.Nps).Select(x => x.Score).ToList()) : null,
            Indicators.Csat(first.Where(x => x.Measure == Measure.Csat).Select(x => x.Score).ToList()),
            // CES on a 1 to 5 and a 1 to 7 scale are different questions: the indicator takes the 1 to 7 ones, the 1 to 5 ones when there are no others.
            CesOf(first),
            re.Count == 0 ? null : Math.Round(re.Average(x => x.RecoveryDelta!.Value), 1), re.Count));
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
