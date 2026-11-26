using System.Text.Json;
using System.Text.RegularExpressions;
using PsiCx.Domain;
using PsiCx.Rules;
using PsiCx.Rules.Access;

namespace PsiCx.Application;

public interface ICallSurveyStore
{
    /// <summary>Adds the call; null when this call id is already stored (the webhook is sent twice).</summary>
    Task<CallSurveyItem?> AddAsync(string callId, Func<string, CallSurveyItem> build, CancellationToken ct = default);
    Task<CallSurveyItem?> GetByCallAsync(string callId, CancellationToken ct = default);
    Task<IReadOnlyList<CallSurveyItem>> ListAsync(CancellationToken ct = default);
    /// <summary>Replaces the item only while its status is still the expected one, so two dispatch runs never send twice.</summary>
    Task<bool> TryReplaceAsync(CallSurveyItem next, CallSurveyStatus expected, CancellationToken ct = default);
}

/// <summary>A CRM contact as the call survey needs it: matched by phone, with the consent flags the CRM holds.</summary>
public sealed record CallContact(string PersonId, ProductId? Product, bool Dncr, bool Whatsapp, bool Sms, string? Phone);

/// <summary>The CRM contacts (four environments) and the UAE Do Not Call Registry flag on each. The real one reads the CRM; the in-memory one is for development and tests.</summary>
public interface ICallContactDirectory
{
    Task<CallContact?> FindByPhoneAsync(string phone, CancellationToken ct = default);
    Task<CallContact?> GetAsync(string personId, CancellationToken ct = default);
}

public enum SendOutcome { Sent, Failed, NotConfigured }

/// <summary>Sends the survey on one channel (WhatsApp template, or SMS). The real senders come with the Meta and SMS integrations.</summary>
public interface ICallSurveySender
{
    Task<SendOutcome> SendAsync(CallSurveyItem item, CallContact contact, ChannelId channel, CancellationToken ct = default);
}

/// <summary>Until the channels are connected nothing is sent, and the survey stays scheduled (never marked as sent).</summary>
public sealed class NoCallSurveySender : ICallSurveySender
{
    public Task<SendOutcome> SendAsync(CallSurveyItem item, CallContact contact, ChannelId channel, CancellationToken ct = default) => Task.FromResult(SendOutcome.NotConfigured);
}

public interface ICallSurveyRuleSource
{
    Task<CallSurveyRule> RuleAsync(CancellationToken ct = default);
}

/// <summary>Reads the "call_survey_rule" setting; a missing setting or field keeps the default.</summary>
public sealed class SettingsCallSurveyRuleSource(ISettingsStore settings) : ICallSurveyRuleSource
{
    public async Task<CallSurveyRule> RuleAsync(CancellationToken ct = default) => CallSurveyRuleSetting.From((await settings.CurrentAsync(SettingKeys.CallSurveyRule, ct))?.Value);
}

public static class CallSurveyRuleSetting
{
    public static CallSurveyRule From(JsonElement? value)
    {
        if (value is not { ValueKind: JsonValueKind.Object } v) return CallSurveyRule.Default;
        try { return v.Deserialize<CallSurveyRule>(PsiJson.Create()) ?? CallSurveyRule.Default; }
        catch (JsonException) { return CallSurveyRule.Default; }
    }
}

/// <summary>Checks the rule before it becomes a version.</summary>
public sealed class CallSurveyRuleValidator : ISettingValidator
{
    public bool Handles(string key) => key == SettingKeys.CallSurveyRule;

    public string? Validate(JsonElement value, JsonElement? previous)
    {
        if (value.ValueKind != JsonValueKind.Object) return "The call survey rule is an object.";
        CallSurveyRule? rule;
        try { rule = value.Deserialize<CallSurveyRule>(PsiJson.Create()); }
        catch (JsonException) { return "The call survey rule has a field of the wrong type, or an unknown call result."; }
        return rule is null ? "The call survey rule is empty." : rule.Problem();
    }
}

/// <summary>One "call ended" event as the call center sends it. <c>Qa</c> is accepted but only its score is used (the critical flag is not acted on).</summary>
public sealed record CallEnded(
    string CallId, DateTimeOffset EndedAt, CallDirection Direction, CallHandler HandledBy, string Script, CallResult Result, int TalkSeconds,
    string? Phone, string? ContactId, EnvId EnvId, ProductId? Product = null, string? AgentName = null, CallQa? Qa = null);

