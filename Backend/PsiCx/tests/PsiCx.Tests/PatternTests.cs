using PsiCx.Domain;
using PsiCx.Rules;

namespace PsiCx.Tests;

// Cases ported from React-Frontend/src/utils/patterns.test.ts (the pure-rule ones; the sample-data tests stay in the frontend).
public class PatternTests
{
    private static readonly DateTimeOffset Now = DateTimeOffset.Parse("2026-11-17T12:00:00Z");
    private static DateTimeOffset DaysAgo(int d) => Now - TimeSpan.FromDays(d);
    private static int _seq;

    private static Signal Sig(
        string category = "slow_response", string environment = "Dubai", EnvId envId = EnvId.Dub,
        string? agentRef = null, DateTimeOffset? at = null)
        => new($"s{++_seq}", SignalKind.Complaint, ProductId.Re, environment, envId, category, at ?? DaysAgo(1), AgentRef: agentRef);

    private static List<Signal> Many(int n, string category = "slow_response", string environment = "Dubai",
        string? agentRef = null, DateTimeOffset? at = null)
        => Enumerable.Range(0, n).Select(_ => Sig(category, environment, EnvId.Dub, agentRef, at)).ToList();

    private static List<PatternThresholdKind> Kinds(IEnumerable<Signal> s, DetectOptions? o = null)
        => PatternDetector.Detect(s, o).Select(p => p.ThresholdKind).ToList();

    private static Pattern? Find(IEnumerable<Signal> s, PatternThresholdKind kind, DetectOptions? o = null)
        => PatternDetector.Detect(s, o).FirstOrDefault(p => p.ThresholdKind == kind);

    [Fact]
    public void Uses_the_documented_rule_values()
    {
        var d = PatternDetector.Defaults;
        Assert.Equal(5, d.SameIssueMin);
        Assert.Equal(3, d.SameAgentMin);
        Assert.Equal(50, d.EnvironmentConcentrationPct);
        Assert.Equal(10, d.MinimumSample);
        Assert.Equal(30, d.WindowDays);
    }

    [Fact]
    public void Same_issue_four_is_not_a_pattern_five_is()
    {
        Assert.False(Kinds(Many(4, "repeat_contact")).Contains(PatternThresholdKind.SameIssue));
        var all = PatternDetector.Detect(Many(5, "repeat_contact"));
        Assert.Equal(1, all.Count(x => x.ThresholdKind == PatternThresholdKind.SameIssue));
        Assert.Equal(5, all[0].CurrentValue);
        Assert.Equal(5, all[0].ThresholdTarget);
        Assert.False(all[0].HasMinimumSample);
    }

    [Fact]
    public void Same_agent_two_is_below_threshold_three_is_a_pattern()
    {
        var two = Many(2, "a", agentRef: "ag-1").Concat(Many(5, "b")).ToList();
        Assert.False(Kinds(two).Contains(PatternThresholdKind.SameAgent));
        var p = Find(Many(3, "x", agentRef: "ag-1"), PatternThresholdKind.SameAgent);
        Assert.Equal("ag-1", p!.AgentRef);
        Assert.Equal(3, p.CurrentValue);
        Assert.Equal(3, p.ThresholdTarget);
    }

    [Fact]
    public void Signals_without_an_agent_never_form_a_same_agent_pattern()
        => Assert.False(Kinds(Many(6, "c")).Contains(PatternThresholdKind.SameAgent));

    [Fact]
    public void Environment_concentration_needs_the_minimum_sample_of_ten()
    {
        Assert.False(Kinds(Many(9, "cat", "Abu Dhabi")).Contains(PatternThresholdKind.EnvironmentConcentration));
        var p = Find(Many(10, "cat", "Abu Dhabi"), PatternThresholdKind.EnvironmentConcentration);
        Assert.Equal(100, p!.CurrentValue);
        Assert.Equal(10, p.SampleSize);
        Assert.True(p.HasMinimumSample);
    }

    [Fact]
    public void Environment_concentration_exactly_fifty_percent_qualifies_under_does_not()
    {
        var half = Many(5, "k", "Dubai").Concat(Many(5, "k", "PSI Assets")).ToList();
        var teams = PatternDetector.Detect(half).Where(p => p.ThresholdKind == PatternThresholdKind.EnvironmentConcentration).Select(p => p.Team);
        Assert.Equal("Dubai team,PSI Assets team", string.Join(",", teams));
        var under = Many(4, "k", "Dubai").Concat(Many(3, "k", "PSI Assets")).Concat(Many(3, "k", "Abu Dhabi")).ToList();
        Assert.False(Kinds(under).Contains(PatternThresholdKind.EnvironmentConcentration));
    }

