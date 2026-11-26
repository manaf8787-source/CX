using System.Text.Json;
using PsiCx.Application;
using PsiCx.Domain;
using PsiCx.Infrastructure;
using PsiCx.Rules;
using static PsiCx.Domain.RoleId;

namespace PsiCx.Tests;

internal sealed class FakeSender : ICallSurveySender
{
    public List<(string CallId, ChannelId Channel)> Sent = [];
    public Func<ChannelId, SendOutcome> Outcome = _ => SendOutcome.Sent;
    public Task<SendOutcome> SendAsync(CallSurveyItem item, CallContact contact, ChannelId channel, CancellationToken ct = default)
    {
        var o = Outcome(channel);
        if (o == SendOutcome.Sent) Sent.Add((item.CallId, channel));
        return Task.FromResult(o);
    }
}

internal sealed class DefaultRules : IRulesSource
{
    public Task<RulesBag> RulesAsync(CancellationToken ct = default) => Task.FromResult(RulesBag.Default);
}

public class CallSurveyServiceTests
{
    private static readonly Actor Cx = new("u-cx", "cx@psi.sample", Cxmgr);
    private static readonly Actor Team = new("u-t", "t@psi.sample", Cxteam);
    private static readonly Actor Exec1 = new("u-exec", "exec@psi.sample", Exec);
    private static readonly Actor Lead = new("u-lead", "l@psi.sample", Teamlead);

    private sealed record Rig(CallSurveyService Svc, FakeClock Clock, InMemoryCallContactDirectory Dir, FakeSender Sender, ISurveyResponseStore Answers, ISettingsStore Settings, SurveyService Surveys);

    // 12:00 Gulf on 26 Nov
    private static Rig Make()
    {
        var clock = new FakeClock(DateTimeOffset.Parse("2026-11-26T08:00:00Z"));
        var dir = new InMemoryCallContactDirectory();
        dir.Set(new CallContact("p-1", ProductId.Re, false, true, true, "+971501111111"));
        var sender = new FakeSender();
        var answers = new InMemorySurveyResponseStore();
        var settings = new InMemorySettingsStore();
        var surveys = new SurveyService(answers, clock);
        return new Rig(new CallSurveyService(new InMemoryCallSurveyStore(), dir, sender, new SettingsCallSurveyRuleSource(settings), new DefaultRules(), answers, surveys, clock), clock, dir, sender, answers, settings, surveys);
    }

    private static CallEnded Call(Rig r, string id = "CALL-1", CallResult res = CallResult.Appointment, string? phone = "+971501111111", int talk = 90, CallHandler by = CallHandler.Ai, CallDirection d = CallDirection.Outbound, TimeSpan? ago = null)
        => new(id, r.Clock.Now - (ago ?? TimeSpan.FromMinutes(5)), d, by, "Viewing follow-up", res, talk, phone, null, EnvId.Dub, AgentName: by == CallHandler.Human ? "Sara" : null);

    [Fact]
    public async Task A_completed_call_is_scheduled_an_hour_after_it_ended_and_skips_are_stored_with_their_reason()
    {
        var r = Make();
        var ok = (await r.Svc.IngestAsync(Cx, Call(r))).Value!;
        Assert.False(ok.Duplicate);
        Assert.Equal(CallSurveyStatus.Scheduled, ok.Item.Status);
        Assert.Equal(r.Clock.Now.AddMinutes(-5).AddMinutes(60), ok.Item.SendAt);
        Assert.Equal("p-1", ok.Item.PersonId);

        Assert.Equal(CallSkip.NotCompleted, (await r.Svc.IngestAsync(Cx, Call(r, "C2", CallResult.DroppedAfterGreeting, talk: 5))).Value!.Item.SkipReason);
        Assert.Equal(CallSkip.NotInCrm, (await r.Svc.IngestAsync(Cx, Call(r, "C3", phone: "+971509999999"))).Value!.Item.SkipReason);
        Assert.Equal(CallSkip.TooShort, (await r.Svc.IngestAsync(Cx, Call(r, "C4", talk: 10))).Value!.Item.SkipReason);
        Assert.Equal(CallSurveyStatus.Skipped, (await r.Svc.IngestAsync(Cx, Call(r, "C5", CallResult.Busy))).Value!.Item.Status);
    }

    [Fact]
    public async Task The_same_call_posted_twice_is_stored_once()
    {
        var r = Make();
        await r.Svc.IngestAsync(Cx, Call(r));
        var again = (await r.Svc.IngestAsync(Cx, Call(r))).Value!;
        Assert.True(again.Duplicate);
        Assert.Single((await r.Svc.ListAsync(Cx, null, null, null, null)).Value!);
    }

