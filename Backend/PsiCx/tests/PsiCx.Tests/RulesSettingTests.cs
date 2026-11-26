using System.Text.Json;
using PsiCx.Application;
using PsiCx.Domain;
using PsiCx.Infrastructure;
using static PsiCx.Domain.RoleId;

namespace PsiCx.Tests;

public class RulesSettingTests
{
    private static JsonElement J(string json) => JsonDocument.Parse(json).RootElement.Clone();

    [Fact]
    public void Known_rules_are_read_and_the_rest_keep_their_defaults()
    {
        var bag = RulesSetting.From(J("""[{"id":"rule_approval_days","value":3},{"id":"rule_gift_alert_months","value":3},{"id":"rule_working_days","value":6,"days":[0,1,2,3,4,6]},{"id":"rule_unknown","value":9}]"""));
        Assert.Equal(3, bag.ApproveDays);
        Assert.Equal(3, bag.GiftAlertMonths);
        Assert.Equal(60, bag.VerifyDays);
        Assert.True(bag.WorkingDays.Contains(DayOfWeek.Sunday));
        Assert.False(bag.WorkingDays.Contains(DayOfWeek.Friday));
    }

    [Fact]
    public void A_missing_or_broken_setting_gives_the_documented_defaults()
    {
        Assert.Equal(6, RulesSetting.From(null).GiftAlertMonths);
        Assert.Equal(6, RulesSetting.From(J("{}")).GiftAlertMonths);
        Assert.Equal(5, RulesSetting.From(J("""[{"id":"rule_approval_days","value":"five"}]""")).ApproveDays);
    }

    [Fact]
    public async Task The_manager_changes_the_gift_alert_months_and_it_is_checked()
    {
        var clock = new FakeClock(new DateTimeOffset(2026, 11, 26, 8, 0, 0, TimeSpan.Zero));
        var settings = new SettingsService(new InMemorySettingsStore(), new AuditService(new InMemoryAuditStore(), clock), clock, [new RulesValidator()]);
        var mgr = new Actor("u-cx", "cx@psi.sample", Cxmgr);
        Assert.Equal(Failure.Invalid, (await settings.PutAsync(mgr, SettingKeys.Rules, J("""[{"id":"rule_gift_alert_months","value":0}]"""), 0, null)).Error);
        Assert.Equal(Failure.Invalid, (await settings.PutAsync(mgr, SettingKeys.Rules, J("""[{"id":"rule_gift_alert_months","value":2.5}]"""), 0, null)).Error);
        Assert.Equal(Failure.Invalid, (await settings.PutAsync(mgr, SettingKeys.Rules, J("""[{"id":"a","value":1},{"id":"a","value":2}]"""), 0, null)).Error);
        Assert.Equal(Failure.Forbidden, (await settings.PutAsync(new Actor("u-t", "t@psi.sample", Cxteam), SettingKeys.Rules, J("""[{"id":"rule_gift_alert_months","value":3}]"""), 0, null)).Error);
        Assert.True((await settings.PutAsync(mgr, SettingKeys.Rules, J("""[{"id":"rule_gift_alert_months","value":3}]"""), 0, null)).IsOk);
        // the fix inputs now read the saved value
        var store = new InMemorySettingsStore();
        var s2 = new SettingsService(store, new AuditService(new InMemoryAuditStore(), clock), clock, [new RulesValidator()]);
        await s2.PutAsync(mgr, SettingKeys.Rules, J("""[{"id":"rule_gift_alert_months","value":4},{"id":"rule_approval_days","value":2}]"""), 0, null);
        var inputs = new SettingsFixClockInputs(store, new NoVipPatterns());
        var rules = await inputs.RulesAsync();
        Assert.Equal(4, rules.GiftAlertMonths);
        Assert.Equal(2, rules.ApproveDays);
    }
}
