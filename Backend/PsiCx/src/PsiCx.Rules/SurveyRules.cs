using PsiCx.Domain;

namespace PsiCx.Rules;

public enum SurveyInstrument { Nps, CsatCes, WhatStoppedYou, AbandonedCes, ReSurvey }

/// <summary>What the person did that may lead to a survey. Viewing outranks offer, and offer outranks call, inside the CSAT and CES window.</summary>
public enum Touchpoint { Viewing, Offer, Call, TicketClosed }

/// <summary>How the survey reaches the person. Public channels are never a way to survey, so they are not here.</summary>
public enum SurveyDelivery { Whatsapp, Sms, Email, InApp, Call }

/// <summary>Why a survey was not sent. Every skip is logged with its reason (Agent 10).</summary>
public enum SkipReason
{
    PublicChannel, NotIdentified, Dncr, NoConsent, Duplicate, OpenComplaint,
    NoCompletedMilestone, NoMeaningfulMoment, NotSilentLongEnough, AlreadyAskedWhy, NotRelationshipDue, NotDigitalStep,
    ReSurveyOutsideWindow, ProductHasNoNps, CapReached
}

public sealed record SurveyDecision(bool Send, SkipReason? Reason)
{
    public static SurveyDecision Yes { get; } = new(true, null);
    public static SurveyDecision Skip(SkipReason r) => new(false, r);
}

/// <summary>What the engine knows about the person right now.</summary>
public sealed record PersonSurveyState(
    bool Identified,
    ConsentFlags Consent,
    bool OpenComplaint = false,
    /// <summary>The last time any NPS (transactional or relationship) was sent to this person.</summary>
    DateTime? LastNpsAt = null,
    /// <summary>The last time a CSAT and CES pair was sent.</summary>
    DateTime? LastCsatAt = null,
    /// <summary>The last time a relationship NPS was sent.</summary>
    DateTime? LastRelationshipNpsAt = null);

/// <summary>The event the engine is deciding on. All times are UAE wall-clock.</summary>
public sealed record SurveyTrigger(
    SurveyInstrument Instrument,
    ProductId Product,
    /// <summary>Where the person's contact came from. A public channel is never surveyed.</summary>
    ChannelId Source,
    SurveyDelivery Delivery,
    /// <summary>The event that caused it (a deal, a viewing, a call). The same event never gets the same instrument twice.</summary>
    string EventId,
    DateTime EventAt,
    NpsMilestoneKind? Milestone = null,
    bool Relationship = false,
    Touchpoint? Touchpoint = null,
    int CallSeconds = 0,
    /// <summary>For What stopped you: days since the lead last answered.</summary>
    int SilentDays = 0,
    bool AlreadyAskedWhyForThisEnquiry = false,
    /// <summary>For an abandoned digital step: the person was signed in.</summary>
    bool DigitalStep = false,
    /// <summary>For the re-survey: when the resolution happened.</summary>
    DateTime? ResolvedAt = null,
    /// <summary>Instruments already sent for this event id.</summary>
    IReadOnlyCollection<SurveyInstrument>? AlreadySentForEvent = null);

/// <summary>A completed transaction. A signed lease in PSI Assets counts like a sale; so do renewals and handovers.</summary>
public enum NpsMilestoneKind { Sale, Lease, Renewal, Handover }

/// <summary>
/// Agent 10's rules: which survey goes to whom and when (decision 5, Rules and Definitions; Modules KB "When we ask, and when we never ask").
/// Pure: the caller supplies the person's state and the trigger. The caps and windows come from <see cref="RulesBag"/>.
/// </summary>
public static class SurveyRules
{
    /// <summary>
    /// A product's own indicator line. 25 Nov (owner): PSI Real Estate's figures include the After-Sales answers (the same customers, the
    /// same service after the deal completes); After-Sales keeps its own line with only its answers.
    /// </summary>
    public static IReadOnlyList<ProductId> IndicatorScope(ProductId product) => product == ProductId.Re ? [ProductId.Re, ProductId.Af] : [product];

    private static readonly ChannelId[] PublicChannels = [ChannelId.Facebook, ChannelId.Instagram, ChannelId.Linkedin, ChannelId.Google, ChannelId.Googleplay, ChannelId.Appstore, ChannelId.Webcomment];

    public static bool IsPublicChannel(ChannelId c) => PublicChannels.Contains(c);

    /// <summary>PSI Events has no NPS: an external booth rating and an internal staff evaluation instead. PSI Wallet's survey is CES and an investor survey [Proposed: no NPS yet].</summary>
    public static bool ProductHasNps(ProductId p) => p is not (ProductId.Ev or ProductId.Wl);

    /// <summary>Inside the CSAT and CES window the portal keeps the most important touchpoint: viewing over offer over call (a closed ticket is its own moment, last).</summary>
    public static int Priority(Touchpoint t) => t switch { Touchpoint.Viewing => 4, Touchpoint.Offer => 3, Touchpoint.Call => 2, _ => 1 };

