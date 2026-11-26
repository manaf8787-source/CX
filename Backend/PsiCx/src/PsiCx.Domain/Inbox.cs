namespace PsiCx.Domain;

public enum InboxKind { Approve, Do, Verify, Call, Inv, Sample, Caud, Caud2, Mention, Gift }

public enum DayUnit { Wd, D }

/// <summary>One row of My inbox: something that is on a role, with a day counter. Negative DaysLeft = late; null = no date.</summary>
public sealed record InboxItem(string Id, InboxKind Kind, Bi Text, int? DaysLeft, DayUnit Unit, Bi? Who, int Priority, string Target, bool Critical = false);
