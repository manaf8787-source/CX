using PsiCx.Domain;
using PsiCx.Rules;

namespace PsiCx.Tests;

public class SurveyRulesTests
{
    private static readonly RulesBag R = RulesBag.Default;
    private static readonly DateTime Now = T.At(2026, 11, 26, 10);
    private static readonly ConsentFlags AllConsent = new(false, true, true, true);

    private static PersonSurveyState P(ConsentFlags? c = null, bool identified = true, bool complaint = false, DateTime? nps = null, DateTime? csat = null, DateTime? rel = null) =>
        new(identified, c ?? AllConsent, complaint, nps, csat, rel);

    private static SurveyTrigger Nps(NpsMilestoneKind? m = NpsMilestoneKind.Sale, ChannelId src = ChannelId.Whatsapp, SurveyDelivery d = SurveyDelivery.Whatsapp, bool rel = false, ProductId prod = ProductId.Re, IReadOnlyCollection<SurveyInstrument>? sent = null) =>
        new(SurveyInstrument.Nps, prod, src, d, "ev-1", Now, Milestone: m, Relationship: rel, AlreadySentForEvent: sent);

    private static SurveyTrigger Csat(Touchpoint? tp, int secs = 0) =>
        new(SurveyInstrument.CsatCes, ProductId.Re, ChannelId.Whatsapp, SurveyDelivery.Whatsapp, "ev-2", Now, Touchpoint: tp, CallSeconds: secs);

    private static void Skips(SkipReason expected, SurveyDecision d)
    {
        Assert.False(d.Send);
        Assert.Equal(expected, d.Reason!.Value);
    }

    // --- who is never surveyed

    [Theory]
    [InlineData(ChannelId.Facebook)] [InlineData(ChannelId.Instagram)] [InlineData(ChannelId.Linkedin)] [InlineData(ChannelId.Google)]
    public void Public_channels_are_never_surveyed(ChannelId c) => Skips(SkipReason.PublicChannel, SurveyRules.Decide(P(), Nps(src: c), Now, R));

    [Fact]
    public void An_unidentified_person_is_never_surveyed() => Skips(SkipReason.NotIdentified, SurveyRules.Decide(P(identified: false), Nps(), Now, R));

    [Fact]
    public void A_DNCR_number_is_excluded_from_every_survey()
    {
        var dncr = new ConsentFlags(true, true, true, true);
        foreach (var d in Enum.GetValues<SurveyDelivery>())
            Skips(SkipReason.Dncr, SurveyRules.Decide(P(dncr), Nps(d: d), Now, R));
    }

    [Fact]
    public void The_delivery_channel_needs_its_own_consent()
    {
        Skips(SkipReason.NoConsent, SurveyRules.Decide(P(new ConsentFlags(false, false, true, true)), Nps(d: SurveyDelivery.Whatsapp), Now, R));
        Assert.True(SurveyRules.Decide(P(new ConsentFlags(false, false, true, true)), Nps(d: SurveyDelivery.Sms), Now, R).Send);
        Assert.True(SurveyRules.Decide(P(new ConsentFlags(false, false, false, false)), Nps(src: ChannelId.App, d: SurveyDelivery.InApp), Now, R).Send);
    }

    [Fact]
    public void The_same_event_never_gets_the_same_instrument_twice()
    {
        Skips(SkipReason.Duplicate, SurveyRules.Decide(P(), Nps(sent: [SurveyInstrument.Nps]), Now, R));
        Assert.True(SurveyRules.Decide(P(), Nps(sent: [SurveyInstrument.CsatCes]), Now, R).Send);
    }

    // --- NPS

    [Fact]
    public void Nps_only_after_a_completed_milestone()
    {
        Skips(SkipReason.NoCompletedMilestone, SurveyRules.Decide(P(), Nps(m: null), Now, R));
        foreach (var m in Enum.GetValues<NpsMilestoneKind>()) Assert.True(SurveyRules.Decide(P(), Nps(m: m), Now, R).Send); // a signed lease counts like a sale
    }