public sealed record CallQa(int Score, DateTimeOffset? EvaluatedAt = null, bool? Critical = null);

public sealed record CallIngest(CallSurveyItem Item, bool Duplicate);

public sealed record DispatchResult(int Sent, int Skipped, int Rescheduled, int Failed, int NotConfigured);

public sealed record CallSurveyAnswer(int Csat, int Ces, string? Comment, DateTimeOffset? At);

public enum DropBand { Ok, Amber, Red }
public sealed record ScriptDrop(string Script, int Calls, int Dropped, double RatePct, DropBand Band);
public sealed record CallGroupLine(string Key, int Calls, int Sent, int Answered, int? CsatPct, double? CesAverage);
public sealed record CallSurveyReport(
    int CallsEnded, int Scheduled, int Sent, int Answered, int Failed, int? CsatPct, double? CesAverage,
    IReadOnlyList<Tally<CallSkip>> Skipped, IReadOnlyList<CallGroupLine> ByResult, IReadOnlyList<CallGroupLine> ByHandler, IReadOnlyList<ScriptDrop> DropRates);
public sealed record CallSurveyPreview(int Calls, int SendNow, int SendDraft, IReadOnlyList<Tally<CallSkip>> SkippedNow, IReadOnlyList<Tally<CallSkip>> SkippedDraft);