    /// <summary>The touchpoint to ask about when several happened in one window: highest priority, the latest on a tie.</summary>
    public static (Touchpoint Kind, DateTime At)? PickTouchpoint(IEnumerable<(Touchpoint Kind, DateTime At)> candidates) =>
        candidates.Select(c => ((Touchpoint, DateTime)?)c).OrderByDescending(c => Priority(c!.Value.Item1)).ThenByDescending(c => c!.Value.Item2).FirstOrDefault();

    private static bool Within(DateTime? last, DateTime now, int days) => last is not null && (now - last.Value).TotalDays < days;

    /// <summary>
    /// Decides one trigger at <paramref name="now"/>. The order is fixed so the logged reason is always the same for the same facts: who may never be
    /// surveyed first (public, unidentified, DNCR, no consent), then duplicates, then the instrument's own conditions, and the cap last.
    /// The re-survey is exempt from the caps (it measures the recovery) but never from the first group.
    /// </summary>
    public static SurveyDecision Decide(PersonSurveyState person, SurveyTrigger t, DateTime now, RulesBag rules)
    {
        if (IsPublicChannel(t.Source)) return SurveyDecision.Skip(SkipReason.PublicChannel);
        if (!person.Identified) return SurveyDecision.Skip(SkipReason.NotIdentified);
        if (person.Consent.Dncr) return SurveyDecision.Skip(SkipReason.Dncr);
        if (!HasConsent(person.Consent, t.Delivery)) return SurveyDecision.Skip(SkipReason.NoConsent);
        if (t.AlreadySentForEvent?.Contains(t.Instrument) == true) return SurveyDecision.Skip(SkipReason.Duplicate);

        switch (t.Instrument)
        {
            case SurveyInstrument.Nps:
                if (!ProductHasNps(t.Product)) return SurveyDecision.Skip(SkipReason.ProductHasNoNps);
                if (person.OpenComplaint) return SurveyDecision.Skip(SkipReason.OpenComplaint);
                if (t.Relationship)
                {
                    // once a year, and never inside the transactional window
                    if (Within(person.LastRelationshipNpsAt, now, rules.RelationshipNpsDays)) return SurveyDecision.Skip(SkipReason.NotRelationshipDue);
                    return Within(person.LastNpsAt, now, rules.NpsCapDays) ? SurveyDecision.Skip(SkipReason.CapReached) : SurveyDecision.Yes;
                }
                if (t.Milestone is null) return SurveyDecision.Skip(SkipReason.NoCompletedMilestone);
                return Within(person.LastNpsAt, now, rules.NpsCapDays) ? SurveyDecision.Skip(SkipReason.CapReached) : SurveyDecision.Yes;

            case SurveyInstrument.CsatCes:
                if (person.OpenComplaint && t.Touchpoint != Touchpoint.TicketClosed) return SurveyDecision.Skip(SkipReason.OpenComplaint);
                if (t.Touchpoint is null) return SurveyDecision.Skip(SkipReason.NoMeaningfulMoment);
                if (t.Touchpoint == Touchpoint.Call && t.CallSeconds <= rules.MeaningfulCallSeconds) return SurveyDecision.Skip(SkipReason.NoMeaningfulMoment);
                return Within(person.LastCsatAt, now, rules.CsatCapDays) ? SurveyDecision.Skip(SkipReason.CapReached) : SurveyDecision.Yes;

            case SurveyInstrument.WhatStoppedYou:
                if (t.AlreadyAskedWhyForThisEnquiry) return SurveyDecision.Skip(SkipReason.AlreadyAskedWhy);
                return t.SilentDays >= rules.SilenceWhyDays ? SurveyDecision.Yes : SurveyDecision.Skip(SkipReason.NotSilentLongEnough);

            case SurveyInstrument.AbandonedCes:
                // identified users only (checked above); the step must be a digital one
                return t.DigitalStep ? SurveyDecision.Yes : SurveyDecision.Skip(SkipReason.NotDigitalStep);

            case SurveyInstrument.ReSurvey:
                if (t.ResolvedAt is null) return SurveyDecision.Skip(SkipReason.ReSurveyOutsideWindow);
                var days = (now - t.ResolvedAt.Value).TotalDays;
                // 7 to 14 days inclusive: the fourteenth day counts until it ends
                return days >= rules.ReSurveyMinDays && days < rules.ReSurveyMaxDays + 1
                    ? SurveyDecision.Yes
                    : SurveyDecision.Skip(SkipReason.ReSurveyOutsideWindow);

            default:
                return SurveyDecision.Skip(SkipReason.NoMeaningfulMoment);
        }
    }

    /// <summary>The delivery channel needs the person's consent for it. In-app needs none (the person is signed in); a call needs only that they are not on the DNCR list.</summary>
    public static bool HasConsent(ConsentFlags c, SurveyDelivery d) => d switch
    {
        SurveyDelivery.Whatsapp => c.Whatsapp,
        SurveyDelivery.Sms => c.Sms,
        SurveyDelivery.Email => c.Email,
        _ => true,
    };
}
