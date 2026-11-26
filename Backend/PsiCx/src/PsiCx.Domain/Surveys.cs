namespace PsiCx.Domain;

/// <summary>The three measures behind the indicators. The re-survey reuses the first one's measure.</summary>
public enum Measure { Nps, Csat, Ces }

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
    int? RecoveryDelta = null);