/// <summary>
/// The survey after a call-center call (spec of 26 Nov): takes the "call ended" event, decides with the rule, schedules, sends (WhatsApp, then SMS),
/// stores the CSAT + CES answer with the call fields, and reports. Left out by the owner's instruction: everything that depends on QA (critical stop,
/// Close the loop item on a critical call, QA bands); a QA score that arrives is only attached to the answer. [Proposed]
/// </summary>
public sealed class CallSurveyService(
    ICallSurveyStore store, ICallContactDirectory contacts, ICallSurveySender sender, ICallSurveyRuleSource ruleSource, IRulesSource rules,
    ISurveyResponseStore responses, SurveyService surveys, IClock clock)
{
    private static readonly Regex E164 = new(@"^\+[1-9]\d{6,14}$", RegexOptions.Compiled);

    private static bool IsCx(Actor a) => a.Role is RoleId.Cxmgr or RoleId.Cxteam;
    private static ServiceResult<T> Deny<T>(Actor? a, string m) => a is null ? ServiceResult<T>.Fail(Failure.Unauthenticated, "Sign in first.") : ServiceResult<T>.Fail(Failure.Forbidden, m);
    private static ServiceResult<T> Invalid<T>(string m) => ServiceResult<T>.Fail(Failure.Invalid, m);

    /// <summary>The call center's webhook. Idempotent on the call id. Until the call center has its own credential, CX roles post it. [Proposed]</summary>
    public async Task<ServiceResult<CallIngest>> IngestAsync(Actor? actor, CallEnded e, CancellationToken ct = default)
    {
        if (actor is null || !IsCx(actor)) return Deny<CallIngest>(actor, "Only CX (or the call-center integration) posts a call.");
        if (string.IsNullOrWhiteSpace(e.CallId)) return Invalid<CallIngest>("A call has an id.");
        if (string.IsNullOrWhiteSpace(e.Script)) return Invalid<CallIngest>("A call has a script or an IVR line.");
        if (e.TalkSeconds < 0) return Invalid<CallIngest>("Talk time cannot be negative.");
        if (e.EndedAt > clock.UtcNow.AddMinutes(5)) return Invalid<CallIngest>("A call cannot end in the future.");
        if (e.Phone is not null && !E164.IsMatch(e.Phone)) return Invalid<CallIngest>("The phone is E.164, like +971501234567.");
        if (e.Qa is { Score: < 0 or > 100 }) return Invalid<CallIngest>("A QA score is 0 to 100.");

        var existing = await store.GetByCallAsync(e.CallId, ct);
        if (existing is not null) return ServiceResult<CallIngest>.Ok(new CallIngest(existing with { Phone = null }, true));

        var rule = await ruleSource.RuleAsync(ct);
        var cap = (await rules.RulesAsync(ct)).CsatCapDays;

        CallContact? contact = null;
        if (!string.IsNullOrWhiteSpace(e.ContactId)) contact = await contacts.GetAsync(e.ContactId, ct);
        else if (e.Phone is not null) contact = await contacts.FindByPhoneAsync(e.Phone, ct);

        int? since = null;
        if (contact is not null && await LastAskedAsync(contact.PersonId, null, ct) is { } last) since = (int)Math.Floor((e.EndedAt - last).TotalDays);

        var decision = CallSurveyLogic.Decide(new CallFacts(e.EndedAt, e.Direction, e.HandledBy, e.Result, e.TalkSeconds, contact is not null, contact?.Dncr ?? false, since), rule, cap);
        var item = await store.AddAsync(e.CallId, id => new CallSurveyItem(
            id, e.CallId.Trim(), e.EndedAt, e.Direction, e.HandledBy, e.Script.Trim(), e.Result, e.TalkSeconds, e.EnvId, e.Product ?? contact?.Product ?? ProductId.Re,
            e.Phone ?? contact?.Phone, contact?.PersonId, e.AgentName?.Trim(),
            decision.Send ? CallSurveyStatus.Scheduled : CallSurveyStatus.Skipped, decision.Skip, decision.SendAt, null, null, null, null, null,
            contact?.Dncr ?? false, since, e.Qa?.Score, null), ct);
        // another request stored the same call between the check and the add
        return item is null
            ? ServiceResult<CallIngest>.Ok(new CallIngest((await store.GetByCallAsync(e.CallId, ct))! with { Phone = null }, true))
            : ServiceResult<CallIngest>.Ok(new CallIngest(item with { Phone = null }, false));
    }

    /// <summary>When this person last got a CSAT or CES survey, from any source: an answer, or a call survey that is scheduled or went out.</summary>
    private async Task<DateTimeOffset?> LastAskedAsync(string personId, string? exceptItemId, CancellationToken ct)
    {
        var times = new List<DateTimeOffset>();
        times.AddRange((await responses.ListAsync(ct)).Where(r => r.PersonId == personId && r.Measure is Measure.Csat or Measure.Ces).Select(r => r.At));
        times.AddRange((await store.ListAsync(ct)).Where(i => i.PersonId == personId && i.Id != exceptItemId && i.Status is CallSurveyStatus.Scheduled or CallSurveyStatus.Sent or CallSurveyStatus.Answered)
            .Select(i => i.SentAt ?? i.SendAt ?? i.EndedAt));
        return times.Count == 0 ? null : times.Max();
    }

    /// <summary>Sends what is due. DNCR and the cap are checked again here (the number may have been registered since the call). Safe to run often.</summary>
    public async Task<DispatchResult> DispatchDueAsync(CancellationToken ct = default)
    {
        int sent = 0, skipped = 0, moved = 0, failed = 0, notConfigured = 0;
        var now = clock.UtcNow;
        var rule = await ruleSource.RuleAsync(ct);
        var cap = (await rules.RulesAsync(ct)).CsatCapDays;
        var due = (await store.ListAsync(ct)).Where(i => i.Status == CallSurveyStatus.Scheduled && i.SendAt <= now).OrderBy(i => i.SendAt).ToList();
        foreach (var i in due)
        {
            if (!rule.Enabled) { await store.TryReplaceAsync(i with { Status = CallSurveyStatus.Skipped, SkipReason = CallSkip.RuleOff }, CallSurveyStatus.Scheduled, ct); skipped++; continue; }
            var contact = i.PersonId is null ? null : await contacts.GetAsync(i.PersonId, ct);
            if (contact is null) { await store.TryReplaceAsync(i with { Status = CallSurveyStatus.Skipped, SkipReason = CallSkip.NotInCrm }, CallSurveyStatus.Scheduled, ct); skipped++; continue; }
            if (contact.Dncr) { await store.TryReplaceAsync(i with { Status = CallSurveyStatus.Skipped, SkipReason = CallSkip.Dncr, OnDncrAtCall = true }, CallSurveyStatus.Scheduled, ct); skipped++; continue; }
            if (await LastAskedAsync(contact.PersonId, i.Id, ct) is { } last && (int)Math.Floor((now - last).TotalDays) < cap && last <= i.EndedAt)
            { await store.TryReplaceAsync(i with { Status = CallSurveyStatus.Skipped, SkipReason = CallSkip.Cap }, CallSurveyStatus.Scheduled, ct); skipped++; continue; }

            // outside the sending hours, or later than the rule allows: wait for the next opening
            if (!CallSurveyLogic.InWindow(now, rule) || now - i.SendAt > CallSurveyLogic.Tolerance(rule))
            { await store.TryReplaceAsync(i with { SendAt = CallSurveyLogic.NextOpening(now, rule) }, CallSurveyStatus.Scheduled, ct); moved++; continue; }

            var channels = new List<ChannelId>();
            if (contact.Whatsapp) channels.Add(ChannelId.Whatsapp);
            if (contact.Sms) channels.Add(ChannelId.Sms);
            if (channels.Count == 0) { await store.TryReplaceAsync(i with { Status = CallSurveyStatus.Failed, FailReason = "no_channel" }, CallSurveyStatus.Scheduled, ct); failed++; continue; }

            var done = false; var anyConfigured = false;
            foreach (var ch in channels)
            {
                var outcome = await sender.SendAsync(i, contact, ch, ct);
                if (outcome == SendOutcome.NotConfigured) continue;
                anyConfigured = true;
                if (outcome != SendOutcome.Sent) continue;
                done = await store.TryReplaceAsync(i with { Status = CallSurveyStatus.Sent, SentAt = now, Channel = ch }, CallSurveyStatus.Scheduled, ct);
                if (done) sent++;
                break;
            }
            if (done) continue;
            if (!anyConfigured) { notConfigured++; continue; }
            await store.TryReplaceAsync(i with { Status = CallSurveyStatus.Failed, FailReason = "send_failed" }, CallSurveyStatus.Scheduled, ct);
            failed++;
        }
        return new DispatchResult(sent, skipped, moved, failed, notConfigured);
    }

    /// <summary>The customer's answer (CSAT 1-5, CES 1-7), stored as two survey answers with the call fields. Posted by the survey channel; CX roles until it has its own credential. [Proposed]</summary>
    public async Task<ServiceResult<CallSurveyItem>> AnswerAsync(Actor? actor, string callId, CallSurveyAnswer a, CancellationToken ct = default)
    {
        if (actor is null || !IsCx(actor)) return Deny<CallSurveyItem>(actor, "Only CX (or the survey channel integration) records an answer.");
        if (a.Csat is < 1 or > 5) return Invalid<CallSurveyItem>("CSAT is 1 to 5.");
        if (a.Ces is < 1 or > 7) return Invalid<CallSurveyItem>("CES is 1 to 7.");
        var i = await store.GetByCallAsync(callId, ct);
        if (i is null) return ServiceResult<CallSurveyItem>.Fail(Failure.NotFound, "Call not found.");
        if (i.Status == CallSurveyStatus.Answered) return ServiceResult<CallSurveyItem>.Fail(Failure.Conflict, "This survey is already answered.");
        if (i.Status != CallSurveyStatus.Sent || i.PersonId is null || i.Channel is null) return Invalid<CallSurveyItem>("Only a survey that was sent can be answered.");
        var at = a.At ?? clock.UtcNow;
        if (at < i.SentAt) return Invalid<CallSurveyItem>("An answer comes after the survey was sent.");

        var human = i.HandledBy == CallHandler.Human;
        var touchpoint = human ? new Bi($"Call center agent · {i.Script}", $"موظف مركز الاتصال · {i.Script}") : new Bi($"AI agent · {i.Script}", $"وكيل الذكاء الاصطناعي · {i.Script}");
        RecordResponse Build(Measure m, int score) => new(
            i.PersonId, i.Product, i.EnvId, m, score, m == Measure.Ces ? 7 : null, i.Channel.Value, at, null,
            Comment: a.Comment, Touchpoint: touchpoint, Digital: false, HandledBy: human ? i.AgentName : null, Unit: null, Moment: CallResults.Label(i.Result),
            // worked out from the customer's words only: the script name must never decide the reason ("Maintenance check")
            Reason: DetractorReasons.Classify(a.Comment, null, false, false, true), CallPending: true,
            CallId: i.CallId, CallResult: i.Result, CallDirection: i.Direction, CallHandler: i.HandledBy, Script: i.Script, QaScore: i.QaScore);

        var first = await surveys.RecordAsync(actor, Build(Measure.Csat, a.Csat), ct);
        if (!first.IsOk) return ServiceResult<CallSurveyItem>.Fail(first.Error!.Value, first.Message!);
        var second = await surveys.RecordAsync(actor, Build(Measure.Ces, a.Ces), ct);
        if (!second.IsOk) return ServiceResult<CallSurveyItem>.Fail(second.Error!.Value, second.Message!);
        var next = i with { Status = CallSurveyStatus.Answered, AnsweredAt = at, CsatScore = a.Csat, CesScore = a.Ces };
        return await store.TryReplaceAsync(next, CallSurveyStatus.Sent, ct)
            ? ServiceResult<CallSurveyItem>.Ok(next with { Phone = null })
            : ServiceResult<CallSurveyItem>.Fail(Failure.Conflict, "This survey was answered at the same moment.");
    }

    /// <summary>The QA score arrives later (a sample of calls). The survey is never held for it; if there is an answer the score is attached to it.</summary>
    public async Task<ServiceResult<CallSurveyItem>> AttachQaAsync(Actor? actor, string callId, int score, CancellationToken ct = default)
    {
        if (actor is null || !IsCx(actor)) return Deny<CallSurveyItem>(actor, "Only CX (or the QA integration) attaches a QA score.");
        if (score is < 0 or > 100) return Invalid<CallSurveyItem>("A QA score is 0 to 100.");
        var i = await store.GetByCallAsync(callId, ct);
        if (i is null) return ServiceResult<CallSurveyItem>.Fail(Failure.NotFound, "Call not found.");
        var next = i with { QaScore = score };
        if (!await store.TryReplaceAsync(next, i.Status, ct)) return ServiceResult<CallSurveyItem>.Fail(Failure.Conflict, "The call changed at the same moment; try again.");
        foreach (var r in (await responses.ListAsync(ct)).Where(r => r.CallId == i.CallId))
            await responses.TryReplaceAsync(r with { QaScore = score }, ct);
        return ServiceResult<CallSurveyItem>.Ok(next with { Phone = null });
    }

    /// <summary>The calls with what became of each survey. CX only (the phone number is never returned here).</summary>
    public async Task<ServiceResult<IReadOnlyList<CallSurveyItem>>> ListAsync(Actor? actor, EnvId? env, CallSurveyStatus? status, DateTimeOffset? from, DateTimeOffset? to, CancellationToken ct = default)
    {
        if (actor is null || !IsCx(actor)) return Deny<IReadOnlyList<CallSurveyItem>>(actor, "Call-level data is read by CX only.");
        var scope = EnvAccess.Effective(actor, env);
        if (!scope.IsOk) return ServiceResult<IReadOnlyList<CallSurveyItem>>.Fail(scope.Error!.Value, scope.Message!);
        var rows = (await store.ListAsync(ct)).Where(i => scope.Value.Includes(i.EnvId) && (status is null || i.Status == status) && (from is null || i.EndedAt >= from) && (to is null || i.EndedAt <= to))
            .OrderByDescending(i => i.EndedAt).Select(i => i with { Phone = null }).ToList();
        return ServiceResult<IReadOnlyList<CallSurveyItem>>.Ok(rows);
    }

    /// <summary>The "Last 30 days with this rule" block. Roles that open Surveys read it; no phone numbers.</summary>
    public async Task<ServiceResult<CallSurveyReport>> ReportAsync(Actor? actor, EnvId? env, DateTimeOffset? from, DateTimeOffset? to, CancellationToken ct = default)
    {
        if (actor is null) return Deny<CallSurveyReport>(actor, "");
        if (!PageAccess.CanAccessPath(actor.Role, "/settings/surveys")) return Deny<CallSurveyReport>(actor, "The survey settings are not open to this role.");
        var scope = EnvAccess.Effective(actor, env);
        if (!scope.IsOk) return ServiceResult<CallSurveyReport>.Fail(scope.Error!.Value, scope.Message!);
        var f = from ?? clock.UtcNow.AddDays(-30);
        var t = to ?? clock.UtcNow;
        var rows = (await store.ListAsync(ct)).Where(i => scope.Value.Includes(i.EnvId) && i.EndedAt >= f && i.EndedAt <= t).ToList();

        static bool WasSent(CallSurveyItem i) => i.Status is CallSurveyStatus.Sent or CallSurveyStatus.Answered;
        CallGroupLine Line(string key, IEnumerable<CallSurveyItem> g)
        {
            var l = g.ToList();
            var ans = l.Where(x => x.Status == CallSurveyStatus.Answered).ToList();
            return new CallGroupLine(key, l.Count, l.Count(WasSent), ans.Count,
                ans.Count == 0 ? null : Indicators.Csat(ans.Select(x => x.CsatScore!.Value).ToList()).Pct,
                ans.Count == 0 ? null : Math.Round(ans.Average(x => x.CesScore!.Value), 1));
        }
        var all = Line("all", rows);
        var skipped = rows.Where(i => i.SkipReason is not null).GroupBy(i => i.SkipReason!.Value).Select(g => new Tally<CallSkip>(g.Key, g.Count())).OrderByDescending(x => x.Count).ThenBy(x => x.Key).ToList();
        var byResult = rows.GroupBy(i => i.Result).OrderBy(g => g.Key).Select(g => Line(Snake(g.Key), g)).ToList();
        var byHandler = rows.GroupBy(i => i.HandledBy).OrderBy(g => g.Key).Select(g => Line(Snake(g.Key), g)).ToList();
        var drops = rows.Where(i => i.Direction == CallDirection.Outbound && i.HandledBy == CallHandler.Ai).GroupBy(i => i.Script).Select(g =>
        {
            var calls = g.Count();
            var dropped = g.Count(x => x.Result == CallResult.DroppedAfterGreeting);
            var rate = Math.Round(100.0 * dropped / calls, 1);
            return new ScriptDrop(g.Key, calls, dropped, rate, rate >= 25 ? DropBand.Red : rate >= 15 ? DropBand.Amber : DropBand.Ok);
        }).OrderByDescending(x => x.RatePct).ThenBy(x => x.Script).ToList();
        return ServiceResult<CallSurveyReport>.Ok(new CallSurveyReport(rows.Count, rows.Count(i => i.Status == CallSurveyStatus.Scheduled), all.Sent, all.Answered,
            rows.Count(i => i.Status == CallSurveyStatus.Failed), all.CsatPct, all.CesAverage, skipped, byResult, byHandler, drops));
    }

    private static string Snake<T>(T v) where T : struct, Enum => JsonNamingPolicy.SnakeCaseLower.ConvertName(v.ToString());

    /// <summary>Replays the stored calls of the last days through a draft rule, next to the saved rule, before the CX manager saves it.</summary>
    public async Task<ServiceResult<CallSurveyPreview>> PreviewAsync(Actor? actor, CallSurveyRule draft, int days, CancellationToken ct = default)
    {
        if (actor is null || actor.Role != RoleId.Cxmgr) return Deny<CallSurveyPreview>(actor, "The CX manager previews a rule change.");
        if (days is < 1 or > 90) return Invalid<CallSurveyPreview>("Preview 1 to 90 days.");
        if (draft.Problem() is { } p) return Invalid<CallSurveyPreview>(p);
        var current = await ruleSource.RuleAsync(ct);
        var cap = (await rules.RulesAsync(ct)).CsatCapDays;
        var since = clock.UtcNow.AddDays(-days);
        var rows = (await store.ListAsync(ct)).Where(i => i.EndedAt >= since).ToList();
        CallDecision Run(CallSurveyItem i, CallSurveyRule r) =>
            CallSurveyLogic.Decide(new CallFacts(i.EndedAt, i.Direction, i.HandledBy, i.Result, i.TalkSeconds, i.PersonId is not null, i.OnDncrAtCall, i.DaysSinceLastCsat), r, cap);
        var now = rows.Select(i => Run(i, current)).ToList();
        var next = rows.Select(i => Run(i, draft)).ToList();
        static List<Tally<CallSkip>> Skips(List<CallDecision> d) =>
            d.Where(x => x.Skip is not null).GroupBy(x => x.Skip!.Value).Select(g => new Tally<CallSkip>(g.Key, g.Count())).OrderByDescending(x => x.Count).ThenBy(x => x.Key).ToList();
        return ServiceResult<CallSurveyPreview>.Ok(new CallSurveyPreview(rows.Count, now.Count(x => x.Send), next.Count(x => x.Send), Skips(now), Skips(next)));
    }

    public async Task<ServiceResult<DispatchResult>> DispatchNowAsync(Actor? actor, CancellationToken ct = default)
        => actor is null || actor.Role != RoleId.Cxmgr ? Deny<DispatchResult>(actor, "The CX manager runs the sending.") : ServiceResult<DispatchResult>.Ok(await DispatchDueAsync(ct));
}
