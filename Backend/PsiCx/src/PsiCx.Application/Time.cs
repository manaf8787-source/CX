namespace PsiCx.Application;

/// <summary>All "now" reads go through this, so clocks and rules are testable.</summary>
public interface IClock
{
    DateTimeOffset UtcNow { get; }
}

public sealed class SystemClock : IClock
{
    public DateTimeOffset UtcNow => DateTimeOffset.UtcNow;
}

/// <summary>The rules work on UAE wall-clock time (UTC+4, no daylight saving); everything stored is UTC.</summary>
public static class UaeTime
{
    public static readonly TimeSpan Offset = TimeSpan.FromHours(4);

    public static DateTime ToWall(DateTimeOffset utc) => DateTime.SpecifyKind(utc.UtcDateTime + Offset, DateTimeKind.Unspecified);

    public static DateTimeOffset ToUtc(DateTime wall) => new DateTimeOffset(DateTime.SpecifyKind(wall, DateTimeKind.Unspecified), Offset).ToUniversalTime();
}
