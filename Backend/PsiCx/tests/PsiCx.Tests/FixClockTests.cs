using PsiCx.Rules;
using static PsiCx.Tests.T;

namespace PsiCx.Tests;

// Cases ported from React-Frontend/src/utils/fixClock.test.ts.
public class FixClockTests
{
    private static readonly RulesBag Rules = RulesBag.Default;
    private static readonly WorkCalendar Cal = WorkCalendar.Default;

    [Fact]
    public void Nine_hours_are_one_working_day_forty_five_are_five()
    {
        Assert.Equal("2026-11-16 18:00", Local(WorkingDays.AddWorkingHours(At(2026, 11, 16, 9), 9, Cal)));
        Assert.Equal("2026-11-18 12:00", Local(WorkingDays.AddWorkingHours(At(2026, 11, 17, 12), 9, Cal)));
        Assert.Equal("2026-11-20 18:00", Local(WorkingDays.AddWorkingHours(At(2026, 11, 16, 9), 45, Cal)));
        Assert.Equal("2026-11-27 18:00", Local(WorkingDays.AddWorkingHours(At(2026, 11, 16, 9), 90, Cal)));
    }

    [Fact]
    public void Skips_the_weekend_and_counts_from_the_next_opening_outside_working_time()
    {
        Assert.Equal("2026-11-23 11:00", Local(WorkingDays.AddWorkingHours(At(2026, 11, 20, 16), 4, Cal)));
        Assert.Equal("2026-11-23 11:00", Local(WorkingDays.AddWorkingHours(At(2026, 11, 21, 11), 2, Cal))); // Saturday starts Monday 09:00
        Assert.Equal("2026-11-18 10:00", Local(WorkingDays.AddWorkingHours(At(2026, 11, 17, 19), 1, Cal))); // after 18:00 starts tomorrow
        Assert.Equal("2026-11-17 10:00", Local(WorkingDays.AddWorkingHours(At(2026, 11, 17, 7), 1, Cal))); // before 09:00 starts at 09:00
    }

    [Fact]
    public void Follows_the_configured_week_and_day()
    {
        var sunThu = new WorkCalendar([DayOfWeek.Sunday, DayOfWeek.Monday, DayOfWeek.Tuesday, DayOfWeek.Wednesday, DayOfWeek.Thursday]);
        Assert.Equal("2026-11-22 11:00", Local(WorkingDays.AddWorkingHours(At(2026, 11, 19, 16), 4, sunThu)));
        var short8 = new WorkCalendar(WorkCalendar.MonFri, null, 8, 16);
        Assert.Equal("2026-11-17 12:00", Local(WorkingDays.AddWorkingHours(At(2026, 11, 17, 8), 4, short8)));
    }

    [Fact]
    public void Working_hours_skip_a_holiday()
    {
        // Wednesday 18 Nov is a holiday: 9 working hours from Tuesday 11:00 land on Thursday 11:00.
        var cal = Cal.WithHolidays([new DateOnly(2026, 11, 18)]);
        Assert.Equal("2026-11-19 11:00", Local(WorkingDays.AddWorkingHours(At(2026, 11, 17, 11), 9, cal)));
    }

    [Fact]
    public void Matrix_hours_in_working_time_forty_five_hours_from_monday_ten()
    {
        var d = FixClock.FixDue(At(2026, 11, 16, 10), 45, Rules);
        Assert.Equal(FixDueSource.Matrix, d.Source);
        Assert.Equal(45, d.Hours);
        Assert.Equal("2026-11-23 10:00", Local(d.DueAt));
    }

    [Fact]
    public void Nine_hours_is_one_working_day_later_eighteen_two()
    {
        Assert.Equal("2026-11-18 11:00", Local(FixClock.FixDue(At(2026, 11, 17, 11), 9, Rules).DueAt));
        Assert.Equal("2026-11-19 11:00", Local(FixClock.FixDue(At(2026, 11, 17, 11), 18, Rules).DueAt));
    }

    [Theory]
    [InlineData(0.0)]
    [InlineData(-5.0)]
    public void An_empty_or_zero_cell_falls_back_to_fourteen_calendar_days(double hours) => AssertFallback(hours);

    [Fact]
    public void A_missing_cell_falls_back_to_fourteen_calendar_days() => AssertFallback(null);

    private static void AssertFallback(double? hours)
    {
        var d = FixClock.FixDue(At(2026, 11, 16, 10), hours, Rules);
        Assert.Equal(FixDueSource.Fallback, d.Source);
        Assert.Null(d.Hours);
        Assert.Equal("2026-11-30", Key(d.DueAt));
    }

    [Fact]
    public void The_fallback_is_a_setting()
    {
        var rules = Rules with { FixFallbackDays = 7 };
        Assert.Equal("2026-11-23", Key(FixClock.FixDue(At(2026, 11, 16, 10), null, rules).DueAt));
    }

    [Fact]
    public void Follows_a_changed_working_week()
    {
        var rules = Rules with { WorkingDays = [DayOfWeek.Sunday, DayOfWeek.Monday, DayOfWeek.Tuesday, DayOfWeek.Wednesday, DayOfWeek.Thursday] };
        Assert.Equal("2026-11-22 11:00", Local(FixClock.FixDue(At(2026, 11, 19, 16), 4, rules).DueAt));
    }

    [Fact]
    public void Approval_is_five_working_days_from_the_proposal()
    {
        Assert.Equal("2026-11-20", Key(FixClock.ApprovalDeadline(At(2026, 11, 13), Rules))); // Friday + 5 working days
        Assert.Equal("2026-11-23", Key(FixClock.ApprovalDeadline(At(2026, 11, 16), Rules)));
        Assert.Equal(3, FixClock.ApprovalDaysLeft(At(2026, 11, 13), At(2026, 11, 17), Rules));
        Assert.Equal(0, FixClock.ApprovalDaysLeft(At(2026, 11, 10), At(2026, 11, 17), Rules));
        Assert.Equal(-5, FixClock.ApprovalDaysLeft(At(2026, 11, 3), At(2026, 11, 17), Rules));
        Assert.Equal(8, FixClock.ApprovalDaysLeft(At(2026, 11, 13), At(2026, 11, 17), Rules with { ApproveDays = 10 }));
    }

    [Fact]
    public void Verification_is_sixty_days_from_done()
    {
        Assert.Equal("2027-01-16", Key(FixClock.VerificationDue(At(2026, 11, 17, 10), Rules)));
        Assert.Equal("2026-12-17", Key(FixClock.VerificationDue(At(2026, 11, 17, 10), Rules with { VerifyDays = 30 })));
    }
}
