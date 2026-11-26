namespace PsiCx.Rules;

public sealed record NpsResult(int Responses, int Promoters, int Passives, int Detractors, int? Score);

public sealed record SharePct(int Responses, int Favourable, int? Pct);

/// <summary>
/// NPS, CSAT and CES (the portal's glossary). NPS: 9 and 10 promoters, 7 and 8 passives, 0 to 6 detractors; % promoters minus % detractors, -100 to +100.
/// CSAT: 1 to 5, the share who answered 4 or 5. CES: 1 to 7 or 1 to 5, the share at the easy end [Proposed: top three of seven, top two of five].
/// A score with no responses is null, never 0. There is no group NPS: callers always pass one product's responses.
/// </summary>
public static class Indicators
{
    public static NpsResult Nps(IReadOnlyCollection<int> scores)
    {
        var p = scores.Count(s => s >= 9);
        var d = scores.Count(s => s <= 6);
        var n = scores.Count;
        return new NpsResult(n, p, n - p - d, d, n == 0 ? null : (int)Math.Round((p - d) * 100.0 / n, MidpointRounding.AwayFromZero));
    }

    public static SharePct Csat(IReadOnlyCollection<int> scores) => Share(scores, s => s >= 4);

    public static SharePct Ces(IReadOnlyCollection<int> scores, int scale)
    {
        var easy = scale == 7 ? 5 : 4;
        return Share(scores, s => s >= easy);
    }

    private static SharePct Share(IReadOnlyCollection<int> scores, Func<int, bool> favourable)
    {
        var f = scores.Count(favourable);
        return new SharePct(scores.Count, f, scores.Count == 0 ? null : (int)Math.Round(f * 100.0 / scores.Count, MidpointRounding.AwayFromZero));
    }

    /// <summary>The re-survey score against the first score (7 to 14 days after resolution); positive = recovered.</summary>
    public static int RecoveryDelta(int firstScore, int reSurveyScore) => reSurveyScore - firstScore;
}
