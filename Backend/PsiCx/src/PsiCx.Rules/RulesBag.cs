namespace PsiCx.Rules;

/// <summary>Pattern thresholds (decision 1): same agent x3, same issue x5, 50% in one environment, 30 days, sample of 10.</summary>
public sealed record PatternRules(
    int SameAgentMin = 3,
    int SameIssueMin = 5,
    int EnvironmentConcentrationPct = 50,
    int WindowDays = 30,
    int MinimumSample = 10);

/// <summary>
/// The rules configuration read as plain values (frontend "RulesBag"). Loaded from the versioned
/// configuration in the database; these defaults are the documented ones.
/// </summary>
public sealed record RulesBag
{
    public PatternRules Patterns { get; init; } = new();
    /// <summary>Working days the responsible manager has to decide on a proposed fix.</summary>
    public int ApproveDays { get; init; } = 5;
    /// <summary>Calendar days after "done" when the effectiveness check runs.</summary>
    public int VerifyDays { get; init; } = 60;
    /// <summary>Share (0 to 100) the signals must drop by for a fix to read effective.</summary>
    public int EffectiveDropPct { get; init; } = 50;
    public int PublicReplyHours { get; init; } = 48;
    public int PublicReminderHours { get; init; } = 24;
    public IReadOnlyList<DayOfWeek> WorkingDays { get; init; } = WorkCalendar.MonFri;
    /// <summary>UAE public holidays (configuration, because the Islamic dates are announced each year).</summary>
    public IReadOnlySet<DateOnly> Holidays { get; init; } = new HashSet<DateOnly>();
    public int WorkStart { get; init; } = 9;
    public int WorkEnd { get; init; } = 18;
    /// <summary>Calendar days when the matrix "Resolve (h)" cell is empty (Agent 5's 14).</summary>
    public int FixFallbackDays { get; init; } = 14;
    public int CallFrom { get; init; } = 9;
    public int CallTo { get; init; } = 18;
    public int CallTries { get; init; } = 3;
    public int AiNoAnswers { get; init; } = 2;

    public WorkCalendar Calendar => new(WorkingDays, Holidays, WorkStart, WorkEnd);

    public static RulesBag Default { get; } = new();
}
