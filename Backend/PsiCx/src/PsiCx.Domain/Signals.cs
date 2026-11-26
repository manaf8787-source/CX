namespace PsiCx.Domain;

// Mirrors React-Frontend/src/types/domain.ts (signals, patterns) and the call-list fields of DetractorCallItem.

public enum SignalKind { Complaint, LowScore, Breach, PublicMention, LegalPrivacySafety }

/// <summary>Every signal is counted, not worked one by one. A public mention has no person and no events.</summary>
public sealed record Signal(
    string Id,
    SignalKind Kind,
    ProductId Product,
    /// <summary>Short English label ('Dubai', 'Abu Dhabi', 'PSI Assets'); <see cref="EnvId"/> is the canonical id.</summary>
    string Environment,
    EnvId EnvId,
    string Category,
    DateTimeOffset OccurredAt,
    bool IsPublic = false,
    string? PersonId = null,
    string? AgentRef = null,
    IReadOnlyList<string>? EventIds = null,
    DateTimeOffset? PublicReplyDueAt = null);

public enum PatternThresholdKind { SameAgent, SameIssue, EnvironmentConcentration }

/// <summary>A group of signals past a threshold. <see cref="Id"/> equals <see cref="Key"/> and is stable across recomputations.</summary>
public sealed record Pattern(
    string Id,
    string Key,
    string TraceId,
    IReadOnlyList<string> SignalIds,
    string Team,
    string Category,
    int WindowDays,
    int SampleSize,
    Bi AiSuggestion,
    Bi RecoveryFigure,
    PatternThresholdKind ThresholdKind,
    /// <summary>same_agent and same_issue: the minimum count; environment_concentration: the percent (0 to 100).</summary>
    int ThresholdTarget,
    int CurrentValue,
    string? AgentRef,
    bool HasMinimumSample);

public enum CallStatus { ToDo, NoAnswer, NeedsHuman, Done }

/// <summary>Who makes the call: the CX team's own list, or an AI interview campaign.</summary>
public enum CallChannel { Human, AiCampaign }
