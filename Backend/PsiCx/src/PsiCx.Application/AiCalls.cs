using System.Text.Json;
using System.Text.RegularExpressions;
using PsiCx.Domain;
using PsiCx.Rules;

namespace PsiCx.Application;

public interface IAiCallStore
{
    /// <summary>Replaces every row and extra with a date in the range by the ones given (the sync sends the complete range), and records the refresh time.</summary>
    Task ReplaceDailyAsync(DateOnly from, DateOnly to, IReadOnlyList<AiCallDailyRow> rows, IReadOnlyList<AiCallDailyExtra> extras, DateTimeOffset refreshedAt, CancellationToken ct = default);
    /// <summary>Upserts by campaign and environment.</summary>
    Task UpsertCampaignsAsync(IReadOnlyList<AiCampaignTotals> campaigns, DateTimeOffset refreshedAt, CancellationToken ct = default);
    Task<IReadOnlyList<AiCallDailyRow>> RowsAsync(CancellationToken ct = default);
    Task<IReadOnlyList<AiCallDailyExtra>> ExtrasAsync(CancellationToken ct = default);
    Task<IReadOnlyList<AiCampaignTotals>> CampaignsAsync(CancellationToken ct = default);
    Task<DateTimeOffset?> LastRefreshAsync(CancellationToken ct = default);
    /// <summary>Adds the event; null when this call id is already stored.</summary>
    Task<AiCallEvent?> AddEventAsync(string callId, Func<string, AiCallEvent> build, CancellationToken ct = default);
    Task<AiCallEvent?> GetEventAsync(string callId, CancellationToken ct = default);
    Task<IReadOnlyList<AiCallEvent>> EventsAsync(CancellationToken ct = default);
}

/// <summary>The CX manager's changes to the BrightCall outcome mapping: code to the call result it counts as.</summary>
public interface IBrightcallMappingSource
{
    Task<IReadOnlyDictionary<string, MappedResult>> OverridesAsync(CancellationToken ct = default);
}

public sealed class SettingsBrightcallMappingSource(ISettingsStore settings) : IBrightcallMappingSource
{
    public async Task<IReadOnlyDictionary<string, MappedResult>> OverridesAsync(CancellationToken ct = default)
    {
        if ((await settings.CurrentAsync(SettingKeys.BrightcallMapping, ct))?.Value is not { ValueKind: JsonValueKind.Object } v) return new Dictionary<string, MappedResult>();
        try { return v.Deserialize<Dictionary<string, MappedResult>>(PsiJson.Create()) ?? []; }
        catch (JsonException) { return new Dictionary<string, MappedResult>(); }
    }
}

/// <summary>The mapping setting: an object of outcome code to portal call result. Any code may be listed (a new outcome BrightCall starts sending).</summary>
public sealed class BrightcallMappingValidator : ISettingValidator
{
    public bool Handles(string key) => key == SettingKeys.BrightcallMapping;

    public string? Validate(JsonElement value, JsonElement? previous)
    {
        if (value.ValueKind != JsonValueKind.Object) return "The mapping is an object: outcome code to call result.";
        foreach (var p in value.EnumerateObject())
        {
            if (string.IsNullOrWhiteSpace(p.Name)) return "An outcome code cannot be empty.";
            if (p.Value.ValueKind != JsonValueKind.String || !Enum.TryParse<MappedResult>(p.Value.GetString()?.Replace("_", ""), true, out _)) return $"'{p.Name}' needs one of the portal call results.";
        }
        return null;
    }
}

public sealed record AiCallSync(DateOnly From, DateOnly To, IReadOnlyList<AiCallDailyRow> Rows, IReadOnlyList<AiCallDailyExtra> Extras);
public sealed record AiCallSyncResult(int Rows, int Extras, DateTimeOffset RefreshedAt, IReadOnlyList<string> Unmapped);

