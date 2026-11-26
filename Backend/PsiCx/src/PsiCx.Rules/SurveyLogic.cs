using System.Text.RegularExpressions;
using PsiCx.Domain;

namespace PsiCx.Rules;

public enum QuestionKind { Nps, Rating, Choice, Yesno, Open }

public enum RouteOp { Is, AtLeast, AtMost }

/// <summary>A jump target: the next question, the end of the survey, or a later question by 0-based index.</summary>
public readonly record struct RouteTarget(bool End, int? Index)
{
    public static RouteTarget Next => new(false, null);
    public static RouteTarget Finish => new(true, null);
    public static RouteTarget At(int index) => new(false, index);
}

public sealed record SurveyRoute(RouteOp Op, string Value, RouteTarget To);

public sealed record SurveyRouting(IReadOnlyList<SurveyRoute> Routes, RouteTarget Otherwise);

public sealed record SurveyQuestion(string En, string Ar, string? Kind = null, IReadOnlyList<Bi>? Choices = null, SurveyRouting? Next = null);

public sealed record SurveyAnswerOption(string Value, Bi Label);

/// <summary>
/// The logic of a smart campaign survey (owner's request, 22 Nov). Port of React-Frontend/src/data/surveyLogic.ts:
/// each question says where each answer goes next; a jump only goes forward, so a survey can never loop.
/// </summary>
public static partial class SurveyLogic
{
    [GeneratedRegex(@"\(([^()]*·[^()]*)\)\s*$")]
    private static partial Regex BracketedOptions();

    [GeneratedRegex(@"0 to 10")] private static partial Regex ZeroToTen();
    [GeneratedRegex(@"1 to 5")] private static partial Regex OneToFive();
    [GeneratedRegex(@"yes\s*/\s*no", RegexOptions.IgnoreCase)] private static partial Regex YesNo();

    /// <summary>The options written in brackets, "(a · b · c)", in both languages, or the builder's own list when it has one.</summary>
    public static IReadOnlyList<Bi> OptionsOf(SurveyQuestion q)
    {
        if (q.Choices is { Count: > 0 }) return q.Choices.Where(c => c.En.Trim().Length > 0).ToList();
        static string[] Grab(string s)
        {
            var m = BracketedOptions().Match(s);
            return m.Success ? m.Groups[1].Value.Split('·').Select(x => x.Trim()).Where(x => x.Length > 0).ToArray() : [];
        }
        var en = Grab(q.En);
        var ar = Grab(q.Ar);
        return en.Select((e, i) => new Bi(e, i < ar.Length ? ar[i] : e)).ToList();
    }

    /// <summary>The kind a question carries, or the one its wording implies when it was written before kinds existed.</summary>
    public static QuestionKind KindOf(SurveyQuestion q)
    {
        if (q.Kind is { } k && Enum.TryParse<QuestionKind>(k, ignoreCase: true, out var parsed)) return parsed;
        if (ZeroToTen().IsMatch(q.En)) return QuestionKind.Nps;
        if (OneToFive().IsMatch(q.En)) return QuestionKind.Rating;
        if (YesNo().IsMatch(q.En)) return QuestionKind.Yesno;
        return OptionsOf(q).Count >= 2 ? QuestionKind.Choice : QuestionKind.Open;
    }

    /// <summary>The answers a question can get, as the values a route compares with. Empty for open text.</summary>
    public static IReadOnlyList<SurveyAnswerOption> AnswersOf(SurveyQuestion q) => KindOf(q) switch
    {
        QuestionKind.Yesno => [new("yes", new Bi("Yes", "نعم")), new("no", new Bi("No", "لا"))],
        QuestionKind.Choice => OptionsOf(q).Select(o => new SurveyAnswerOption(o.En, o)).ToList(),
        QuestionKind.Nps => Enumerable.Range(0, 11).Select(i => new SurveyAnswerOption(i.ToString(), new Bi(i.ToString(), i.ToString()))).ToList(),
        QuestionKind.Rating => Enumerable.Range(1, 5).Select(i => new SurveyAnswerOption(i.ToString(), new Bi(i.ToString(), i.ToString()))).ToList(),
        _ => [],
    };

    public static bool Matches(SurveyRoute route, string answer)
    {
        if (route.Op == RouteOp.Is) return answer == route.Value;
        if (!double.TryParse(answer, out var n) || !double.TryParse(route.Value, out var v)) return false;
        return route.Op == RouteOp.AtLeast ? n >= v : n <= v;
    }

    /// <summary>The question after question <paramref name="index"/> for one answer, or null for the end of the survey.</summary>
    public static int? TargetOf(IReadOnlyList<SurveyQuestion> questions, int index, string? answer)
    {
        var q = questions[index];
        var route = answer is null ? null : q.Next?.Routes.FirstOrDefault(r => Matches(r, answer));
        return Resolve(route is not null ? route.To : q.Next?.Otherwise ?? RouteTarget.Next, index, questions.Count);
    }

    public static int? Resolve(RouteTarget t, int index, int count)
    {
        if (t.End) return null;
        var n = t.Index ?? index + 1;
        return n > index && n < count ? n : null;
    }

    /// <summary>What is wrong with one set's questions (empty = valid). Jumps must go forward to a question that exists; routes must name an answer the question can get.</summary>
    public static IReadOnlyList<string> Problems(IReadOnlyList<SurveyQuestion> questions)
    {
        var errors = new List<string>();
        if (questions.Count == 0) errors.Add("A set needs at least one question.");
        for (var i = 0; i < questions.Count; i++)
        {
            var q = questions[i];
            var n = i + 1;
            if (string.IsNullOrWhiteSpace(q.En) || string.IsNullOrWhiteSpace(q.Ar)) errors.Add($"Question {n} needs wording in English and Arabic.");
            var kind = KindOf(q);
            if (kind == QuestionKind.Choice && OptionsOf(q).Count < 2) errors.Add($"Question {n} is a choice and needs at least two options.");
            if (q.Next is null) continue;
            var valid = AnswersOf(q).Select(a => a.Value).ToHashSet();
            foreach (var r in q.Next.Routes)
            {
                if (r.Op == RouteOp.Is && !valid.Contains(r.Value)) errors.Add($"Question {n} routes an answer it cannot get: '{r.Value}'.");
                if (r.Op != RouteOp.Is && (valid.Count == 0 || !double.TryParse(r.Value, out _))) errors.Add($"Question {n} has a range route on a question without a score.");
                CheckTarget(r.To, i, questions.Count, n, errors);
            }
            CheckTarget(q.Next.Otherwise, i, questions.Count, n, errors);
        }
        return errors;
    }

    private static void CheckTarget(RouteTarget t, int index, int count, int number, List<string> errors)
    {
        if (t.Index is { } to && (to <= index || to >= count)) errors.Add($"Question {number} jumps to question {to + 1}: a jump goes forward to a question that exists.");
    }
}
