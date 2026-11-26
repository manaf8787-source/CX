namespace PsiCx.Rules;

/// <summary>Working-day arithmetic. Port of React-Frontend/src/utils/workingDays.ts; same results, same edge cases.</summary>
public static class WorkingDays
{
    public static bool IsWorkingDay(DateTime value, WorkCalendar? cal = null)
    {
        cal ??= WorkCalendar.Default;
        var d = value.Date;
        return cal.EffectiveDays.Contains(d.DayOfWeek)
            && !(cal.Holidays?.Contains(DateOnly.FromDateTime(d)) ?? false);
    }

    /// <summary>The first working day strictly after <paramref name="from"/>.</summary>
    public static DateTime NextWorkingDay(DateTime from, WorkCalendar? cal = null)
    {
        var d = from.Date.AddDays(1);
        for (var guard = 0; guard < 400 && !IsWorkingDay(d, cal); guard++) d = d.AddDays(1);
        return d;
    }

    /// <summary><paramref name="from"/> plus <paramref name="n"/> working days (n may be negative; 0 returns the same day).</summary>
    public static DateTime AddWorkingDays(DateTime from, int n, WorkCalendar? cal = null)
    {
        var d = from.Date;
        var step = n < 0 ? -1 : 1;
        var left = Math.Abs(n);
        for (var guard = 0; left > 0 && guard < 4000; guard++)
        {
            d = d.AddDays(step);
            if (IsWorkingDay(d, cal)) left--;
        }
        return d;
    }

    /// <summary>
    /// Signed working days from <paramref name="from"/> (exclusive) to <paramref name="to"/> (inclusive):
    /// Monday to Wednesday is 2; Wednesday to Monday is -2.
    /// </summary>
    public static int WorkingDaysBetween(DateTime from, DateTime to, WorkCalendar? cal = null)
    {
        var a = from.Date;
        var b = to.Date;
        if (a == b) return 0;
        var forward = b > a;
        var (lo, hi) = forward ? (a, b) : (b, a);
        var n = 0;
        var guard = 0;
        for (var d = lo.AddDays(1); d <= hi && guard < 4000; d = d.AddDays(1), guard++)
            if (IsWorkingDay(d, cal)) n++;
        return forward ? n : -n;
    }

    /// <summary>Working days left until <paramref name="due"/>, counted from <paramref name="today"/> (negative = late).</summary>
    public static int WorkingDaysLeft(DateTime due, DateTime today, WorkCalendar? cal = null)
        => WorkingDaysBetween(today, due, cal);

    /// <summary>Calendar days from <paramref name="today"/> to <paramref name="due"/> (negative = late).</summary>
    public static int CalendarDaysLeft(DateTime due, DateTime today) => (due.Date - today.Date).Days;

    /// <summary>The next occurrence (today included) of a weekday. Used for "every Thursday".</summary>
    public static DateOnly NextWeekday(DateTime from, DayOfWeek weekday)
    {
        var d = from.Date;
        for (var guard = 0; d.DayOfWeek != weekday && guard < 8; guard++) d = d.AddDays(1);
        return DateOnly.FromDateTime(d);
    }

    /// <summary>
    /// <paramref name="from"/> plus <paramref name="hours"/> working hours on the calendar's working day
    /// (default 09:00 to 18:00, so 9 hours is one working day). A start outside working time begins at the next opening.
    /// </summary>
    public static DateTime AddWorkingHours(DateTime from, double hours, WorkCalendar? cal = null)
    {
        cal ??= WorkCalendar.Default;
        double start = cal.StartHour, end = cal.EndHour;
        var day = from.Date;
        var hour = from.Hour + from.Minute / 60.0 + from.Second / 3600.0;
        if (!IsWorkingDay(day, cal) || hour >= end)
        {
            day = NextWorkingDay(day, cal);
            hour = start;
        }
        else if (hour < start)
        {
            hour = start;
        }

        var left = Math.Max(0, hours);
        for (var guard = 0; guard < 4000; guard++)
        {
            var room = end - hour;
            if (left <= room)
            {
                hour += left;
                break;
            }
            left -= room;
            day = NextWorkingDay(day, cal);
            hour = start;
        }
        return day.AddMinutes(Math.Round(hour * 60, MidpointRounding.AwayFromZero));
    }
}
