using PsiCx.Domain;
namespace PsiCx.Rules;


public sealed record FixDue(DateTime DueAt, FixDueSource Source, double? Hours = null);

/// <summary>
/// The three clocks of a corrective action (decided 18 Nov). Port of React-Frontend/src/utils/fixClock.ts.
/// 1. Approval: 5 working days from the proposal.
/// 2. Due date: from approval, the escalation matrix "Resolve (h)" in WORKING hours (9 = one working day);
///    an empty cell falls back to 14 calendar days.
/// 3. Verification: 60 calendar days from "done".
/// </summary>
public static class FixClock
{
    public static FixDue FixDue(DateTime approvedAt, double? resolveHours, RulesBag rules)
    {
        if (resolveHours is not > 0)
            return new FixDue(approvedAt.AddDays(rules.FixFallbackDays), FixDueSource.Fallback);
        return new FixDue(WorkingDays.AddWorkingHours(approvedAt, resolveHours.Value, rules.Calendar), FixDueSource.Matrix, resolveHours);
    }

    /// <summary>The last day to decide on a proposed fix.</summary>
    public static DateTime ApprovalDeadline(DateTime proposedAt, RulesBag rules)
        => WorkingDays.AddWorkingDays(proposedAt, rules.ApproveDays, rules.Calendar);

    /// <summary>Working days left in the approval window (negative = late); the inbox counter.</summary>
    public static int ApprovalDaysLeft(DateTime proposedAt, DateTime today, RulesBag rules)
        => rules.ApproveDays - WorkingDays.WorkingDaysBetween(proposedAt, today, rules.Calendar);

    /// <summary>When the 60-day check runs.</summary>
    public static DateTime VerificationDue(DateTime doneAt, RulesBag rules) => doneAt.AddDays(rules.VerifyDays);
}