    [Fact]
    public async Task Input_and_access_are_checked()
    {
        var r = Make();
        Assert.Equal(Failure.Unauthenticated, (await r.Svc.IngestAsync(null, Call(r))).Error);
        Assert.Equal(Failure.Forbidden, (await r.Svc.IngestAsync(Exec1, Call(r))).Error);
        Assert.Equal(Failure.Invalid, (await r.Svc.IngestAsync(Cx, Call(r, "  "))).Error);
        Assert.Equal(Failure.Invalid, (await r.Svc.IngestAsync(Cx, Call(r, phone: "0501111111"))).Error);
        Assert.Equal(Failure.Invalid, (await r.Svc.IngestAsync(Cx, Call(r, talk: -1))).Error);
        Assert.Equal(Failure.Invalid, (await r.Svc.IngestAsync(Cx, Call(r, ago: TimeSpan.FromHours(-2)))).Error);
        Assert.Equal(Failure.Forbidden, (await r.Svc.ListAsync(Lead, null, null, null, null)).Error);
        Assert.Null((await r.Svc.ListAsync(Cx, null, null, null, null)).Value!.FirstOrDefault()?.Phone);
    }

    [Fact]
    public async Task One_survey_per_contact_inside_the_cap_whatever_the_source()
    {
        var r = Make();
        await r.Svc.IngestAsync(Cx, Call(r, "A"));
        // a second qualifying call right after: the first one is already scheduled
        Assert.Equal(CallSkip.Cap, (await r.Svc.IngestAsync(Cx, Call(r, "B"))).Value!.Item.SkipReason);

        // an answer from another source 12 days ago blocks; exactly 30 days ago does not
        var r2 = Make();
        await r2.Answers.AddAsync(id => new SurveyResponse(id, "p-1", ProductId.Re, EnvId.Dub, Measure.Csat, 5, 5, ChannelId.Whatsapp, r2.Clock.Now.AddDays(-12)));
        Assert.Equal(CallSkip.Cap, (await r2.Svc.IngestAsync(Cx, Call(r2))).Value!.Item.SkipReason);
        var r3 = Make();
        await r3.Answers.AddAsync(id => new SurveyResponse(id, "p-1", ProductId.Re, EnvId.Dub, Measure.Ces, 5, 7, ChannelId.App, r3.Clock.Now.AddMinutes(-5).AddDays(-30)));
        Assert.Equal(CallSurveyStatus.Scheduled, (await r3.Svc.IngestAsync(Cx, Call(r3))).Value!.Item.Status);
        // NPS answers do not count against the CSAT + CES cap
        var r4 = Make();
        await r4.Answers.AddAsync(id => new SurveyResponse(id, "p-1", ProductId.Re, EnvId.Dub, Measure.Nps, 9, 10, ChannelId.App, r4.Clock.Now.AddDays(-2)));
        Assert.Equal(CallSurveyStatus.Scheduled, (await r4.Svc.IngestAsync(Cx, Call(r4))).Value!.Item.Status);
    }

    [Fact]
    public async Task The_rule_setting_changes_the_decision()
    {
        var r = Make();
        var json = JsonSerializer.SerializeToElement(new { enabled = true, sendOn = new[] { "appointment" }, outbound = false });
        await r.Settings.TryAppendAsync(new SettingVersion(SettingKeys.CallSurveyRule, 1, json, r.Clock.Now, "u-cx", Cxmgr, null));
        Assert.Equal(CallSkip.Direction, (await r.Svc.IngestAsync(Cx, Call(r))).Value!.Item.SkipReason);
        Assert.Equal(CallSkip.NotCompleted, (await r.Svc.IngestAsync(Cx, Call(r, "X", CallResult.Successful, d: CallDirection.Inbound))).Value!.Item.SkipReason);
    }

    [Fact]
    public async Task Dispatch_waits_for_the_time_sends_on_whatsapp_and_falls_back_to_sms()
    {
        var r = Make();
        await r.Svc.IngestAsync(Cx, Call(r));
        var none = await r.Svc.DispatchDueAsync();
        Assert.Equal(0, none.Sent); // due in 55 minutes
        r.Clock.Advance(TimeSpan.FromMinutes(56));
        r.Sender.Outcome = ch => ch == ChannelId.Whatsapp ? SendOutcome.Failed : SendOutcome.Sent;
        var res = await r.Svc.DispatchDueAsync();
        Assert.Equal(1, res.Sent);
        Assert.Equal(ChannelId.Sms, r.Sender.Sent.Single().Channel);
        var item = (await r.Svc.ListAsync(Cx, null, null, null, null)).Value!.Single();
        Assert.Equal(CallSurveyStatus.Sent, item.Status);
        Assert.Equal(ChannelId.Sms, item.Channel);
        Assert.Equal(0, (await r.Svc.DispatchDueAsync()).Sent); // never twice
    }

