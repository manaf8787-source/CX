using PsiCx.Rules;
using static PsiCx.Tests.T;

namespace PsiCx.Tests;

// Cases ported from React-Frontend/src/utils/workingDays.test.ts.
// 2026-11-16 is a Monday, 20 a Friday, 21 a Saturday, 22 a Sunday, 23 the next Monday.
public class WorkingDaysTests
{
    [Fact]
    public void Default_week_is_monday_to_friday()
    {
        Assert.Equal(5, WorkCalendar.MonFri.Count);
        Assert.True(WorkingDays.IsWorkingDay(D("2026-11-16")));
        Assert.True(WorkingDays.IsWorkingDay(D("2026-11-20"))); // Friday works under the KB week
        Assert.False(WorkingDays.IsWorkingDay(D("2026-11-21")));
        Assert.False(WorkingDays.IsWorkingDay(D("2026-11-22")));
    }

    [Fact]
    public void Counts_working_days_from_start_exclusive_to_end_inclusive()
    {
        Assert.Equal(2, WorkingDays.WorkingDaysBetween(D("2026-11-16"), D("2026-11-18")));
        Assert.Equal(1, WorkingDays.WorkingDaysBetween(D("2026-11-20"), D("2026-11-23"))); // Friday to Monday
        Assert.Equal(5, WorkingDays.WorkingDaysBetween(D("2026-11-16"), D("2026-11-23")));
        Assert.Equal(0, WorkingDays.WorkingDaysBetween(D("2026-11-17"), D("2026-11-17")));
        Assert.Equal(0, WorkingDays.WorkingDaysBetween(D("2026-11-21"), D("2026-11-22"))); // a weekend only
    }

    [Fact]
    public void Negative_when_the_end_is_before_the_start()
    {
        Assert.Equal(-2, WorkingDays.WorkingDaysBetween(D("2026-11-18"), D("2026-11-16")));
        Assert.Equal(-2, WorkingDays.WorkingDaysLeft(D("2026-11-16"), D("2026-11-18")));
        Assert.Equal(3, WorkingDays.WorkingDaysLeft(D("2026-11-20"), D("2026-11-17")));
    }

    [Fact]
    public void Adds_and_subtracts_working_days_across_weekends()
    {
        Assert.Equal("2026-11-23", Key(WorkingDays.AddWorkingDays(D("2026-11-20"), 1)));
        Assert.Equal("2026-11-23", Key(WorkingDays.AddWorkingDays(D("2026-11-16"), 5)));
        Assert.Equal("2026-11-20", Key(WorkingDays.AddWorkingDays(D("2026-11-23"), -1)));
        Assert.Equal("2026-11-17", Key(WorkingDays.AddWorkingDays(D("2026-11-17"), 0)));
        Assert.Equal("2026-11-23", Key(WorkingDays.NextWorkingDay(D("2026-11-20"))));
        Assert.Equal("2026-11-18", Key(WorkingDays.NextWorkingDay(D("2026-11-17"))));
    }

    [Fact]
    public void Works_for_another_week_sunday_to_thursday()
    {
        var sunThu = new WorkCalendar([DayOfWeek.Sunday, DayOfWeek.Monday, DayOfWeek.Tuesday, DayOfWeek.Wednesday, DayOfWeek.Thursday]);
        Assert.False(WorkingDays.IsWorkingDay(D("2026-11-20"), sunThu));
        Assert.Equal("2026-11-22", Key(WorkingDays.NextWorkingDay(D("2026-11-19"), sunThu)));
        Assert.Equal(2, WorkingDays.WorkingDaysBetween(D("2026-11-19"), D("2026-11-23"), sunThu));
    }

    [Fact]
    public void Skips_holidays()
    {
        var cal = WorkCalendar.Default.WithHolidays([new DateOnly(2026, 11, 18)]);
        Assert.False(WorkingDays.IsWorkingDay(D("2026-11-18"), cal));
        Assert.Equal(2, WorkingDays.WorkingDaysBetween(D("2026-11-16"), D("2026-11-19"), cal));
        Assert.Equal("2026-11-19", Key(WorkingDays.AddWorkingDays(D("2026-11-17"), 1, cal)));
    }

    [Fact]
    public void A_holiday_on_a_friday_moves_the_next_working_day_to_monday()
    {
        var cal = WorkCalendar.Default.WithHolidays([new DateOnly(2026, 11, 20)]);
        Assert.Equal("2026-11-23", Key(WorkingDays.NextWorkingDay(D("2026-11-19"), cal)));
    }

    [Fact]
    public void Falls_back_to_monday_to_friday_for_an_empty_week_instead_of_looping()
    {
        var empty = new WorkCalendar([]);
        Assert.True(WorkingDays.IsWorkingDay(D("2026-11-17"), empty));
        Assert.Equal("2026-11-23", Key(WorkingDays.NextWorkingDay(D("2026-11-20"), empty)));
    }

    [Fact]
    public void Finds_the_next_thursday_today_included()
    {
        Assert.Equal(new DateOnly(2026, 11, 19), WorkingDays.NextWeekday(D("2026-11-17"), DayOfWeek.Thursday));
        Assert.Equal(new DateOnly(2026, 11, 19), WorkingDays.NextWeekday(D("2026-11-19"), DayOfWeek.Thursday));
        Assert.Equal(new DateOnly(2026, 11, 26), WorkingDays.NextWeekday(D("2026-11-20"), DayOfWeek.Thursday));
    }

    [Fact]
    public void Counts_calendar_days()
    {
        Assert.Equal(3, WorkingDays.CalendarDaysLeft(D("2026-11-20"), D("2026-11-17")));
        Assert.Equal(-2, WorkingDays.CalendarDaysLeft(D("2026-11-15"), D("2026-11-17")));
    }
}
