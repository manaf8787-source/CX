using System.Text.Json.Serialization;
using PsiCx.Domain;

namespace PsiCx.Rules;

/// <summary>The agreed default mapping of BrightCall's outcomes (26 Nov). The CX manager can change the result of a code; the group stays.</summary>
public static class BrightcallMapping
{
    private static BrightcallOutcome O(string code, CallGroup g, MappedResult r, bool lead = false, bool complaint = false) => new(code, g, r, lead, complaint);
    private const CallGroup A = CallGroup.Answered;

    public static readonly IReadOnlyList<BrightcallOutcome> Defaults =
    [
        // completed with a good result: these can send the CSAT + CES survey
        O("Scheduled Meeting", A, MappedResult.Appointment, true), O("Interested to attend", A, MappedResult.Appointment, true),
        O("Interested, Follow Up Later", A, MappedResult.FollowUp, true), O("Interested, Later", A, MappedResult.FollowUp, true), O("Considering", A, MappedResult.FollowUp, true),
        O("Interested", A, MappedResult.Successful, true), O("Interested in other project", A, MappedResult.Successful, true), O("Interested Seller", A, MappedResult.Successful, true),
        O("Interested to rent", A, MappedResult.Successful, true), O("Qualified Transfer", A, MappedResult.Successful, true), O("Transferred", A, MappedResult.Successful, true),
        O("Unit Sold", A, MappedResult.Successful, true),
        // answered, no survey
        O("Not Interested", A, MappedResult.NotInterested), O("Not interested now", A, MappedResult.NotInterested), O("Not Interested Now", A, MappedResult.NotInterested),
        O("Angry Bird", A, MappedResult.NotInterested, complaint: true),
        O("Call Back Later", A, MappedResult.CallBack), O("Call back later", A, MappedResult.CallBack),
        O("Not Qualified", A, MappedResult.Other), O("Not Qualified Transfer", A, MappedResult.Other), O("Low Budget", A, MappedResult.Other), O("Price Concern", A, MappedResult.Other),
        O("Hesitated", A, MappedResult.Other), O("Broker", A, MappedResult.Other), O("Gatekeeper", A, MappedResult.Other), O("Language Barrier", A, MappedResult.Other),
        O("No Dialogue", A, MappedResult.Other), O("WhatsApp", A, MappedResult.Other), O("Whats app", A, MappedResult.Other), O("Receive Marketing", A, MappedResult.Other),
        // dropped
        O("Dropped Calls", CallGroup.Dropped, MappedResult.DroppedAfterGreeting), O("Dropped Transfer", CallGroup.Dropped, MappedResult.Other),
        // not answered
        O("No Answer", CallGroup.NoAnswer, MappedResult.NoAnswer), O("Voicemail", CallGroup.NoAnswer, MappedResult.Voicemail), O("Busy", CallGroup.NoAnswer, MappedResult.Busy),
        O("Wrong Number", CallGroup.NoAnswer, MappedResult.WrongNumber), O("Invalid Numbers", CallGroup.NoAnswer, MappedResult.WrongNumber),
        // never dialled: blocked before the call
        O("DNCR UAE Blocked", CallGroup.NotCalled, MappedResult.NotCalled), O("No DNCR Status on CRM", CallGroup.NotCalled, MappedResult.NotCalled),
        O("DNCR Check Unavailable", CallGroup.NotCalled, MappedResult.NotCalled), O("Not Existing Contact on CRM", CallGroup.NotCalled, MappedResult.NotCalled),
        // test and unknown: left out of every number
        O("Test Call", CallGroup.Excluded, MappedResult.Excluded), O("Unknown", CallGroup.Excluded, MappedResult.Excluded), O("Pending", CallGroup.Excluded, MappedResult.Excluded),
    ];

    /// <summary>One outcome as the portal reads it: the default with the CX manager's result applied. A code nobody has mapped counts as answered, other result, until it is mapped.</summary>
    public static (BrightcallOutcome Outcome, bool Known, bool Edited) Lookup(string code, IReadOnlyDictionary<string, MappedResult>? overrides)
    {
        var d = Defaults.FirstOrDefault(x => x.Code == code);
        var has = overrides is not null && overrides.TryGetValue(code, out _);
        if (d is not null) return has ? (d with { Result = overrides![code] }, true, true) : (d, true, false);
        return has
            ? (new BrightcallOutcome(code, MappedResults.GroupOf(overrides![code]), overrides[code]), true, true)
            : (new BrightcallOutcome(code, CallGroup.Answered, MappedResult.Other), false, false);
    }
}