    [Fact]
    public async Task Dispatch_without_a_connected_channel_leaves_the_survey_scheduled()
    {
        var r = Make();
        await r.Svc.IngestAsync(Cx, Call(r));
        r.Clock.Advance(TimeSpan.FromMinutes(56));
        r.Sender.Outcome = _ => SendOutcome.NotConfigured;
        var res = await r.Svc.DispatchDueAsync();
        Assert.Equal(1, res.NotConfigured);
        Assert.Equal(CallSurveyStatus.Scheduled, (await r.Svc.ListAsync(Cx, null, null, null, null)).Value!.Single().Status);
    }

    [Fact]
    public async Task Dncr_is_checked_again_at_send_time_and_opt_out_is_honoured()
    {
        var r = Make();
        await r.Svc.IngestAsync(Cx, Call(r));
        r.Dir.Set(new CallContact("p-1", ProductId.Re, true, true, true, "+971501111111")); // registered after the call
        r.Clock.Advance(TimeSpan.FromMinutes(56));
        await r.Svc.DispatchDueAsync();
        Assert.Empty(r.Sender.Sent);
        Assert.Equal(CallSkip.Dncr, (await r.Svc.ListAsync(Cx, null, null, null, null)).Value!.Single().SkipReason);

        var r2 = Make();
        r2.Dir.Set(new CallContact("p-1", ProductId.Re, false, false, false, "+971501111111"));
        await r2.Svc.IngestAsync(Cx, Call(r2));
        r2.Clock.Advance(TimeSpan.FromMinutes(56));
        Assert.Equal(1, (await r2.Svc.DispatchDueAsync()).Failed);
        Assert.Empty(r2.Sender.Sent);
    }

    [Fact]
    public async Task A_call_late_in_the_evening_waits_for_the_morning_and_a_late_job_waits_for_the_next_opening()
    {
        var r = Make();
        r.Clock.Now = DateTimeOffset.Parse("2026-11-26T16:35:00Z"); // 20:35 Gulf
        await r.Svc.IngestAsync(Cx, Call(r, ago: TimeSpan.FromMinutes(5))); // ended 20:30 -> 21:30 is outside -> 09:00 next day
        Assert.Equal(DateTimeOffset.Parse("2026-11-27T05:00:00Z"), (await r.Svc.ListAsync(Cx, null, null, null, null)).Value!.Single().SendAt);
        r.Clock.Now = DateTimeOffset.Parse("2026-11-27T05:30:00Z");
        Assert.Equal(1, (await r.Svc.DispatchDueAsync()).Sent);

        // the job did not run for hours: past the latest time, so it waits for the next opening
        var late = Make();
        await late.Svc.IngestAsync(Cx, Call(late));
        late.Clock.Advance(TimeSpan.FromHours(4)); // 16:00 Gulf, sendAt was 12:55 -> 3 hours late
        var res = await late.Svc.DispatchDueAsync();
        Assert.Equal(1, res.Rescheduled);
        Assert.Equal(DateTimeOffset.Parse("2026-11-27T05:00:00Z"), (await late.Svc.ListAsync(Cx, null, null, null, null)).Value!.Single().SendAt);
    }