    [Fact]
    public void Nps_is_capped_at_once_in_90_days()
    {
        Skips(SkipReason.CapReached, SurveyRules.Decide(P(nps: Now.AddDays(-89)), Nps(), Now, R));
        Assert.True(SurveyRules.Decide(P(nps: Now.AddDays(-90)), Nps(), Now, R).Send);
        Assert.True(SurveyRules.Decide(P(nps: Now.AddDays(-200)), Nps(), Now, R).Send);
        // the cap is a configuration value
        Assert.True(SurveyRules.Decide(P(nps: Now.AddDays(-45)), Nps(), Now, R with { NpsCapDays = 30 }).Send);
    }

    [Fact]
    public void Events_has_no_nps() => Skips(SkipReason.ProductHasNoNps, SurveyRules.Decide(P(), Nps(prod: ProductId.Ev), Now, R));

    [Fact]
    public void A_customer_with_an_open_complaint_is_not_asked_nps_or_csat()
    {
        Skips(SkipReason.OpenComplaint, SurveyRules.Decide(P(complaint: true), Nps(), Now, R));
        Skips(SkipReason.OpenComplaint, SurveyRules.Decide(P(complaint: true), Csat(Touchpoint.Viewing), Now, R));
        Assert.True(SurveyRules.Decide(P(complaint: true), Csat(Touchpoint.TicketClosed), Now, R).Send); // the closure itself is the moment
    }

    [Fact]
    public void Relationship_nps_is_yearly_and_not_inside_the_transactional_window()
    {
        Assert.True(SurveyRules.Decide(P(), Nps(m: null, rel: true), Now, R).Send);
        Skips(SkipReason.NotRelationshipDue, SurveyRules.Decide(P(rel: Now.AddDays(-200)), Nps(m: null, rel: true), Now, R));
        Skips(SkipReason.CapReached, SurveyRules.Decide(P(nps: Now.AddDays(-30)), Nps(m: null, rel: true), Now, R));
        Assert.True(SurveyRules.Decide(P(nps: Now.AddDays(-100), rel: Now.AddDays(-400)), Nps(m: null, rel: true), Now, R).Send);
    }

    // --- CSAT and CES

    [Fact]
    public void Csat_after_a_viewing_an_offer_or_a_call_over_two_minutes()
    {
        Assert.True(SurveyRules.Decide(P(), Csat(Touchpoint.Viewing), Now, R).Send);
        Assert.True(SurveyRules.Decide(P(), Csat(Touchpoint.Offer), Now, R).Send);
        Assert.True(SurveyRules.Decide(P(), Csat(Touchpoint.Call, 121), Now, R).Send);
        Skips(SkipReason.NoMeaningfulMoment, SurveyRules.Decide(P(), Csat(Touchpoint.Call, 120), Now, R));
        Skips(SkipReason.NoMeaningfulMoment, SurveyRules.Decide(P(), Csat(null), Now, R));
    }

    [Fact]
    public void Csat_is_capped_at_once_in_30_days()
    {
        Skips(SkipReason.CapReached, SurveyRules.Decide(P(csat: Now.AddDays(-29)), Csat(Touchpoint.Viewing), Now, R));
        Assert.True(SurveyRules.Decide(P(csat: Now.AddDays(-30)), Csat(Touchpoint.Viewing), Now, R).Send);
    }

    [Fact]
    public void Inside_the_window_the_portal_keeps_viewing_over_offer_over_call()
    {
        var picked = SurveyRules.PickTouchpoint([(Touchpoint.Call, Now.AddDays(-1)), (Touchpoint.Viewing, Now.AddDays(-5)), (Touchpoint.Offer, Now.AddDays(-2))]);
        Assert.Equal(Touchpoint.Viewing, picked!.Value.Kind);
        var tie = SurveyRules.PickTouchpoint([(Touchpoint.Call, Now.AddDays(-3)), (Touchpoint.Call, Now.AddDays(-1))]);
        Assert.Equal(Now.AddDays(-1), tie!.Value.At);
        Assert.Null(SurveyRules.PickTouchpoint([]));
        Assert.True(SurveyRules.Priority(Touchpoint.Viewing) > SurveyRules.Priority(Touchpoint.Offer));
        Assert.True(SurveyRules.Priority(Touchpoint.Offer) > SurveyRules.Priority(Touchpoint.Call));
    }