public sealed record GroupCounts(
    [property: JsonPropertyName("answered")] int Answered,
    [property: JsonPropertyName("no_answer")] int NoAnswer,
    [property: JsonPropertyName("dropped")] int Dropped,
    [property: JsonPropertyName("not_called")] int NotCalled,
    [property: JsonPropertyName("excluded")] int Excluded);

public sealed record ResultLine(MappedResult Result, int Calls, int Contacts, bool SendsSurvey);
public sealed record OutcomeLine(string Outcome, int Calls, int Contacts, decimal Cost);
public enum GreetingBand { Ok, Amber, Red }

public sealed record CampaignLine(
    string Campaign, EnvId EnvId, int Targeted, int Attempted, int Calls, int Answered, int Dropped20, int Leads, decimal Cost,
    double? AnswerRatePct, double? GreetingDropPct, GreetingBand GreetingBand, decimal? CostPerLead);

public sealed record AiCallSummary(
    int Targeted, int Attempted, int Calls, int Contacts, GroupCounts ByGroup,
    IReadOnlyList<ResultLine> ByResult, IReadOnlyList<OutcomeLine> ByOutcome,
    int Leads, int Complaints, decimal Cost, DropBuckets Drops, SentimentSplit Sentiment,
    IReadOnlyList<CampaignLine> Campaigns,
    double? ProgressPct, double? AnswerRatePct, double? DropRatePct, double? GreetingDropPct, double? LeadRatePct, decimal? CostPerLead,
    /// <summary>Contacts whose outcome maps to a result that sends the CSAT + CES survey.</summary>
    int CanGetSurvey, int Blocked,
    /// <summary>Outcome codes that arrived and nobody has mapped yet (they count as "other answered result").</summary>
    IReadOnlyList<string> Unmapped,
    DateOnly? From = null, DateTimeOffset? LastRefreshAt = null);

public sealed record AiCallFilter(DateOnly From, EnvScope Scope, string? Campaign);

/// <summary>The sums of the AI call center overview (the same ones the frontend's summarizeAiCalls makes). Blocked and test outcomes are not calls.</summary>
public static class AiCallSums
{
    public const double AmberGreetingPct = 30;
    public const double RedGreetingPct = 40;

    private static double? Pct(double num, double den) => den <= 0 ? null : Math.Round(100 * num / den, 1);

    public static GreetingBand Band(double? pct) => pct is >= RedGreetingPct ? GreetingBand.Red : pct is >= AmberGreetingPct ? GreetingBand.Amber : GreetingBand.Ok;

