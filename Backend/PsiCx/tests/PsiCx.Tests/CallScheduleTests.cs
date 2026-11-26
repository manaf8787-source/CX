using PsiCx.Domain;
using PsiCx.Rules;
using static PsiCx.Tests.T;

namespace PsiCx.Tests;

// Cases ported from React-Frontend/src/utils/callSchedule.test.ts (the copy test stays in the frontend).
public class CallScheduleTests
{
    private static readonly CallRules Rules = CallRules.FromBag(RulesBag.Default);
    private static DateTime Tue(int h, int m = 0) => At(2026, 11, 17, h, m);

    [Fact]
    public void Reads_hours_tries_and_the_working_week_from_the_rules()
    {
        Assert.Equal(9, Rules.From);
        Assert.Equal(18, Rules.To);
        Assert.Equal(3, Rules.Tries);
        Assert.Equal(2, Rules.AiNoAnswers);
        Assert.Equal(5, Rules.Calendar.EffectiveDays.Count);
    }

    [Fact]
    public void Calls_only_on_a_working_day_between_the_start_and_the_end_hour()
    {
        Assert.True(CallSchedule.IsInsideCallingHours(Tue(9), Rules));
        Assert.True(CallSchedule.IsInsideCallingHours(Tue(17, 59), Rules));
        Assert.False(CallSchedule.IsInsideCallingHours(Tue(18), Rules));
        Assert.False(CallSchedule.IsInsideCallingHours(Tue(8, 59), Rules));
        Assert.False(CallSchedule.IsInsideCallingHours(At(2026, 11, 21, 11), Rules)); // Saturday
        Assert.True(CallSchedule.IsInsideCallingHours(Tue(19), Rules with { To = 20 }));
    }

    [Fact]
    public void No_calls_on_a_public_holiday()
    {
        var rules = Rules with { Calendar = Rules.Calendar.WithHolidays([new DateOnly(2026, 12, 2)]) };
        Assert.False(CallSchedule.IsInsideCallingHours(At(2026, 12, 2, 10), rules));
        Assert.True(CallSchedule.IsInsideCallingHours(At(2026, 12, 1, 10), rules));
    }

    [Fact]
    public void No_answer_adds_an_attempt_and_the_next_one_is_the_following_working_day()
    {
        var r = CallSchedule.RecordNoAnswer(new CallRow(0), Tue(10), Rules);
        Assert.Equal(new NoAnswerResult(1, CallStatus.NoAnswer, new DateOnly(2026, 11, 18), false, false, false), r);
        // Friday: the next attempt is Monday, not Saturday.
        Assert.Equal(new DateOnly(2026, 11, 23), CallSchedule.RecordNoAnswer(new CallRow(1), At(2026, 11, 20, 10), Rules).NextAttemptOn);
    }

    [Fact]
    public void After_the_last_attempt_a_whatsapp_goes_out_and_the_row_needs_a_human()
    {
        var r = CallSchedule.RecordNoAnswer(new CallRow(2), Tue(10), Rules);
        Assert.Equal(new NoAnswerResult(3, CallStatus.NeedsHuman, null, true, true, false), r);
        Assert.True(CallSchedule.IsOpenCall(CallStatus.NeedsHuman));
        Assert.False(CallSchedule.IsOpenCall(CallStatus.Done));
        Assert.True(CallSchedule.RecordNoAnswer(new CallRow(1), At(2026, 11, 17), Rules with { Tries = 2 }).NeedsHuman);
    }

    [Fact]
    public void An_ai_campaign_hands_over_after_two_no_answers_the_cx_list_after_three()
    {
        Assert.Equal(2, CallSchedule.AttemptsAllowed(CallChannel.AiCampaign, Rules));
        Assert.Equal(3, CallSchedule.AttemptsAllowed(CallChannel.Human, Rules));
        Assert.Equal(3, CallSchedule.AttemptsAllowed(null, Rules));

        var ai0 = CallSchedule.RecordNoAnswer(new CallRow(0, CallChannel.AiCampaign), Tue(10), Rules);
        Assert.Equal(1, ai0.Attempts);
        Assert.Equal(CallStatus.NoAnswer, ai0.Status);
        Assert.False(ai0.NeedsHuman);
        // The second no-answer hands over, with no WhatsApp from the campaign.
        Assert.Equal(new NoAnswerResult(2, CallStatus.NeedsHuman, null, false, true, true),
            CallSchedule.RecordNoAnswer(new CallRow(1, CallChannel.AiCampaign), Tue(10), Rules));
        var h1 = CallSchedule.RecordNoAnswer(new CallRow(1, CallChannel.Human), Tue(10), Rules);
        Assert.Equal(CallStatus.NoAnswer, h1.Status);
        var h2 = CallSchedule.RecordNoAnswer(new CallRow(2, CallChannel.Human), Tue(10), Rules);
        Assert.Equal(CallStatus.NeedsHuman, h2.Status);
        Assert.True(h2.WhatsappSent);
        Assert.False(h2.HandedOver);
        Assert.False(CallSchedule.RecordNoAnswer(new CallRow(1, CallChannel.AiCampaign), Tue(10), Rules with { AiNoAnswers = 3 }).NeedsHuman);
        Assert.Equal(new AttemptLineInfo(2, 2, new DateOnly(2026, 11, 18)),
            CallSchedule.AttemptLine(1, CallStatus.NoAnswer, new DateOnly(2026, 11, 18), CallChannel.AiCampaign, Rules));
    }

    [Fact]
    public void Attempt_line_only_for_a_row_with_an_attempt_and_one_still_to_go()
    {
        Assert.Null(CallSchedule.AttemptLine(0, CallStatus.ToDo, null, null, Rules));
        Assert.Equal(new AttemptLineInfo(2, 3, new DateOnly(2026, 11, 18)),
            CallSchedule.AttemptLine(1, CallStatus.NoAnswer, new DateOnly(2026, 11, 18), null, Rules));
        Assert.Null(CallSchedule.AttemptLine(3, CallStatus.NeedsHuman, null, null, Rules));
        Assert.Null(CallSchedule.AttemptLine(1, CallStatus.Done, null, null, Rules));
    }
}
