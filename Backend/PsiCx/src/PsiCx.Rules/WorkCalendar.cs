namespace PsiCx.Rules;

/// <summary>
/// The working week and working day. All rule functions take the calendar as an argument.
/// Dates and times in the rules engine are wall-clock values in UAE time (UTC+4, no daylight saving);
/// the Application layer converts to and from UTC at the edges.
/// </summary>
/// <param name="Days">Weekdays that count as working days (default Monday to Friday; an empty list falls back to it).</param>
/// <param name="Holidays">Dates that are not working days even on a working weekday (UAE public holidays, kept as configuration).</param>
/// <param name="StartHour">Hour the working day starts (09:00).</param>
/// <param name="EndHour">Hour the working day ends (18:00).</param>
public sealed record WorkCalendar(
    IReadOnlyList<DayOfWeek> Days,
    IReadOnlySet<DateOnly>? Holidays = null,
    int StartHour = 9,
    int EndHour = 18)
{
    public static readonly IReadOnlyList<DayOfWeek> MonFri =
        [DayOfWeek.Monday, DayOfWeek.Tuesday, DayOfWeek.Wednesday, DayOfWeek.Thursday, DayOfWeek.Friday];

    public static WorkCalendar Default { get; } = new(MonFri);

    public IReadOnlyList<DayOfWeek> EffectiveDays => Days.Count > 0 ? Days : MonFri;

    public WorkCalendar WithHolidays(IEnumerable<DateOnly> holidays) => this with { Holidays = holidays.ToHashSet() };
}