    public static AiCallSummary Summarize(
        IEnumerable<AiCallDailyRow> rows, IEnumerable<AiCallDailyExtra> extras, IEnumerable<AiCampaignTotals> campaigns,
        IReadOnlyDictionary<string, MappedResult>? overrides, IReadOnlySet<CallResult> surveyResults, AiCallFilter f)
    {
        bool KeepCampaign(string c) => f.Campaign is null || c == f.Campaign;
        var per = new Dictionary<(string, EnvId), (AiCampaignTotals T, int Calls, int Answered, int D20, int Leads, decimal Cost)>();
        int targeted = 0, attempted = 0;
        foreach (var c in campaigns.Where(c => f.Scope.Includes(c.EnvId) && KeepCampaign(c.Campaign)))
        {
            targeted += c.Targeted; attempted += c.Attempted;
            per[(c.Campaign, c.EnvId)] = (c, 0, 0, 0, 0, 0m);
        }
        int answered = 0, noAnswer = 0, dropped = 0, notCalled = 0, excluded = 0, calls = 0, contacts = 0, leads = 0, complaints = 0, canSurvey = 0;
        decimal cost = 0;
        var byResult = new Dictionary<MappedResult, (int Calls, int Contacts)>();
        var byOutcome = new Dictionary<string, (int Calls, int Contacts, decimal Cost)>();
        var unmapped = new SortedSet<string>(StringComparer.Ordinal);
        foreach (var r in rows.Where(r => r.Date >= f.From && f.Scope.Includes(r.EnvId) && KeepCampaign(r.Campaign)))
        {
            var (m, known, _) = BrightcallMapping.Lookup(r.Outcome, overrides);
            if (!known) unmapped.Add(r.Outcome);
            switch (m.Group)
            {
                case CallGroup.Answered: answered += r.Calls; break;
                case CallGroup.NoAnswer: noAnswer += r.Calls; break;
                case CallGroup.Dropped: dropped += r.Calls; break;
                case CallGroup.NotCalled: notCalled += r.Calls; break;
                default: excluded += r.Calls; break;
            }
            var o = byOutcome.GetValueOrDefault(r.Outcome);
            byOutcome[r.Outcome] = (o.Calls + r.Calls, o.Contacts + r.Contacts, o.Cost + r.Cost);
            cost += r.Cost;
            if (m.Group is CallGroup.NotCalled or CallGroup.Excluded) continue;
            calls += r.Calls; contacts += r.Contacts;
            var br = byResult.GetValueOrDefault(m.Result);
            byResult[m.Result] = (br.Calls + r.Calls, br.Contacts + r.Contacts);
            if (m.Lead) leads += r.Calls;
            if (m.Complaint) complaints += r.Contacts;
            if (m.Result.ToCallResult() is { } cr && surveyResults.Contains(cr)) canSurvey += r.Contacts;
            if (per.TryGetValue((r.Campaign, r.EnvId), out var pc))
                per[(r.Campaign, r.EnvId)] = (pc.T, pc.Calls + r.Calls, pc.Answered + (m.Group == CallGroup.Answered ? r.Calls : 0), pc.D20, pc.Leads + (m.Lead ? r.Calls : 0), pc.Cost + r.Cost);
        }
        int w20 = 0, a1 = 0, pos = 0, sp = 0, sn = 0, sg = 0;
        foreach (var x in extras.Where(x => x.Date >= f.From && f.Scope.Includes(x.EnvId) && KeepCampaign(x.Campaign)))
        {
            w20 += x.Drops.Within20s; a1 += x.Drops.After1min; pos += x.Drops.PositiveThenDropped;
            sp += x.Sentiment.Positive; sn += x.Sentiment.Neutral; sg += x.Sentiment.Negative;
            if (per.TryGetValue((x.Campaign, x.EnvId), out var pc)) per[(x.Campaign, x.EnvId)] = pc with { D20 = pc.D20 + x.Drops.Within20s };
        }
        var lines = per.Values.Where(v => v.Calls > 0).OrderByDescending(v => v.Calls).ThenBy(v => v.T.Campaign).Select(v =>
        {
            var gd = Pct(v.D20, v.Answered + v.D20);
            return new CampaignLine(v.T.Campaign, v.T.EnvId, v.T.Targeted, v.T.Attempted, v.Calls, v.Answered, v.D20, v.Leads, v.Cost,
                Pct(v.Answered, v.Calls), gd, Band(gd), v.Leads == 0 ? null : Math.Round(v.Cost / v.Leads, 2));
        }).ToList();
        return new AiCallSummary(
            targeted, attempted, calls, contacts, new GroupCounts(answered, noAnswer, dropped, notCalled, excluded),
            byResult.OrderByDescending(kv => kv.Value.Calls).Select(kv => new ResultLine(kv.Key, kv.Value.Calls, kv.Value.Contacts, kv.Key.ToCallResult() is { } c && surveyResults.Contains(c))).ToList(),
            byOutcome.OrderByDescending(kv => kv.Value.Calls).Select(kv => new OutcomeLine(kv.Key, kv.Value.Calls, kv.Value.Contacts, kv.Value.Cost)).ToList(),
            leads, complaints, cost, new DropBuckets(w20, a1, pos), new SentimentSplit(sp, sn, sg), lines,
            Pct(attempted, targeted), Pct(answered, calls), Pct(dropped, calls), Pct(w20, answered + w20), Pct(leads, answered),
            leads == 0 ? null : Math.Round(cost / leads, 2), canSurvey, notCalled, unmapped.ToList(), f.From);
    }
}