    [Fact]
    public async Task An_answer_is_stored_as_csat_and_ces_with_the_call_fields_and_a_detractor_is_a_detractor()
    {
        var r = Make();
        await r.Svc.IngestAsync(Cx, Call(r, "CALL-9", CallResult.FollowUp, by: CallHandler.Human, d: CallDirection.Inbound));
        Assert.Equal(Failure.Invalid, (await r.Svc.AnswerAsync(Cx, "CALL-9", new CallSurveyAnswer(5, 6, null, null))).Error); // not sent yet
        r.Clock.Advance(TimeSpan.FromMinutes(56));
        await r.Svc.DispatchDueAsync();
        Assert.Equal(Failure.Invalid, (await r.Svc.AnswerAsync(Cx, "CALL-9", new CallSurveyAnswer(6, 6, null, null))).Error);
        Assert.Equal(Failure.Invalid, (await r.Svc.AnswerAsync(Cx, "CALL-9", new CallSurveyAnswer(5, 8, null, null))).Error);
        Assert.Equal(Failure.NotFound, (await r.Svc.AnswerAsync(Cx, "nope", new CallSurveyAnswer(5, 6, null, null))).Error);
        Assert.Equal(Failure.Forbidden, (await r.Svc.AnswerAsync(Exec1, "CALL-9", new CallSurveyAnswer(5, 6, null, null))).Error);

        var done = (await r.Svc.AnswerAsync(Cx, "CALL-9", new CallSurveyAnswer(2, 3, "Nobody called me back", null))).Value!;
        Assert.Equal(CallSurveyStatus.Answered, done.Status);
        var rows = (await r.Answers.ListAsync()).Where(x => x.CallId == "CALL-9").ToList();
        Assert.Equal(2, rows.Count);
        var csat = rows.Single(x => x.Measure == Measure.Csat);
        var ces = rows.Single(x => x.Measure == Measure.Ces);
        Assert.Equal(7, ces.Scale);
        Assert.Equal(CallResult.FollowUp, csat.CallResult);
        Assert.Equal(CallDirection.Inbound, csat.CallDirection);
        Assert.Equal(CallHandler.Human, csat.CallHandler);
        Assert.Equal("Sara", csat.HandledBy);
        Assert.Equal("Follow-up agreed", csat.Moment!.En);
        Assert.Equal("Call center agent · Viewing follow-up", csat.Touchpoint!.En);
        Assert.Equal(ChannelId.Whatsapp, csat.Source);
        Assert.Equal(DetractorReason.SlowReply, csat.Reason);
        Assert.Equal(Failure.Conflict, (await r.Svc.AnswerAsync(Cx, "CALL-9", new CallSurveyAnswer(5, 6, null, null))).Error);

        // the answers feed the indicators (RE line)
        var ind = (await r.Surveys.IndicatorsAsync(Cx, ProductId.Re, null, null, null)).Value!;
        Assert.Equal(1, ind.Csat.Responses);
        Assert.Equal(0, ind.Csat.Pct);
        // and the detractor analysis, by CSAT
        Assert.Single((await r.Surveys.DetractorsAsync(Cx, ProductId.Re, Measure.Csat, null, null, null, null)).Value!.Rows);
    }

    [Fact]
    public async Task The_script_name_never_decides_the_reason_and_an_ai_call_has_no_person_name()
    {
        var r = Make();
        await r.Svc.IngestAsync(Cx, new CallEnded("M1", r.Clock.Now.AddMinutes(-5), CallDirection.Outbound, CallHandler.Ai, "Maintenance check", CallResult.Successful, 80, "+971501111111", null, EnvId.Dub));
        r.Clock.Advance(TimeSpan.FromMinutes(56));
        await r.Svc.DispatchDueAsync();
        await r.Svc.AnswerAsync(Cx, "M1", new CallSurveyAnswer(1, 1, null, null));
        var csat = (await r.Answers.ListAsync()).Single(x => x.Measure == Measure.Csat);
        Assert.Equal(DetractorReason.Pending, csat.Reason);
        Assert.Null(csat.HandledBy);
        Assert.Equal("AI agent · Maintenance check", csat.Touchpoint!.En);
    }

    [Fact]
    public async Task A_qa_score_that_arrives_later_is_attached_and_never_held_the_survey()
    {
        var r = Make();
        await r.Svc.IngestAsync(Cx, Call(r));
        r.Clock.Advance(TimeSpan.FromMinutes(56));
        await r.Svc.DispatchDueAsync(); // sent without waiting for QA
        await r.Svc.AnswerAsync(Cx, "CALL-1", new CallSurveyAnswer(5, 7, null, null));
        Assert.Equal(Failure.Invalid, (await r.Svc.AttachQaAsync(Cx, "CALL-1", 101)).Error);
        Assert.Equal(Failure.NotFound, (await r.Svc.AttachQaAsync(Cx, "zzz", 80)).Error);
        Assert.Equal(82, (await r.Svc.AttachQaAsync(Team, "CALL-1", 82)).Value!.QaScore);
        Assert.True((await r.Answers.ListAsync()).Where(x => x.CallId == "CALL-1").All(x => x.QaScore == 82));
    }