    [Fact]
    public void Reproduces_the_spec_example_seven_nobody_called_back()
    {
        var signals = Many(5, "no_callback", "Office A").Concat(Many(2, "no_callback", "Office B", "ag-9")).ToList();
        var p = PatternDetector.Detect(signals);
        Assert.Equal(7, p.First(x => x.ThresholdKind == PatternThresholdKind.SameIssue).CurrentValue);
        Assert.False(p.Any(x => x.ThresholdKind == PatternThresholdKind.SameAgent));
        // 7 is below the minimum sample of 10, so no concentration pattern is published yet.
        Assert.False(p.Any(x => x.ThresholdKind == PatternThresholdKind.EnvironmentConcentration));
    }

    [Fact]
    public void A_pattern_below_the_minimum_sample_is_flagged_for_investigation()
    {
        Assert.False(PatternDetector.Detect(Many(6, "z"))[0].HasMinimumSample);
        Assert.True(PatternDetector.Detect(Many(10, "z"))[0].HasMinimumSample);
    }

    [Fact]
    public void Rolling_window_when_applied_ignores_older_signals()
    {
        var signals = Many(3, "w", at: DaysAgo(10)).Concat(Many(3, "w", at: DaysAgo(45))).ToList();
        Assert.True(Kinds(signals).Contains(PatternThresholdKind.SameIssue));
        Assert.False(Kinds(signals, new DetectOptions(30, Now)).Contains(PatternThresholdKind.SameIssue));
        Assert.True(Kinds(Many(5, "e", at: DaysAgo(30)), new DetectOptions(30, Now)).Contains(PatternThresholdKind.SameIssue));
    }

    [Fact]
    public void Gives_every_pattern_a_unique_id_and_the_signals_that_formed_it()
    {
        var p = PatternDetector.Detect(Many(5, "q", agentRef: "ag-2").Concat(Many(5, "r", "Abu Dhabi")).ToList());
        Assert.Equal(p.Count, p.Select(x => x.Id).Distinct().Count());
        Assert.True(p.All(x => x.SignalIds.Count > 0));
    }

    [Fact]
    public void A_threshold_override_changes_what_counts()
    {
        Assert.False(Kinds(Many(3, "repeat_contact")).Contains(PatternThresholdKind.SameIssue));
        var p = Find(Many(3, "repeat_contact"), PatternThresholdKind.SameIssue, new DetectOptions(Rules: new PatternRules(SameIssueMin: 3)));
        Assert.Equal(3, p!.CurrentValue);
        Assert.Equal(3, p.ThresholdTarget);
    }

    [Fact]
    public void The_other_rules_are_overridable_too()
    {
        var agent = Many(2, "a", agentRef: "ag-7");
        Assert.False(Kinds(agent).Contains(PatternThresholdKind.SameAgent));
        Assert.True(Kinds(agent, new DetectOptions(Rules: new PatternRules(SameAgentMin: 2))).Contains(PatternThresholdKind.SameAgent));
        var small = Many(6, "z");
        Assert.True(PatternDetector.Detect(small, new DetectOptions(Rules: new PatternRules(MinimumSample: 5)))[0].HasMinimumSample);
        Assert.Equal(45, PatternDetector.Detect(small, new DetectOptions(Rules: new PatternRules(WindowDays: 45)))[0].WindowDays);
        var mixed = Many(6, "c", "Dubai").Concat(Many(4, "c", "PSI Assets")).ToList();
        var teams = PatternDetector.Detect(mixed, new DetectOptions(Rules: new PatternRules(EnvironmentConcentrationPct: 60)))
            .Where(p => p.ThresholdKind == PatternThresholdKind.EnvironmentConcentration).Select(p => p.Team);
        Assert.Equal("Dubai team", string.Join(",", teams));
    }

    [Fact]
    public void A_pattern_keeps_its_id_and_key_when_other_signals_change()
    {
        var baseSignals = Many(5, "slow_response");
        var before = Find(baseSignals, PatternThresholdKind.SameIssue)!;
        var more = baseSignals.Concat(Many(6, "wrong_language")).Append(Sig("slow_response")).ToList();
        var after = PatternDetector.Detect(more).First(p => p.ThresholdKind == PatternThresholdKind.SameIssue && p.Category == "slow_response");
        Assert.Equal(before.Id, after.Id);
        Assert.Equal(before.Key, after.Id);
        Assert.Equal("same_issue:slow_response", before.Id);
        Assert.True(System.Text.RegularExpressions.Regex.IsMatch(after.TraceId, @"^PT-\d{3}$"));
    }

