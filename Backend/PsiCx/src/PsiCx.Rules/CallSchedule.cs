using PsiCx.Domain;

namespace PsiCx.Rules;

/// <summary>Close the loop calling rules (decided 18 Nov). Hours, tries, the AI no-answers and the working week are configuration.</summary>
public sealed record CallRules(int From, int To, int Tries, int AiNoAnswers, WorkCalendar Calendar)
{
    public static CallRules FromBag(RulesBag bag) => new(bag.CallFrom, bag.CallTo, bag.CallTries, bag.AiNoAnswers, bag.Calendar);
}

public sealed record CallRow(int Attempts, CallChannel? Channel = null);

public sealed record NoAnswerResult(
    int Attempts,
    CallStatus Status,
    /// <summary>The following working day; absent once the last attempt is spent.</summary>
    DateOnly? NextAttemptOn,
    /// <summary>True on the last attempt of the CX team's list (an AI campaign hands over instead).</summary>
    bool WhatsappSent,
    bool NeedsHuman,
    /// <summary>True when an AI campaign's no-answers reached the limit and the call passes to a person.</summary>
    bool HandedOver);

public sealed record AttemptLineInfo(int Attempt, int Of, DateOnly? Next);

/// <summary>Port of React-Frontend/src/utils/callSchedule.ts. Times are UAE wall-clock.</summary>
public static class CallSchedule
{
    /// <summary>True on a working day between the start hour (inclusive) and the end hour (exclusive).</summary>
    public static bool IsInsideCallingHours(DateTime now, CallRules rules)
    {
        var h = now.Hour + now.Minute / 60.0;
        return WorkingDays.IsWorkingDay(now, rules.Calendar) && h >= rules.From && h < rules.To;
    }

    /// <summary>An AI campaign hands over after AiNoAnswers (2), the CX team's own list after Tries (3).</summary>
    public static int AttemptsAllowed(CallChannel? channel, CallRules rules)
        => channel == CallChannel.AiCampaign ? rules.AiNoAnswers : rules.Tries;

    /// <summary>"No answer": attempts + 1; the next attempt is the following working day; on the last attempt the row needs a human.</summary>
    public static NoAnswerResult RecordNoAnswer(CallRow item, DateTime now, CallRules rules)
    {
        var attempts = item.Attempts + 1;
        if (attempts >= AttemptsAllowed(item.Channel, rules))
        {
            var ai = item.Channel == CallChannel.AiCampaign;
            return new NoAnswerResult(attempts, CallStatus.NeedsHuman, null, WhatsappSent: !ai, NeedsHuman: true, HandedOver: ai);
        }
        return new NoAnswerResult(attempts, CallStatus.NoAnswer,
            DateOnly.FromDateTime(WorkingDays.NextWorkingDay(now, rules.Calendar)), false, false, false);
    }

    /// <summary>"Attempt n+1 of N", only for a row with an attempt and one still to go.</summary>
    public static AttemptLineInfo? AttemptLine(int attempts, CallStatus status, DateOnly? nextAttemptOn, CallChannel? channel, CallRules rules)
    {
        if (attempts < 1 || status is CallStatus.Done or CallStatus.NeedsHuman) return null;
        return new AttemptLineInfo(attempts + 1, AttemptsAllowed(channel, rules), nextAttemptOn);
    }

    /// <summary>True while the row still counts as open (to do, no answer, needs a human).</summary>
    public static bool IsOpenCall(CallStatus status) => status != CallStatus.Done;
}
