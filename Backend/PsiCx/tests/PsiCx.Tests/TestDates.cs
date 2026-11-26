namespace PsiCx.Tests;

internal static class T
{
    /// <summary>A wall-clock UAE time: At(2026, 11, 16, 9) = Monday 09:00.</summary>
    public static DateTime At(int y, int m, int d, int h = 0, int min = 0) => new(y, m, d, h, min, 0);

    public static DateTime D(string yyyyMmDd) => DateTime.ParseExact(yyyyMmDd, "yyyy-MM-dd", null);

    public static string Key(DateTime d) => d.ToString("yyyy-MM-dd");

    public static string Local(DateTime d) => d.ToString("yyyy-MM-dd HH:mm");
}
