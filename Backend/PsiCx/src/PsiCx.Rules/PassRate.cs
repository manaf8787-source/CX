using PsiCx.Domain;

namespace PsiCx.Rules;

/// <summary>One row of the weekly sample, reduced to what the pass-rate rule needs. Verdict: true = right, false = wrong, null = not read yet.</summary>
public sealed record SampleVerdict(string Id, int Agent, bool? Verdict, Bi Text, DateTime? JudgedAt = null);

public sealed record AgentPassRate(int Agent, int? Base, int? Current, int Sampled, int Wrong, int Tests);

public sealed record SupervisorTest(string Id, string FromSampleId, int Agent, Bi Text, DateTime CreatedAt);

/// <summary>
/// Port of React-Frontend/src/utils/passRate.ts. A "wrong" verdict in the weekly sample lowers that agent's pass rate and becomes a
/// supervisor test (decided 18 Nov). The formula is [Proposed]: current = round(base x (1 - wrong / sampled)), never below zero.
/// </summary>
public static class PassRate
{
    public static int? Compute(int? baseRate, int sampled, int wrong)
    {
        if (baseRate is null) return null;
        if (sampled <= 0 || wrong <= 0) return baseRate;
        var share = (double)Math.Min(wrong, sampled) / sampled;
        return Math.Max(0, (int)Math.Round(baseRate.Value * (1 - share), MidpointRounding.AwayFromZero));
    }

    /// <summary>Pass rate per agent that has outputs in the sample, sorted by agent number.</summary>
    public static IReadOnlyList<AgentPassRate> PerAgent(IEnumerable<SampleVerdict> sample, IReadOnlyDictionary<int, int?> baseRates)
    {
        var rows = sample.ToList();
        return rows.Select(r => r.Agent).Distinct().OrderBy(a => a).Select(agent =>
        {
            var mine = rows.Where(r => r.Agent == agent).ToList();
            var wrong = mine.Count(r => r.Verdict == false);
            baseRates.TryGetValue(agent, out var b);
            return new AgentPassRate(agent, b, Compute(b, mine.Count, wrong), mine.Count, wrong, wrong);
        }).ToList();
    }

    /// <summary>The supervisor test a wrong verdict becomes. Text carries no customer name.</summary>
    public static SupervisorTest TestFor(SampleVerdict item, DateTime at) =>
        new($"st-{item.Id}", item.Id, item.Agent, new Bi($"Catch this: {item.Text.En}", $"التقط هذا: {item.Text.Ar}"), at);

    /// <summary>
    /// The tests that should exist for this sample: one per wrong verdict. Existing tests are kept as they are (idempotent), tests whose
    /// verdict was changed back are dropped, new wrongs get a new test. Pure: returns the new list.
    /// </summary>
    public static IReadOnlyList<SupervisorTest> SyncTests(IEnumerable<SampleVerdict> sample, IEnumerable<SupervisorTest> existing, DateTime now)
    {
        var rows = sample.ToList();
        var wrongIds = rows.Where(r => r.Verdict == false).Select(r => r.Id).ToHashSet();
        var kept = existing.Where(t => wrongIds.Contains(t.FromSampleId)).ToList();
        foreach (var item in rows)
            if (item.Verdict == false && kept.All(t => t.FromSampleId != item.Id))
                kept.Add(TestFor(item, item.JudgedAt ?? now));
        return kept;
    }
}
