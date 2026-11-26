using System.Text.Json.Serialization;
using PsiCx.Domain;

namespace PsiCx.Rules;

/// <summary>
/// The survey after a call-center call: the rule the CX manager edits (Settings, Surveys, When we ask). Same fields and defaults as the
/// frontend's <c>CallSurveyRule</c>. The critical-failure stop of the spec is left out on purpose (QA is handled with the call-center owner).
/// </summary>
public sealed record CallSurveyRule(
    bool Enabled = true,
    IReadOnlyList<CallResult>? SendOn = null,
    bool Inbound = true,
    bool Outbound = true,
    bool Ai = true,
    bool Human = true,
    int MinTalkSeconds = 30,
    int SendAfterMin = 60,
    int SendBeforeMin = 120,
    int FromHour = 9,
    int ToHour = 21)
{
    public static readonly IReadOnlyList<CallResult> DefaultSendOn = [CallResult.Appointment, CallResult.FollowUp, CallResult.Successful];

    [JsonIgnore]
    public IReadOnlyList<CallResult> Results => SendOn ?? DefaultSendOn;

    public static CallSurveyRule Default { get; } = new();

    /// <summary>Why this rule cannot be saved, or null. The wording is the spec's validation column.</summary>
    public string? Problem()
    {
        if (Results.Any(r => !CallResults.Completed(r))) return "Only completed results (appointment, follow-up, successful call) can send a survey.";
        if (MinTalkSeconds < 0) return "The shortest conversation cannot be negative.";
        if (SendAfterMin < 0 || SendAfterMin >= SendBeforeMin) return "The survey goes out at the earliest this many minutes after the call, and the latest must be later (0 <= after < before).";
        if (FromHour < 0 || FromHour >= ToHour || ToHour > 24) return "Sending hours: 0 <= from < to <= 24 (Gulf time).";
        return null;
    }
}

/// <summary>What the engine knows about one call when it decides.</summary>
public sealed record CallFacts(
    DateTimeOffset EndedAt, CallDirection Direction, CallHandler HandledBy, CallResult Result, int TalkSeconds,
    bool InCrm, bool OnDncr, int? DaysSinceLastCsat);

public readonly record struct CallDecision(bool Send, CallSkip? Skip, DateTimeOffset? SendAt);

/// <summary>The call-survey decision and send time. Pure: same checks in the same order as the frontend's <c>decideCallSurvey</c>.</summary>
public static class CallSurveyLogic
{
    /// <summary>Gulf time is UTC+4 all year.</summary>
    private static readonly TimeSpan Gulf = TimeSpan.FromHours(4);

    public static CallDecision Decide(CallFacts c, CallSurveyRule rule, int capDays)
    {
        static CallDecision No(CallSkip s) => new(false, s, null);
        if (!rule.Enabled) return No(CallSkip.RuleOff);
        if (!rule.Results.Contains(c.Result)) return No(CallSkip.NotCompleted);
        if (c.TalkSeconds < rule.MinTalkSeconds) return No(CallSkip.TooShort);
        if (c.Direction == CallDirection.Inbound ? !rule.Inbound : !rule.Outbound) return No(CallSkip.Direction);
        if (c.HandledBy == CallHandler.Ai ? !rule.Ai : !rule.Human) return No(CallSkip.Agent);
        if (!c.InCrm) return No(CallSkip.NotInCrm);
        if (c.OnDncr) return No(CallSkip.Dncr);
        if (c.DaysSinceLastCsat is { } d && d < capDays) return No(CallSkip.Cap);
        return new(true, null, SendTime(c.EndedAt, rule));
    }

    public static bool InWindow(DateTimeOffset t, CallSurveyRule rule)
    {
        var h = (t + Gulf).TimeOfDay.TotalHours;
        return h >= rule.FromHour && h < rule.ToHour;
    }

    /// <summary>The earliest send time: <c>SendAfterMin</c> after the call, moved to the next opening of the sending hours when it falls outside them.</summary>
    public static DateTimeOffset SendTime(DateTimeOffset endedAt, CallSurveyRule rule)
    {
        var t = endedAt.AddMinutes(rule.SendAfterMin);
        if (InWindow(t, rule)) return t;
        var local = (t + Gulf).UtcDateTime;
        var h = local.TimeOfDay.TotalHours;
        var day = local.Date;
        if (h >= rule.ToHour) day = day.AddDays(1);
        return new DateTimeOffset(DateTime.SpecifyKind(day.AddHours(rule.FromHour), DateTimeKind.Utc), TimeSpan.Zero) - Gulf;
    }

    /// <summary>The next time the sending hours open, strictly after <paramref name="after"/>.</summary>
    public static DateTimeOffset NextOpening(DateTimeOffset after, CallSurveyRule rule)
    {
        var local = (after + Gulf).UtcDateTime;
        var open = local.Date.AddHours(rule.FromHour);
        if (open <= local) open = open.AddDays(1);
        return new DateTimeOffset(DateTime.SpecifyKind(open, DateTimeKind.Utc), TimeSpan.Zero) - Gulf;
    }

    /// <summary>How late a due survey may still go out: the gap between the earliest and the latest time of the rule.</summary>
    public static TimeSpan Tolerance(CallSurveyRule rule) => TimeSpan.FromMinutes(rule.SendBeforeMin - rule.SendAfterMin);
}