    [Fact]
    public void Names_keys_by_kind()
    {
        var p = PatternDetector.Detect(Many(5, "q", agentRef: "Agent 3").Concat(Many(10, "r", "Abu Dhabi")).ToList());
        var keys = p.Select(x => x.Key).ToList();
        Assert.True(keys.Contains("same_issue:q"));
        Assert.True(keys.Contains("same_agent:agent_3"));
        Assert.True(keys.Contains("environment_concentration:r:abu_dhabi"));
        Assert.Equal(p.Count, p.Select(x => x.TraceId).Distinct().Count());
    }

    [Fact]
    public void What_if_counts_the_patterns_with_one_threshold_changed()
    {
        var signals = Many(4, "a", at: DaysAgo(5)).Concat(Many(6, "b", at: DaysAgo(40))).Concat(Many(3, "c", agentRef: "ag-1", at: DaysAgo(2))).ToList();
        var candidates = new Dictionary<WhatIfRule, int[]>
        {
            [WhatIfRule.SameIssueMin] = [3, 4, 5, 6],
            [WhatIfRule.SameAgentMin] = [2, 3, 4],
            [WhatIfRule.WindowDays] = [14, 30, 45, 60],
        };
        var o = PatternDetector.WhatIf(signals, PatternDetector.Defaults, candidates, Now);
        Assert.Equal(1, o.Total);
        string Row(WhatIfRule r) => string.Join(",", o.Rows.First(x => x.Rule == r).Cells.Select(c => c.Patterns));
        Assert.Equal("3,2,1,1", Row(WhatIfRule.SameIssueMin));
        Assert.Equal(5, o.Rows.First(x => x.Rule == WhatIfRule.SameIssueMin).Cells.First(c => c.IsCurrent).Value);
        Assert.Equal("1,1,0", Row(WhatIfRule.SameAgentMin));
        Assert.Equal("1,1,2,2", Row(WhatIfRule.WindowDays));
        Assert.Equal(30, o.Rows.First(x => x.Rule == WhatIfRule.WindowDays).Current);
    }

    [Fact]
    public void Slug_matches_the_frontend()
    {
        Assert.Equal("agent_3", PatternDetector.Slug("Agent 3"));
        Assert.Equal("abu_dhabi", PatternDetector.Slug("Abu Dhabi"));
        Assert.Equal("psi_assets", PatternDetector.Slug("  PSI Assets!! "));
    }

    [Fact]
    public void Recovery_sentence_in_both_languages()
    {
        var p = PatternDetector.Detect(Many(10, "z"))[0]; // tried 14, recovered 10, 71%
        Assert.Equal("Tried in 14 similar closed cases, recovered in 10, 10 of 14 is 71%.", p.RecoveryFigure.En);
        Assert.Equal("جُرّب في 14 حالة مشابهة مغلقة، وتعافت 10 منها، أي 71%.", p.RecoveryFigure.Ar);
    }

    [Fact]
    public void Sorts_by_how_far_past_the_threshold()
    {
        var p = PatternDetector.Detect(Many(12, "a").Concat(Many(6, "b")).ToList());
        var sorted = PatternDetector.SortByThresholdCloseness(p);
        Assert.Equal("same_issue:a", sorted[0].Id);
    }
}

// The PT ids must equal what the frontend shows. Reference values were computed with the frontend's own hash (utils/trace.ts).
public class PatternTraceTests
{
    [Theory]
    [InlineData("same_issue:slow_response", "PT-688")]
    [InlineData("same_agent:agent_3", "PT-516")]
    [InlineData("environment_concentration:repeat_contact:dubai", "PT-965")]
    [InlineData("same_issue:q", "PT-974")]
    public void Pt_ids_equal_the_frontend_hash(string key, string expected) => Assert.Equal(expected, PatternTrace.PtId(key));

    [Fact]
    public void Collisions_are_probed_away_and_do_not_depend_on_input_order()
    {
        var keys = Enumerable.Range(0, 700).Select(i => $"same_issue:category_{i}").ToList();
        var ids = PatternTrace.Ids(keys);
        Assert.Equal(700, ids.Values.Distinct().Count());
        var reversed = PatternTrace.Ids(Enumerable.Reverse(keys));
        Assert.True(keys.All(k => reversed[k] == ids[k]));
        // Reference values from the frontend's patternTraceIds for the same 700 keys.
        Assert.Equal("PT-128", ids["same_issue:category_0"]);
        Assert.Equal("PT-716", ids["same_issue:category_699"]);
        Assert.Equal("PT-600", ids["same_issue:category_350"]);
    }
}
