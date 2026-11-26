namespace PsiCx.Domain;

/// <summary>The three measures behind the indicators. The re-survey reuses the first one's measure.</summary>
public enum Measure { Nps, Csat, Ces }

/// <summary>How the customer was reached before the re-survey: a call to understand the problem, a gift, both, or neither. Not tied to gifts (26 Nov, owner).</summary>
public enum ReachedVia { None, Call, Gift, CallAndGift }

/// <summary>
/// One answered survey (the score of one instrument). Product and environment are on the record, so every indicator is per product and
/// follows the environment switch. Source is the channel it was sent on; a public channel is never surveyed.
/// </summary>
public sealed record SurveyResponse(
    string Id,
    string PersonId,
    ProductId Product,
    EnvId EnvId,
    Measure Measure,
    int Score,
    /// <summary>CES only: 5 or 7. The other measures have a fixed scale.</summary>
    int Scale,
    ChannelId Source,
    DateTimeOffset At,
    /// <summary>The first response this one re-surveys (7 to 14 days after resolution); null for a first response.</summary>
    string? ReSurveyOf = null,
    /// <summary>For a re-survey: its score minus the first one's. Positive = recovered.</summary>
    int? RecoveryDelta = null,
    /// <summary>Re-survey only: how the customer was reached first.</summary>
    ReachedVia Via = ReachedVia.None,
    /// <summary>Re-survey only: the call notes (what the customer said). Read by CX only.</summary>
    string? Note = null,
    /// <summary>The customer's own words, when they wrote any.</summary>
    string? Comment = null,
    /// <summary>What the customer rated: a role ("Leasing agent") or an app step. A person handled it only when Digital is false.</summary>
    Bi? Touchpoint = null,
    bool Digital = false,
    string? HandledBy = null,
    string? Unit = null,
    /// <summary>The moment that triggered the survey (a viewing, a handover).</summary>
    Bi? Moment = null,
    /// <summary>For a detractor: why, classified from the comment, the call notes or the touchpoint (Detractor analysis, 26 Nov).</summary>
    DetractorReason? Reason = null,
    /// <summary>Call survey only (26 Nov): the call this answer follows, how it ended, direction, who held it, the script, and the QA score when the call is in the QA sample.</summary>
    string? CallId = null,
    CallResult? CallResult = null,
    CallDirection? CallDirection = null,
    CallHandler? CallHandler = null,
    string? Script = null,
    int? QaScore = null);

/// <summary>The overall reason a customer is a detractor, and the reasons under it (Detractor analysis, 26 Nov).</summary>
public enum DetractorTheme { People, Digital, Process, Commercial, Pending }

public enum DetractorReason
{
    Knowledge, Communication, SlowReply, Promise, AppErrors, Paperwork, Maintenance, Price, NothingSuitable, Other, Pending
}