    // --- What stopped you, abandoned step, re-survey

    private static SurveyTrigger Why(int silent, bool asked = false) =>
        new(SurveyInstrument.WhatStoppedYou, ProductId.Re, ChannelId.Whatsapp, SurveyDelivery.Whatsapp, "enq-1", Now, SilentDays: silent, AlreadyAskedWhyForThisEnquiry: asked);

    [Fact]
    public void What_stopped_you_after_14_days_of_silence_and_only_once()
    {
        Skips(SkipReason.NotSilentLongEnough, SurveyRules.Decide(P(), Why(13), Now, R));
        Assert.True(SurveyRules.Decide(P(), Why(14), Now, R).Send);
        Skips(SkipReason.AlreadyAskedWhy, SurveyRules.Decide(P(), Why(30, asked: true), Now, R));
    }

    [Fact]
    public void An_abandoned_digital_step_is_asked_of_identified_users_only()
    {
        var t = new SurveyTrigger(SurveyInstrument.AbandonedCes, ProductId.Re, ChannelId.App, SurveyDelivery.InApp, "step-1", Now, DigitalStep: true);
        Assert.True(SurveyRules.Decide(P(), t, Now, R).Send);
        Skips(SkipReason.NotIdentified, SurveyRules.Decide(P(identified: false), t, Now, R));
        Skips(SkipReason.NotDigitalStep, SurveyRules.Decide(P(), t with { DigitalStep = false }, Now, R));
        Skips(SkipReason.PublicChannel, SurveyRules.Decide(P(), t with { Source = ChannelId.Facebook }, Now, R));
    }

    private static SurveyTrigger Re(DateTime? resolved) =>
        new(SurveyInstrument.ReSurvey, ProductId.Re, ChannelId.Whatsapp, SurveyDelivery.Whatsapp, "re-1", Now, ResolvedAt: resolved);

    [Fact]
    public void The_re_survey_goes_out_7_to_14_days_after_resolution_and_is_exempt_from_the_caps()
    {
        var recent = P(nps: Now.AddDays(-10), csat: Now.AddDays(-10)); // would be capped for anything else
        Skips(SkipReason.ReSurveyOutsideWindow, SurveyRules.Decide(recent, Re(Now.AddDays(-6)), Now, R));
        Assert.True(SurveyRules.Decide(recent, Re(Now.AddDays(-7)), Now, R).Send);
        Assert.True(SurveyRules.Decide(recent, Re(Now.AddDays(-14)), Now, R).Send);
        Skips(SkipReason.ReSurveyOutsideWindow, SurveyRules.Decide(recent, Re(Now.AddDays(-15)), Now, R));
        Skips(SkipReason.ReSurveyOutsideWindow, SurveyRules.Decide(recent, Re(null), Now, R));
    }

    [Fact]
    public void The_re_survey_is_still_blocked_by_DNCR_and_consent()
    {
        Skips(SkipReason.Dncr, SurveyRules.Decide(P(new ConsentFlags(true, true, true, true)), Re(Now.AddDays(-8)), Now, R));
        Skips(SkipReason.NoConsent, SurveyRules.Decide(P(new ConsentFlags(false, false, false, false)), Re(Now.AddDays(-8)), Now, R));
    }

    [Fact]
    public void The_reason_is_the_first_that_applies()
    {
        // public channel beats DNCR beats consent beats cap
        var worst = new ConsentFlags(true, false, false, false);
        Skips(SkipReason.PublicChannel, SurveyRules.Decide(P(worst, identified: false, nps: Now), Nps(src: ChannelId.Instagram), Now, R));
        Skips(SkipReason.NotIdentified, SurveyRules.Decide(P(worst, identified: false, nps: Now), Nps(), Now, R));
        Skips(SkipReason.Dncr, SurveyRules.Decide(P(worst, nps: Now), Nps(), Now, R));
        Skips(SkipReason.NoConsent, SurveyRules.Decide(P(new ConsentFlags(false, false, false, false), nps: Now), Nps(), Now, R));
        Skips(SkipReason.CapReached, SurveyRules.Decide(P(nps: Now.AddDays(-1)), Nps(), Now, R));
    }
}
