using System.Text.Json.Serialization;

namespace PsiCx.Domain;

/// <summary>
/// The AI call center (BrightCall, 26 Nov). The portal keeps daily totals only, never call records, recordings or transcripts; the only
/// per-call events are the few calls that can send a survey or raise a complaint signal.
/// </summary>
public enum CallGroup { Answered, NoAnswer, Dropped, NotCalled, Excluded }

/// <summary>What the portal does with a BrightCall outcome: the call result it counts as, or not a call at all.</summary>
public enum MappedResult
{
    Appointment, FollowUp, Successful, CallBack, Other, NotInterested, DroppedAfterGreeting, NoAnswer, Busy, Voicemail, WrongNumber,
    NotCalled, Excluded
}

public static class MappedResults
{
    /// <summary>The call result of the survey rule; null for a blocked or left-out outcome (those are not calls).</summary>
    public static CallResult? ToCallResult(this MappedResult r) => r switch
    {
        MappedResult.Appointment => CallResult.Appointment,
        MappedResult.FollowUp => CallResult.FollowUp,
        MappedResult.Successful => CallResult.Successful,
        MappedResult.CallBack => CallResult.CallBack,
        MappedResult.Other => CallResult.Other,
        MappedResult.NotInterested => CallResult.NotInterested,
        MappedResult.DroppedAfterGreeting => CallResult.DroppedAfterGreeting,
        MappedResult.NoAnswer => CallResult.NoAnswer,
        MappedResult.Busy => CallResult.Busy,
        MappedResult.Voicemail => CallResult.Voicemail,
        MappedResult.WrongNumber => CallResult.WrongNumber,
        _ => null,
    };

    public static Bi Label(MappedResult r) => r.ToCallResult() is { } c ? CallResults.Label(c)
        : r == MappedResult.NotCalled ? new Bi("Not a call (blocked)", "ليست مكالمة (ممنوعة)") : new Bi("Left out", "مستبعدة");

    /// <summary>The group an outcome falls in when nobody gave it one (a code BrightCall starts sending, mapped by the CX manager).</summary>
    public static CallGroup GroupOf(MappedResult r) => r switch
    {
        MappedResult.DroppedAfterGreeting => CallGroup.Dropped,
        MappedResult.NoAnswer or MappedResult.Busy or MappedResult.Voicemail or MappedResult.WrongNumber => CallGroup.NoAnswer,
        MappedResult.NotCalled => CallGroup.NotCalled,
        MappedResult.Excluded => CallGroup.Excluded,
        _ => CallGroup.Answered,
    };
}

public sealed record BrightcallOutcome(string Code, CallGroup Group, MappedResult Result, bool Lead = false, bool Complaint = false);

/// <summary>BrightCall's three drop buckets. "Within 20 s" is the drop at the AI greeting.</summary>
public sealed record DropBuckets(
    [property: JsonPropertyName("within_20s")] int Within20s,
    [property: JsonPropertyName("after_1min")] int After1min,
    [property: JsonPropertyName("positive_then_dropped")] int PositiveThenDropped);

public sealed record SentimentSplit(int Positive, int Neutral, int Negative);

/// <summary>One row per day, environment, campaign and outcome (the only call data the portal keeps). Cost is in AED.</summary>
public sealed record AiCallDailyRow(DateOnly Date, EnvId EnvId, string Campaign, string Outcome, int Contacts, int Calls, decimal Cost);

/// <summary>Per day, environment and campaign: the drop buckets and the sentiment of the answered calls.</summary>
public sealed record AiCallDailyExtra(DateOnly Date, EnvId EnvId, string Campaign, DropBuckets Drops, SentimentSplit Sentiment);

/// <summary>Per campaign: customers on its list, and how many were tried at least once.</summary>
public sealed record AiCampaignTotals(string Campaign, EnvId EnvId, int Targeted, int Attempted, DateOnly StartedOn);

public enum CallSentiment { Positive, Neutral, Negative }

/// <summary>A per-call event the portal acts on: a call that can send the survey, or a complaint. The phone number is not kept; the recording stays in BrightCall (a link only).</summary>
public sealed record AiCallEvent(
    string Id, string CallId, DateTimeOffset EndedAt, EnvId EnvId, string Campaign, string Outcome, MappedResult Result,
    CallDirection Direction, CallHandler HandledBy, int TalkSeconds, CallSentiment? Sentiment, string? RecordingUrl,
    string? PersonId, bool SurveyCandidate, bool Complaint, string? SignalId);