public sealed record OutcomeInfo(string Code, CallGroup Group, MappedResult Result, Bi Label, bool Lead, bool Complaint, bool Edited, bool SendsSurvey);
public sealed record OutcomeMapping(IReadOnlyList<OutcomeInfo> Outcomes, IReadOnlyList<string> Unmapped);

/// <summary>One per-call event from BrightCall (only the calls the portal acts on). Phone is used to match the CRM contact and is not stored here.</summary>
public sealed record BrightcallCall(
    string CallId, DateTimeOffset EndedAt, EnvId EnvId, string Campaign, string Outcome, CallDirection Direction, CallHandler HandledBy, int TalkSeconds,
    string? Phone, string? ContactId, CallSentiment? Sentiment, string? RecordingUrl, string? AgentName = null);

public enum AiCallAction { Ignored, Survey, Complaint, SurveyAndComplaint }
public sealed record AiCallEventResult(AiCallAction Action, bool Duplicate, AiCallEvent? Event, CallSurveyItem? Survey, string? SignalId);

/// <summary>
/// The AI call center page (BrightCall, 26 Nov): daily totals only, the outcome mapping, and the per-call events that can send the survey or raise a
/// complaint signal. CX manager and CX team. Read-only toward BrightCall: the portal never changes anything there.
/// </summary>
public sealed class AiCallService(
    IAiCallStore store, IBrightcallMappingSource mapping, ICallSurveyRuleSource ruleSource, CallSurveyService callSurveys, SignalService signals,
    ICallContactDirectory contacts, IClock clock)
{
    private static readonly Regex E164 = new(@"^\+[1-9]\d{6,14}$", RegexOptions.Compiled);
    public const int MaxRangeDays = 366;

    private static bool IsCx(Actor a) => a.Role is RoleId.Cxmgr or RoleId.Cxteam;
    private static ServiceResult<T> Deny<T>(Actor? a) => a is null ? ServiceResult<T>.Fail(Failure.Unauthenticated, "Sign in first.") : ServiceResult<T>.Fail(Failure.Forbidden, "The AI call center is for the CX manager and the CX team.");
    private static ServiceResult<T> Invalid<T>(string m) => ServiceResult<T>.Fail(Failure.Invalid, m);

    /// <summary>The hourly refresh of today and the nightly re-run of the last two days. The batch is the complete range; what it replaces is gone. CX roles post it until the integration has its own credential. [Proposed]</summary>
    public async Task<ServiceResult<AiCallSyncResult>> SyncDailyAsync(Actor? actor, AiCallSync b, CancellationToken ct = default)
    {
        if (actor is null || !IsCx(actor)) return Deny<AiCallSyncResult>(actor);
        if (b.To < b.From) return Invalid<AiCallSyncResult>("The range ends before it starts.");
        if (b.To.DayNumber - b.From.DayNumber >= MaxRangeDays) return Invalid<AiCallSyncResult>($"A sync covers at most {MaxRangeDays} days.");
        var today = DateOnly.FromDateTime(UaeTime.ToWall(clock.UtcNow));
        if (b.To > today) return Invalid<AiCallSyncResult>("A day cannot be in the future (Gulf time).");
        var keys = new HashSet<(DateOnly, EnvId, string, string)>();
        foreach (var r in b.Rows)
        {
            if (r.Date < b.From || r.Date > b.To) return Invalid<AiCallSyncResult>("A row is outside the range.");
            if (string.IsNullOrWhiteSpace(r.Campaign) || string.IsNullOrWhiteSpace(r.Outcome)) return Invalid<AiCallSyncResult>("A row needs a campaign and an outcome.");
            if (r.Calls < 0 || r.Contacts < 0 || r.Cost < 0) return Invalid<AiCallSyncResult>("Calls, contacts and cost cannot be negative.");
            if (!keys.Add((r.Date, r.EnvId, r.Campaign.Trim(), r.Outcome.Trim()))) return Invalid<AiCallSyncResult>($"The row for {r.Date:yyyy-MM-dd}, {r.Campaign}, {r.Outcome} is listed twice.");
        }
        var ek = new HashSet<(DateOnly, EnvId, string)>();
        foreach (var x in b.Extras)
        {
            if (x.Date < b.From || x.Date > b.To) return Invalid<AiCallSyncResult>("An extra is outside the range.");
            if (string.IsNullOrWhiteSpace(x.Campaign)) return Invalid<AiCallSyncResult>("An extra needs a campaign.");
            if (x.Drops.Within20s < 0 || x.Drops.After1min < 0 || x.Drops.PositiveThenDropped < 0 || x.Sentiment.Positive < 0 || x.Sentiment.Neutral < 0 || x.Sentiment.Negative < 0) return Invalid<AiCallSyncResult>("Drops and sentiment cannot be negative.");
            if (!ek.Add((x.Date, x.EnvId, x.Campaign.Trim()))) return Invalid<AiCallSyncResult>($"The extra for {x.Date:yyyy-MM-dd}, {x.Campaign} is listed twice.");
        }
        var rows = b.Rows.Select(r => r with { Campaign = r.Campaign.Trim(), Outcome = r.Outcome.Trim() }).ToList();
        var extras = b.Extras.Select(x => x with { Campaign = x.Campaign.Trim() }).ToList();
        var now = clock.UtcNow;
        await store.ReplaceDailyAsync(b.From, b.To, rows, extras, now, ct);
        var overrides = await mapping.OverridesAsync(ct);
        var unmapped = rows.Select(r => r.Outcome).Distinct().Where(o => !BrightcallMapping.Lookup(o, overrides).Known).OrderBy(o => o, StringComparer.Ordinal).ToList();
        return ServiceResult<AiCallSyncResult>.Ok(new AiCallSyncResult(rows.Count, extras.Count, now, unmapped));
    }

    public async Task<ServiceResult<int>> SyncCampaignsAsync(Actor? actor, IReadOnlyList<AiCampaignTotals> campaigns, CancellationToken ct = default)
    {
        if (actor is null || !IsCx(actor)) return Deny<int>(actor);
        foreach (var c in campaigns)
        {
            if (string.IsNullOrWhiteSpace(c.Campaign)) return Invalid<int>("A campaign has a name.");
            if (c.Targeted < 0 || c.Attempted < 0) return Invalid<int>("Targeted and attempted cannot be negative.");
        }
        if (campaigns.GroupBy(c => (c.Campaign.Trim(), c.EnvId)).Any(g => g.Count() > 1)) return Invalid<int>("A campaign is listed twice for the same environment.");
        await store.UpsertCampaignsAsync(campaigns.Select(c => c with { Campaign = c.Campaign.Trim() }).ToList(), clock.UtcNow, ct);
        return ServiceResult<int>.Ok(campaigns.Count);
    }

    /// <summary>The whole Overview for a filter. The period is the last <paramref name="days"/> days including today (Gulf time) [Proposed]; the user's environment scope applies first.</summary>
    public async Task<ServiceResult<AiCallSummary>> SummaryAsync(Actor? actor, int days, EnvId? env, string? campaign, CancellationToken ct = default)
    {
        if (actor is null || !IsCx(actor)) return Deny<AiCallSummary>(actor);
        if (days is < 1 or > 365) return Invalid<AiCallSummary>("The period is 1 to 365 days.");
        var scope = EnvAccess.Effective(actor, env);
        if (!scope.IsOk) return ServiceResult<AiCallSummary>.Fail(scope.Error!.Value, scope.Message!);
        var from = DateOnly.FromDateTime(UaeTime.ToWall(clock.UtcNow)).AddDays(-(days - 1));
        var rule = await ruleSource.RuleAsync(ct);
        var s = AiCallSums.Summarize(await store.RowsAsync(ct), await store.ExtrasAsync(ct), await store.CampaignsAsync(ct), await mapping.OverridesAsync(ct),
            rule.Results.Where(CallResults.Completed).ToHashSet(), new AiCallFilter(from, scope.Value, string.IsNullOrWhiteSpace(campaign) ? null : campaign));
        return ServiceResult<AiCallSummary>.Ok(s with { LastRefreshAt = await store.LastRefreshAsync(ct) });
    }

    /// <summary>The Outcome mapping tab: every default outcome with the result in force, and the codes that arrived with no mapping (the warning).</summary>
    public async Task<ServiceResult<OutcomeMapping>> OutcomesAsync(Actor? actor, CancellationToken ct = default)
    {
        if (actor is null || !IsCx(actor)) return Deny<OutcomeMapping>(actor);
        var overrides = await mapping.OverridesAsync(ct);
        var rule = await ruleSource.RuleAsync(ct);
        bool Sends(MappedResult r) => r.ToCallResult() is { } c && rule.Results.Contains(c);
        var codes = BrightcallMapping.Defaults.Select(d => d.Code).Concat(overrides.Keys).Distinct().ToList();
        var list = codes.Select(c =>
        {
            var (o, _, edited) = BrightcallMapping.Lookup(c, overrides);
            return new OutcomeInfo(c, o.Group, o.Result, MappedResults.Label(o.Result), o.Lead, o.Complaint, edited, Sends(o.Result));
        }).ToList();
        var unmapped = (await store.RowsAsync(ct)).Select(r => r.Outcome).Distinct().Where(o => !BrightcallMapping.Lookup(o, overrides).Known).OrderBy(o => o, StringComparer.Ordinal).ToList();
        return ServiceResult<OutcomeMapping>.Ok(new OutcomeMapping(list, unmapped));
    }

    private static string EnvLabel(EnvId e) => e switch { EnvId.Dub => "Dubai", EnvId.Auh => "Abu Dhabi", EnvId.Ast => "PSI Assets", _ => "PSI-AI" };

    /// <summary>
    /// A per-call event. It is acted on only when its outcome maps to a result in the survey rule's sendOn (the call is handed to the call survey, with the
    /// campaign as its script) or when the outcome is a complaint (a complaint signal for the matched CRM contact; counted but unlinked when there is none).
    /// Any other call is ignored: the totals already count it.
    /// </summary>
    public async Task<ServiceResult<AiCallEventResult>> EventAsync(Actor? actor, BrightcallCall c, CancellationToken ct = default)
    {
        if (actor is null || !IsCx(actor)) return Deny<AiCallEventResult>(actor);
        if (string.IsNullOrWhiteSpace(c.CallId) || string.IsNullOrWhiteSpace(c.Campaign) || string.IsNullOrWhiteSpace(c.Outcome)) return Invalid<AiCallEventResult>("A call needs an id, a campaign and an outcome.");
        if (c.TalkSeconds < 0) return Invalid<AiCallEventResult>("Talk time cannot be negative.");
        if (c.EndedAt > clock.UtcNow.AddMinutes(5)) return Invalid<AiCallEventResult>("A call cannot end in the future.");
        if (c.Phone is not null && !E164.IsMatch(c.Phone)) return Invalid<AiCallEventResult>("The phone is E.164, like +971501234567.");
        if (c.RecordingUrl is not null && !(Uri.TryCreate(c.RecordingUrl, UriKind.Absolute, out var u) && u.Scheme == Uri.UriSchemeHttps)) return Invalid<AiCallEventResult>("The recording is an https link into BrightCall.");

        var existing = await store.GetEventAsync(c.CallId, ct);
        if (existing is not null) return ServiceResult<AiCallEventResult>.Ok(new AiCallEventResult(ActionOf(existing), true, existing, null, existing.SignalId));

        var (o, _, _) = BrightcallMapping.Lookup(c.Outcome.Trim(), await mapping.OverridesAsync(ct));
        var rule = await ruleSource.RuleAsync(ct);
        var result = o.Result.ToCallResult();
        var survey = result is { } cr && CallResults.Completed(cr) && rule.Results.Contains(cr);
        var complaint = o.Complaint;
        if (!survey && !complaint) return ServiceResult<AiCallEventResult>.Ok(new AiCallEventResult(AiCallAction.Ignored, false, null, null, null));

        CallContact? contact = null;
        if (!string.IsNullOrWhiteSpace(c.ContactId)) contact = await contacts.GetAsync(c.ContactId, ct);
        else if (c.Phone is not null) contact = await contacts.FindByPhoneAsync(c.Phone, ct);

        CallSurveyItem? item = null;
        if (survey)
        {
            var r = await callSurveys.IngestAsync(actor, new CallEnded(c.CallId, c.EndedAt, c.Direction, c.HandledBy, c.Campaign.Trim(), result!.Value, c.TalkSeconds,
                c.Phone, c.ContactId, c.EnvId, contact?.Product, c.AgentName, null), ct);
            if (!r.IsOk) return ServiceResult<AiCallEventResult>.Fail(r.Error!.Value, r.Message!);
            item = r.Value!.Item;
        }
        string? signalId = null;
        if (complaint)
        {
            var sig = new Signal($"sg-call-{c.CallId.Trim()}", SignalKind.Complaint, contact?.Product ?? ProductId.Re, EnvLabel(c.EnvId), c.EnvId, "AI call · Angry customer",
                c.EndedAt, false, contact?.PersonId, null, [c.CallId.Trim()]);
            var s = await signals.IngestAsync(actor, sig, ct);
            // already counted (a retry) is fine: the signal exists
            if (s.IsOk || s.Error == Failure.Conflict) signalId = sig.Id;
            else return ServiceResult<AiCallEventResult>.Fail(s.Error!.Value, s.Message!);
        }
        var ev = await store.AddEventAsync(c.CallId, id => new AiCallEvent(id, c.CallId.Trim(), c.EndedAt, c.EnvId, c.Campaign.Trim(), c.Outcome.Trim(), o.Result, c.Direction, c.HandledBy,
            c.TalkSeconds, c.Sentiment, c.RecordingUrl, contact?.PersonId, survey, complaint, signalId), ct);
        ev ??= (await store.GetEventAsync(c.CallId, ct))!;
        return ServiceResult<AiCallEventResult>.Ok(new AiCallEventResult(ActionOf(ev), false, ev, item, signalId));
    }

    private static AiCallAction ActionOf(AiCallEvent e) => e.SurveyCandidate && e.Complaint ? AiCallAction.SurveyAndComplaint : e.SurveyCandidate ? AiCallAction.Survey : AiCallAction.Complaint;

    /// <summary>The per-call events, for the customer timeline (each with the BrightCall recording link). CX only.</summary>
    public async Task<ServiceResult<IReadOnlyList<AiCallEvent>>> EventsAsync(Actor? actor, string? personId, EnvId? env, DateTimeOffset? from, DateTimeOffset? to, CancellationToken ct = default)
    {
        if (actor is null || !IsCx(actor)) return Deny<IReadOnlyList<AiCallEvent>>(actor);
        var scope = EnvAccess.Effective(actor, env);
        if (!scope.IsOk) return ServiceResult<IReadOnlyList<AiCallEvent>>.Fail(scope.Error!.Value, scope.Message!);
        return ServiceResult<IReadOnlyList<AiCallEvent>>.Ok((await store.EventsAsync(ct))
            .Where(e => scope.Value.Includes(e.EnvId) && (personId is null || e.PersonId == personId) && (from is null || e.EndedAt >= from) && (to is null || e.EndedAt <= to))
            .OrderByDescending(e => e.EndedAt).ToList());
    }
}
