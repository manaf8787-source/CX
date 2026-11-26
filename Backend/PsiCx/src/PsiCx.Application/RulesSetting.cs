using System.Text.Json;
using PsiCx.Domain;
using PsiCx.Rules;

namespace PsiCx.Application;

/// <summary>Where the services read the rules from. The rules are a setting the CX manager edits, so a change is picked up at once.</summary>
public interface IRulesSource
{
    Task<RulesBag> RulesAsync(CancellationToken ct = default);
}

/// <summary>
/// Reads the "rules" setting: a list of items { id, value, days? } (the frontend's RuleConfigItem). Ids the code does not know are
/// ignored, and a missing or unreadable item keeps its documented default, so a half-filled setting never breaks a rule.
/// </summary>
public static class RulesSetting
{
    public const string GiftAlertMonthsId = "rule_gift_alert_months";

    public static RulesBag From(JsonElement? value)
    {
        var bag = RulesBag.Default;
        if (value is not { ValueKind: JsonValueKind.Array } list) return bag;
        var by = new Dictionary<string, JsonElement>();
        foreach (var item in list.EnumerateArray())
            if (item.ValueKind == JsonValueKind.Object && item.TryGetProperty("id", out var id) && id.ValueKind == JsonValueKind.String) by[id.GetString()!] = item;

        int Num(string id, int fallback) =>
            by.TryGetValue(id, out var it) && it.TryGetProperty("value", out var v) && v.ValueKind == JsonValueKind.Number && v.TryGetInt32(out var n) ? n : fallback;

        var days = bag.WorkingDays;
        if (by.TryGetValue("rule_working_days", out var wd) && wd.TryGetProperty("days", out var dd) && dd.ValueKind == JsonValueKind.Array)
        {
            var parsed = dd.EnumerateArray().Where(x => x.ValueKind == JsonValueKind.Number && x.TryGetInt32(out var n) && n is >= 0 and <= 6).Select(x => (DayOfWeek)x.GetInt32()).Distinct().ToList();
            if (parsed.Count > 0) days = parsed;
        }
        var p = bag.Patterns;
        return bag with
        {
            Patterns = new PatternRules(
                Num("rule_pattern_same_agent", p.SameAgentMin), Num("rule_pattern_same_issue", p.SameIssueMin),
                Num("rule_pattern_env_concentration", p.EnvironmentConcentrationPct), Num("rule_pattern_window", p.WindowDays), Num("rule_pattern_min_sample", p.MinimumSample)),
            ApproveDays = Num("rule_approval_days", bag.ApproveDays),
            VerifyDays = Num("rule_verification_days", bag.VerifyDays),
            EffectiveDropPct = Num("rule_effective_drop", bag.EffectiveDropPct),
            PublicReplyHours = Num("rule_public_reply", bag.PublicReplyHours),
            PublicReminderHours = Num("rule_public_reminder", bag.PublicReminderHours),
            WorkingDays = days,
            WorkStart = Num("rule_work_start", bag.WorkStart),
            WorkEnd = Num("rule_work_end", bag.WorkEnd),
            FixFallbackDays = Num("rule_fix_fallback_days", bag.FixFallbackDays),
            CallFrom = Num("rule_call_from", bag.CallFrom),
            CallTo = Num("rule_call_to", bag.CallTo),
            CallTries = Num("rule_call_tries", bag.CallTries),
            AiNoAnswers = Num("rule_ai_no_answers", bag.AiNoAnswers),
            NpsCapDays = Num("rule_survey_nps_cap", bag.NpsCapDays),
            CsatCapDays = Num("rule_survey_csat_cap", bag.CsatCapDays),
            SilenceWhyDays = Num("rule_silence_why", bag.SilenceWhyDays),
            ReSurveyMinDays = Num("rule_resurvey_min", bag.ReSurveyMinDays),
            ReSurveyMaxDays = Num("rule_resurvey_max", bag.ReSurveyMaxDays),
            GiftAlertMonths = Num(GiftAlertMonthsId, bag.GiftAlertMonths),
        };
    }
}

/// <summary>Checks the rules setting before it becomes a version: every item has an id and a number, and the gift alert is a whole number of months (1 to 60).</summary>
public sealed class RulesValidator : ISettingValidator
{
    public bool Handles(string key) => key == SettingKeys.Rules;

    public string? Validate(JsonElement value, JsonElement? previous)
    {
        if (value.ValueKind != JsonValueKind.Array) return "The rules are a list.";
        var ids = new HashSet<string>();
        foreach (var item in value.EnumerateArray())
        {
            if (item.ValueKind != JsonValueKind.Object || !item.TryGetProperty("id", out var id) || id.ValueKind != JsonValueKind.String || string.IsNullOrWhiteSpace(id.GetString())) return "Every rule needs an id.";
            if (!ids.Add(id.GetString()!)) return $"The rule '{id.GetString()}' is listed twice.";
            if (!item.TryGetProperty("value", out var v) || v.ValueKind != JsonValueKind.Number) return $"The rule '{id.GetString()}' needs a number.";
            if (v.GetDouble() < 0) return $"The rule '{id.GetString()}' cannot be negative.";
            if (id.GetString() == RulesSetting.GiftAlertMonthsId && (!v.TryGetInt32(out var m) || m is < 1 or > 60)) return "The gift alert is a whole number of months, 1 to 60.";
        }
        return null;
    }
}
