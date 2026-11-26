namespace PsiCx.Domain;

public enum GiftKind { Physical, Voucher, Experience }
public enum GiftReason { Recovery, Thanks, Occasion, Vip, Other }
/// <summary>
/// Pending (a CX team member asked) → Approved or Rejected (CX manager) → Sent (emailed to Administration, takes the stock out) → Delivered.
/// Cancelled puts the stock back. The CX manager's own requests are approved at once.
/// </summary>
public enum GiftStatus { Pending, Approved, Rejected, Sent, Delivered, Cancelled }
public enum ContactMethod { Call, Whatsapp, Email }

public sealed record GiftItem(string Id, Bi Name, GiftKind Kind, Bi Nature, decimal? UnitValue, int LowAt, bool Archived = false);

/// <summary>A stock movement: + when stock is received, − when it is corrected down.</summary>
public sealed record StockMove(string Id, string ItemId, int Qty, DateTimeOffset At, string By, string? Note);

public sealed record Gift(
    string Id, string? PersonId, string FullName, string Phone, string? Email, ContactMethod ContactMethod, string Address,
    DateOnly? DeliverOn, string DeliverWindow, string ItemId, int Qty, GiftReason Reason, string? Note, string? RelatedRef,
    string RequestedBy, string RequestedById, DateTimeOffset RequestedAt, string EmailedTo, GiftStatus Status,
    DateTimeOffset? DeliveredAt = null, DateTimeOffset? CancelledAt = null, string? Justification = null,
    string? ApprovedBy = null, DateTimeOffset? DecidedAt = null, string? DecisionNote = null,
    Bi? CaseTitle = null, IReadOnlyList<Bi>? CaseFacts = null, Bi? TeamNote = null, string? Where = null);
