using System.Text.RegularExpressions;
using PsiCx.Domain;

namespace PsiCx.Rules;

public sealed record DetectOptions(int? WindowDays = null, DateTimeOffset? Now = null, PatternRules? Rules = null);

public enum WhatIfRule { SameIssueMin, SameAgentMin, WindowDays }

public sealed record WhatIfCell(int Value, int Patterns, bool IsCurrent);
public sealed record WhatIfRow(WhatIfRule Rule, int Current, IReadOnlyList<WhatIfCell> Cells);
public sealed record WhatIfResult(int Total, IReadOnlyList<WhatIfRow> Rows);

/// <summary>
/// Pattern detection (Rules and Definitions, Decision 1). Port of React-Frontend/src/utils/patterns.ts:
/// three independent rules, each producing its own patterns. Same issue 5+, same agent 3+, or one environment
/// carrying 50%+ of a category's signals when that category has the minimum sample (10).
/// Pattern ids are stable keys, so a fix stays attached to its pattern when a threshold changes.
/// The AI suggestion and recovery figure are the prototype's placeholder text; Agent 5 supplies the real ones.
/// </summary>
public static partial class PatternDetector
{
    public static readonly PatternRules Defaults = new();

    [GeneratedRegex("[^a-z0-9]+")]
    private static partial Regex NonSlug();

    public static string Slug(string s) => NonSlug().Replace(s.ToLowerInvariant(), "_").Trim('_');

    private static Bi RecoverySentence(int tried, int recovered)
    {
        var pct = (int)Math.Round(recovered / (double)tried * 100, MidpointRounding.AwayFromZero);
        return new Bi(
            $"Tried in {tried} similar closed cases, recovered in {recovered}, {recovered} of {tried} is {pct}%.",
            $"جُرّب في {tried} حالة مشابهة مغلقة، وتعافت {recovered} منها، أي {pct}%.");
    }

    public static IReadOnlyList<Pattern> Detect(IEnumerable<Signal> allSignals, DetectOptions? options = null)
    {
        options ??= new DetectOptions();
        var now = options.Now ?? DateTimeOffset.UtcNow;
        var r = options.Rules ?? Defaults;

        var signals = options.WindowDays is { } window
            ? allSignals.Where(s =>
              {
                  var age = now - s.OccurredAt;
                  return age >= TimeSpan.Zero && age <= TimeSpan.FromDays(window);
              }).ToList()
            : allSignals.ToList();

        var patterns = new List<Pattern>();

        foreach (var g in signals.GroupBy(s => s.Category))
        {
            var list = g.ToList();
            if (list.Count < r.SameIssueMin) continue;
            var key = $"same_issue:{Slug(g.Key)}";
            patterns.Add(new Pattern(
                key, key, "", list.Select(s => s.Id).ToList(),
                $"{list[0].Environment} team", g.Key, r.WindowDays, list.Count,
                new Bi($"Review {g.Key.Replace('_', ' ')} handling for this team.", "مراجعة طريقة التعامل مع هذا النمط لهذا الفريق."),
                RecoverySentence(list.Count + 4, list.Count),
                PatternThresholdKind.SameIssue, r.SameIssueMin, list.Count, null, list.Count >= r.MinimumSample));
        }

        foreach (var g in signals.Where(s => s.AgentRef is not null).GroupBy(s => s.AgentRef!))
        {
            var list = g.ToList();
            if (list.Count < r.SameAgentMin) continue;
            var key = $"same_agent:{Slug(g.Key)}";
            patterns.Add(new Pattern(
                key, key, "", list.Select(s => s.Id).ToList(),
                $"{list[0].Environment} team", list[0].Category, r.WindowDays, list.Count,
                new Bi("Coach this agent on the repeated issue before it becomes a team-wide pattern.", "تدريب هذا الوكيل على المشكلة المتكررة قبل أن تتحول لنمط عام للفريق."),
                RecoverySentence(list.Count + 6, Math.Max(1, list.Count - 1)),
                PatternThresholdKind.SameAgent, r.SameAgentMin, list.Count, g.Key, list.Count >= r.MinimumSample));
        }

        foreach (var cat in signals.GroupBy(s => s.Category))
        {
            var inCategory = cat.ToList();
            var total = inCategory.Count;
            if (total < r.MinimumSample) continue;
            foreach (var env in inCategory.GroupBy(s => s.Environment))
            {
                var list = env.ToList();
                var pct = list.Count / (double)total * 100;
                if (pct < r.EnvironmentConcentrationPct) continue;
                var key = $"environment_concentration:{Slug(cat.Key)}:{Slug(env.Key)}";
                patterns.Add(new Pattern(
                    key, key, "", list.Select(s => s.Id).ToList(),
                    $"{env.Key} team", cat.Key, r.WindowDays, total,
                    new Bi($"{env.Key} carries most of this category's signals — look at local process or environment causes first.",
                           $"بيئة {env.Key} تحمل معظم إشارات هذه الفئة — راجع العملية المحلية أو أسباب البيئة أولاً."),
                    RecoverySentence(total + 3, list.Count),
                    PatternThresholdKind.EnvironmentConcentration, r.EnvironmentConcentrationPct,
                    (int)Math.Round(pct, MidpointRounding.AwayFromZero), null, true));
            }
        }

        // Display ids PT-nnn: a hash of the stable key, probed so two patterns never share one.
        var ids = PatternTrace.Ids(patterns.Select(p => p.Key));
        return patterns.Select(p => p with { TraceId = ids[p.Key] }).ToList();
    }

    /// <summary>How many patterns there would be if one threshold alone were changed to each candidate value.</summary>
    public static WhatIfResult WhatIf(
        IReadOnlyList<Signal> signals,
        PatternRules rules,
        IReadOnlyDictionary<WhatIfRule, int[]> candidates,
        DateTimeOffset? now = null)
    {
        int Count(PatternRules r) => Detect(signals, new DetectOptions(r.WindowDays, now, r)).Count;
        PatternRules Over(WhatIfRule rule, int v) => rule switch
        {
            WhatIfRule.SameIssueMin => rules with { SameIssueMin = v },
            WhatIfRule.SameAgentMin => rules with { SameAgentMin = v },
            _ => rules with { WindowDays = v },
        };
        int Current(WhatIfRule rule) => rule switch
        {
            WhatIfRule.SameIssueMin => rules.SameIssueMin,
            WhatIfRule.SameAgentMin => rules.SameAgentMin,
            _ => rules.WindowDays,
        };

        var rows = candidates.Select(kv => new WhatIfRow(
            kv.Key, Current(kv.Key),
            kv.Value.Select(v => new WhatIfCell(v, Count(Over(kv.Key, v)), v == Current(kv.Key))).ToList())).ToList();
        return new WhatIfResult(Count(rules), rows);
    }

    /// <summary>How far a pattern is toward (or past) its rule: current value over the threshold.</summary>
    public static double ThresholdCloseness(Pattern p) => p.ThresholdTarget > 0 ? (double)p.CurrentValue / p.ThresholdTarget : 0;

    /// <summary>Furthest past the threshold first; patterns with the minimum sample before thin ones; then by id.</summary>
    public static IReadOnlyList<Pattern> SortByThresholdCloseness(IEnumerable<Pattern> patterns)
        => patterns
            .OrderByDescending(ThresholdCloseness)
            .ThenByDescending(p => p.HasMinimumSample)
            .ThenBy(p => p.Id, StringComparer.Ordinal)
            .ToList();
}
