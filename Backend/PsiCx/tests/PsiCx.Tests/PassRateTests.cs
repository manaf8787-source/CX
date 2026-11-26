using PsiCx.Domain;
using PsiCx.Rules;

namespace PsiCx.Tests;

public class PassRateTests
{
    private static SampleVerdict Item(int id, int agent, bool? verdict = null) =>
        new($"ws-{id}", agent, verdict, new Bi($"Output {id}", $"مخرج {id}"));

    [Theory]
    [InlineData(94, 18, 0, 94)]
    [InlineData(94, 18, 1, 89)]
    [InlineData(88, 5, 1, 70)]
    [InlineData(100, 4, 4, 0)]
    [InlineData(100, 4, 9, 0)]
    [InlineData(90, 0, 3, 90)]
    public void Wrong_share_comes_off_the_rate(int b, int sampled, int wrong, int expected) =>
        Assert.Equal(expected, PassRate.Compute(b, sampled, wrong));

    [Fact]
    public void An_agent_that_is_not_running_stays_not_running() => Assert.Null(PassRate.Compute(null, 5, 2));

    [Fact]
    public void Rate_per_agent_sorted_by_number()
    {
        var sample = new[] { Item(1, 2, true), Item(2, 2, false), Item(3, 2), Item(4, 2), Item(5, 3, false) };
        var rates = PassRate.PerAgent(sample, new Dictionary<int, int?> { [2] = 94, [3] = 96 });
        Assert.Equal("2,3", string.Join(",", rates.Select(r => r.Agent)));
        Assert.Equal(new AgentPassRate(2, 94, 71, 4, 1, 1), rates[0]);
        Assert.Equal(new AgentPassRate(3, 96, 0, 1, 1, 1), rates[1]);
    }

    [Fact]
    public void Routing_and_targeting_rows_lower_the_owning_agent()
    {
        var sample = new[] { Item(1, 5), Item(2, 5, false), Item(3, 7), Item(4, 7, false) };
        var rates = PassRate.PerAgent(sample, new Dictionary<int, int?> { [5] = 88, [7] = 91 });
        Assert.Equal(44, rates.Single(r => r.Agent == 5).Current);
        Assert.Equal(46, rates.Single(r => r.Agent == 7).Current);
    }

    [Fact]
    public void A_wrong_becomes_a_test_and_changing_the_verdict_removes_it_again()
    {
        var now = T.At(2026, 11, 18, 9);
        var none = PassRate.SyncTests(new[] { Item(1, 2), Item(2, 2) }, Array.Empty<SupervisorTest>(), now);
        Assert.Empty(none);

        var wrong = new[] { Item(1, 2), Item(2, 2, false) };
        var one = PassRate.SyncTests(wrong, none, now);
        Assert.Single(one);
        Assert.Equal("st-ws-2", one[0].Id);
        Assert.Equal("ws-2", one[0].FromSampleId);
        Assert.Equal(2, one[0].Agent);

        var again = PassRate.SyncTests(wrong, one, now.AddDays(1));
        Assert.Single(again);
        Assert.Equal(now, again[0].CreatedAt); // idempotent: the first test is kept

        var back = PassRate.SyncTests(new[] { Item(1, 2), Item(2, 2, true) }, again, now);
        Assert.Empty(back);
    }

    [Fact]
    public void Test_text_has_both_languages_and_no_customer_name()
    {
        var t = PassRate.TestFor(Item(7, 2, false), T.At(2026, 11, 18, 9));
        Assert.Equal("Catch this: Output 7", t.Text.En);
        Assert.Equal("التقط هذا: مخرج 7", t.Text.Ar);
        Assert.Equal(T.At(2026, 11, 18, 9), t.CreatedAt);
    }
}
