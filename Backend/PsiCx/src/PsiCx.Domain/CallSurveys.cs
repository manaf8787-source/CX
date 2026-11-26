namespace PsiCx.Domain;

/// <summary>How a call-center call ended (call-survey spec, 26 Nov). Only the first three are completed and can send a survey.</summary>
public enum CallResult { Appointment, FollowUp, Successful, NotInterested, DroppedAfterGreeting, NoAnswer, Busy, Voicemail, WrongNumber }

public enum CallDirection { Inbound, Outbound }

/// <summary>Who held the conversation.</summary>
public enum CallHandler { Ai, Human }

/// <summary>Why a call got no survey, in the order the checks run.</summary>
public enum CallSkip { RuleOff, NotCompleted, TooShort, Direction, Agent, NotInCrm, Dncr, Cap }

public enum CallSurveyStatus { Scheduled, Skipped, Sent, Answered, Failed }

public static class CallResults
{
    public static bool Completed(CallResult r) => r is CallResult.Appointment or CallResult.FollowUp or CallResult.Successful;

    public static Bi Label(CallResult r) => r switch
    {
        CallResult.Appointment => new Bi("Appointment booked", "تم حجز موعد"),
        CallResult.FollowUp => new Bi("Follow-up agreed", "تم الاتفاق على متابعة"),
        CallResult.Successful => new Bi("Successful call", "مكالمة ناجحة"),
        CallResult.NotInterested => new Bi("Not interested", "غير مهتم"),
        CallResult.DroppedAfterGreeting => new Bi("Dropped after the AI greeting", "أغلق الخط بعد تحية الذكاء الاصطناعي"),
        CallResult.NoAnswer => new Bi("No answer", "لا رد"),
        CallResult.Busy => new Bi("Busy", "مشغول"),
        CallResult.Voicemail => new Bi("Voicemail", "بريد صوتي"),
        _ => new Bi("Wrong number", "رقم خاطئ"),
    };
}

/// <summary>
/// One call-center call and what became of its survey. Every "call ended" event is stored, skipped ones too, so the "why a call got no
/// survey" breakdown and the drop rate per script can be counted.
/// </summary>
public sealed record CallSurveyItem(
    string Id,
    string CallId,
    DateTimeOffset EndedAt,
    CallDirection Direction,
    CallHandler HandledBy,
    string Script,
    CallResult Result,
    int TalkSeconds,
    EnvId EnvId,
    ProductId Product,
    /// <summary>Only for sending; never returned by the list.</summary>
    string? Phone,
    /// <summary>The CRM contact the number matched; null when it matched none.</summary>
    string? PersonId,
    string? AgentName,
    CallSurveyStatus Status,
    CallSkip? SkipReason,
    DateTimeOffset? SendAt,
    DateTimeOffset? SentAt,
    ChannelId? Channel,
    DateTimeOffset? AnsweredAt,
    int? CsatScore,
    int? CesScore,
    /// <summary>What the checks saw at the call, kept so a draft rule can be replayed over the last 30 days.</summary>
    bool OnDncrAtCall,
    int? DaysSinceLastCsat,
    int? QaScore,
    string? FailReason);