    [Fact]
    public async Task The_report_counts_skips_results_handlers_and_the_drop_rate_per_script()
    {
        var r = Make();
        for (var n = 0; n < 6; n++) r.Dir.Set(new CallContact($"p-{n + 10}", ProductId.Re, false, true, false, $"+97150222222{n}"));
        // 4 outbound AI calls of one script: 1 dropped (25% -> red); one completed and answered
        await r.Svc.IngestAsync(Cx, Call(r, "R1", phone: "+971502222220"));
        await r.Svc.IngestAsync(Cx, Call(r, "R2", CallResult.DroppedAfterGreeting, "+971502222221", 3));
        await r.Svc.IngestAsync(Cx, Call(r, "R3", CallResult.NoAnswer, "+971502222222", 0));
        await r.Svc.IngestAsync(Cx, Call(r, "R4", CallResult.Busy, "+971502222223", 0));
        await r.Svc.IngestAsync(Cx, Call(r, "R5", CallResult.Successful, phone: "+971509999999", by: CallHandler.Human, d: CallDirection.Inbound)); // not in CRM
        r.Clock.Advance(TimeSpan.FromMinutes(56));
        await r.Svc.DispatchDueAsync();
        await r.Svc.AnswerAsync(Cx, "R1", new CallSurveyAnswer(5, 6, null, null));

        var rep = (await r.Svc.ReportAsync(Cx, null, null, null)).Value!;
        Assert.Equal(5, rep.CallsEnded);
        Assert.Equal(1, rep.Sent);
        Assert.Equal(1, rep.Answered);
        Assert.Equal(100, rep.CsatPct);
        Assert.Equal(6.0, rep.CesAverage);
        Assert.Equal(1, rep.Skipped.Single(x => x.Key == CallSkip.NotInCrm).Count);
        Assert.Equal(3, rep.Skipped.Single(x => x.Key == CallSkip.NotCompleted).Count);
        Assert.Equal(2, rep.ByHandler.Count);
        Assert.Equal(1, rep.ByResult.Single(x => x.Key == "appointment").Answered);
        var d = rep.DropRates.Single(); // outbound AI only
        Assert.Equal(4, d.Calls);
        Assert.Equal(1, d.Dropped);
        Assert.Equal(25.0, d.RatePct);
        Assert.Equal(DropBand.Red, d.Band);
        Assert.Equal(Failure.Forbidden, (await r.Svc.ReportAsync(Lead, null, null, null)).Error); // Team lead has no Surveys page
        Assert.True((await r.Svc.ReportAsync(Exec1, null, null, null)).IsOk);
    }

    [Fact]
    public async Task A_draft_rule_is_replayed_over_the_stored_calls()
    {
        var r = Make();
        await r.Svc.IngestAsync(Cx, Call(r, "P1"));
        await r.Svc.IngestAsync(Cx, Call(r, "P2", CallResult.NotInterested));
        var draft = CallSurveyRule.Default with { SendOn = [CallResult.Successful] };
        var p = (await r.Svc.PreviewAsync(Cx, draft, 30)).Value!;
        Assert.Equal(2, p.Calls);
        Assert.Equal(1, p.SendNow);
        Assert.Equal(0, p.SendDraft);
        Assert.Equal(Failure.Invalid, (await r.Svc.PreviewAsync(Cx, CallSurveyRule.Default with { SendOn = [CallResult.Busy] }, 30)).Error);
        Assert.Equal(Failure.Forbidden, (await r.Svc.PreviewAsync(Team, draft, 30)).Error);
    }

    [Fact]
    public void Only_the_cx_manager_edits_the_rule_and_it_is_validated()
    {
        Assert.True(SettingKeys.CanEdit(SettingKeys.CallSurveyRule, Cxmgr));
        Assert.False(SettingKeys.CanEdit(SettingKeys.CallSurveyRule, Cxteam));
        Assert.False(SettingKeys.CanEdit(SettingKeys.CallSurveyRule, Exec));
        var v = new CallSurveyRuleValidator();
        JsonElement J(object o) => JsonSerializer.SerializeToElement(o);
        Assert.Null(v.Validate(J(new { enabled = false, sendOn = new[] { "appointment", "follow_up" }, fromHour = 8, toHour = 22 }), null));
        Assert.NotNull(v.Validate(J(new { sendOn = new[] { "busy" } }), null));
        Assert.NotNull(v.Validate(J(new { sendOn = new[] { "nonsense" } }), null));
        Assert.NotNull(v.Validate(J(new { sendAfterMin = 90, sendBeforeMin = 60 }), null));
        Assert.NotNull(v.Validate(J(new[] { 1 }), null));
        // the frontend sends criticalStops too: accepted and ignored
        Assert.Null(v.Validate(J(new { criticalStops = true }), null));
    }
}
