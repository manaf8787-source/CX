namespace PsiCx.Domain;

// Corrective actions (the "Fix" step, CA-n). A fix is always a suggestion until a person approves it.

public enum FixKind { Employee, ServiceBehaviour, TrainingGap, ProductApp, Process, Environment, LegalPrivacy, Marketing }

public enum FixStatus { Proposed, Approved, InProgress, Verification, Effective, Partial, Failed }

public enum FixDecision { Approved, Modified, Rejected }

public enum FixVerdict { Effective, Partial, Failed }

public enum FixDueSource { Matrix, Fallback }

/// <summary>One line of a fix's trail. ByRole is a role id or "system", never a person. Nothing is deleted.</summary>
public sealed record FixAuditLine(DateTimeOffset At, string ByRole, Bi What);

public sealed record FixCompletion(string Note, DateOnly DoneOn, string? Evidence, string? By, string ByRole, DateTimeOffset At);

public sealed record CorrectiveAction
{
    public required string Id { get; init; }
    public required FixKind Kind { get; init; }
    public string? PatternId { get; init; }
    public required Bi Title { get; init; }
    /// <summary>A title, never a name (NFR-2); never a head or a chief.</summary>
    public required string Owner { get; init; }
    public required ProductId Product { get; init; }
    public EnvId? EnvId { get; init; }
    public required FixStatus Status { get; init; }
    public FixDecision? Decision { get; init; }
    public Bi? DecisionReason { get; init; }
    public required DateTimeOffset ProposedAt { get; init; }
    public DateTimeOffset? ApprovedAt { get; init; }
    public required DateTimeOffset DueAt { get; init; }
    public FixDueSource? DueSource { get; init; }
    public DateTimeOffset? DoneAt { get; init; }
    public required DateTimeOffset VerificationDueAt { get; init; }
    public FixVerdict? VerificationResult { get; init; }
    public FixCompletion? Completion { get; init; }
    public bool SentToInvestigation { get; init; }
    public string? ParentFixId { get; init; }
    public FixVerdict? ParentOutcome { get; init; }
    public string? InvestigationId { get; init; }
    public Bi? ProposedBy { get; init; }
    /// <summary>Filled on read for a proposed fix: working days left to decide (negative = late). Not stored.</summary>
    public int? ApprovalDaysLeft { get; init; }
    public IReadOnlyList<FixAuditLine> AuditLog { get; init; } = [];
}

public enum InvestigationKind { CustomerInterviews, StaffInterviews, DataReview }

public enum InvestigationStatus { Requested, InProgress, Returned }

public sealed record Investigation
{
    public required string Id { get; init; }
    public required string PatternId { get; init; }
    public required InvestigationKind Kind { get; init; }
    public int? RequestedCount { get; init; }
    public int DoneCount { get; init; }
    public string? Environment { get; init; }
    public required InvestigationStatus Status { get; init; }
    public Bi? Note { get; init; }
    public Bi? Result { get; init; }
}
