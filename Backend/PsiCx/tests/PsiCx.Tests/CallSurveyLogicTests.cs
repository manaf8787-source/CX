using PsiCx.Domain;
using PsiCx.Rules;

namespace PsiCx.Tests;

public class CallSurveyLogicTests
{
    private static CallFacts Call(Func<CallFacts, CallFacts>? f = null)
    {
        var c = new CallFacts(DateTimeOffset.Parse("2026-11-26T08:00:00Z"), CallDirection.Outbound, CallHandler.Ai, CallResult.Appointment, 90, true, false, null);
        return f is null ? c : f(c);
    }
    private static readonly CallSurveyRule R = CallSurveyRule.Default;

    [Fact]
    public void An_appointment_call_sends_one_hour_later()
    {
        var d = CallSurveyLogic.Decide(Call(), R, 30);
        Assert.True(d.Send);
        Assert.Equal(DateTimeOffset.Parse("2026-11-26T09:00:00Z"), d.SendAt);
    }

    [Theory]
    [InlineData(CallResult.DroppedAfterGreeting)]
    [InlineData(CallResult.NotInterested)]
    [InlineData(CallResult.NoAnswer)]
    [InlineData(CallResult.Busy)]
    [InlineData(CallResult.Voicemail)]
    [InlineData(CallResult.WrongNumber)]
    public void Results_that_are_not_completed_never_send(CallResult r) =>
        Assert.Equal(CallSkip.NotCompleted, CallSurveyLogic.Decide(Call(c => c with { Result = r }), R, 30).Skip);

    [Fact]
    public void Checks_run_in_order_and_the_cap_is_exclusive_at_thirty_days()
    {
        Assert.Equal(CallSkip.TooShort, CallSurveyLogic.Decide(Call(c => c with { TalkSeconds = 10 }), R, 30).Skip);
        Assert.Equal(CallSkip.NotInCrm, CallSurveyLogic.Decide(Call(c => c with { InCrm = false }), R, 30).Skip);
        Assert.Equal(CallSkip.Dncr, CallSurveyLogic.Decide(Call(c => c with { OnDncr = true }), R, 30).Skip);
        Assert.Equal(CallSkip.Cap, CallSurveyLogic.Decide(Call(c => c with { DaysSinceLastCsat = 12 }), R, 30).Skip);
        Assert.True(CallSurveyLogic.Decide(Call(c => c with { DaysSinceLastCsat = 30 }), R, 30).Send);
        // not in the CRM wins over DNCR (the order of the spec)
        Assert.Equal(CallSkip.NotInCrm, CallSurveyLogic.Decide(Call(c => c with { InCrm = false, OnDncr = true }), R, 30).Skip);
    }

    [Fact]
    public void Switches_skip_with_their_reason()
    {
        Assert.Equal(CallSkip.Direction, CallSurveyLogic.Decide(Call(), R with { Outbound = false }, 30).Skip);
        Assert.Equal(CallSkip.Direction, CallSurveyLogic.Decide(Call(c => c with { Direction = CallDirection.Inbound }), R with { Inbound = false }, 30).Skip);
        Assert.Equal(CallSkip.Agent, CallSurveyLogic.Decide(Call(), R with { Ai = false }, 30).Skip);
        Assert.Equal(CallSkip.Agent, CallSurveyLogic.Decide(Call(c => c with { HandledBy = CallHandler.Human }), R with { Human = false }, 30).Skip);
        Assert.Equal(CallSkip.RuleOff, CallSurveyLogic.Decide(Call(), R with { Enabled = false }, 30).Skip);
    }

    [Fact]
    public void Send_time_moves_into_the_sending_hours()
    {
        Assert.Equal(DateTimeOffset.Parse("2026-11-27T05:00:00Z"), CallSurveyLogic.SendTime(DateTimeOffset.Parse("2026-11-26T16:30:00Z"), R)); // 20:30 -> 09:00 next day
        Assert.Equal(DateTimeOffset.Parse("2026-11-26T05:00:00Z"), CallSurveyLogic.SendTime(DateTimeOffset.Parse("2026-11-26T02:00:00Z"), R)); // 06:00 -> 09:00 same day
    }

    [Fact]
    public void Window_edges_and_next_opening()
    {
        // 19:59 Gulf + 60 = 20:59: inside. 20:00 + 60 = 21:00: outside (toHour is exclusive)
        Assert.Equal(DateTimeOffset.Parse("2026-11-26T16:59:00Z"), CallSurveyLogic.SendTime(DateTimeOffset.Parse("2026-11-26T15:59:00Z"), R));
        Assert.Equal(DateTimeOffset.Parse("2026-11-27T05:00:00Z"), CallSurveyLogic.SendTime(DateTimeOffset.Parse("2026-11-26T16:00:00Z"), R));
        Assert.Equal(DateTimeOffset.Parse("2026-11-27T05:00:00Z"), CallSurveyLogic.NextOpening(DateTimeOffset.Parse("2026-11-26T08:00:00Z"), R)); // inside the window: tomorrow
        Assert.Equal(DateTimeOffset.Parse("2026-11-26T05:00:00Z"), CallSurveyLogic.NextOpening(DateTimeOffset.Parse("2026-11-26T01:00:00Z"), R));
        Assert.Equal(TimeSpan.FromMinutes(60), CallSurveyLogic.Tolerance(R));
    }

    [Fact]
    public void The_rule_is_validated()
    {
        Assert.Null(R.Problem());
        Assert.NotNull((R with { SendOn = [CallResult.Busy] }).Problem());
        Assert.NotNull((R with { MinTalkSeconds = -1 }).Problem());
        Assert.NotNull((R with { SendAfterMin = 120 }).Problem());
        Assert.NotNull((R with { FromHour = 21 }).Problem());
        Assert.NotNull((R with { ToHour = 25 }).Problem());
        Assert.Null((R with { FromHour = 0, ToHour = 24, SendAfterMin = 0 }).Problem());
    }
}
