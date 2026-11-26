using PsiCx.Application;
using PsiCx.Domain;
using PsiCx.Infrastructure;
using static PsiCx.Domain.RoleId;

namespace PsiCx.Tests;

public class GiftServiceTests
{
    private static readonly Actor Mgr = new("u-cx", "cx@psi.sample", Cxmgr);
    private static readonly Actor Team = new("u-t1", "abeer@psi.sample", Cxteam);
    private static readonly Actor Team2 = new("u-t2", "dina@psi.sample", Cxteam);
    private static readonly Actor Boss = new("u-e", "e@psi.sample", Exec);
    private static readonly Bi Flowers = new("Flower bouquet", "باقة ورد");

    private sealed class SpyMailer : IGiftMailer
    {
        public int Sent;
        public Task SendAsync(Gift gift, GiftItem item, string to, CancellationToken ct = default) { Sent++; return Task.CompletedTask; }
    }

    private static async Task<(GiftService S, FakeClock C, SpyMailer M, string Item)> Make(int stock = 5)
    {
        var clock = new FakeClock(new DateTimeOffset(2026, 11, 26, 8, 0, 0, TimeSpan.Zero));
        var mail = new SpyMailer();
        var s = new GiftService(new InMemoryGiftStore(), mail, clock);
        var item = (await s.AddItemAsync(Mgr, Flowers, GiftKind.Physical, new Bi("Medium", "متوسطة"), 250, 2, stock)).Value!;
        return (s, clock, mail, item.Id);
    }

    private static NewGiftRequest Ask(string item, string? why = "She chased us three times", string? person = "p-1", GiftReason reason = GiftReason.Recovery, int qty = 1)
        => new(person, "Mariam", item, qty, reason, why, null, null, null, null, null);

    private static SendDetails Details(DateOnly on) => new("+971 50 000 0000", null, ContactMethod.Call, "Reem Island", on, "10:00–13:00", null);

    [Fact]
    public async Task Only_CX_opens_gifts_and_only_the_manager_runs_items_and_stock()
    {
        var (s, _, _, item) = await Make();
        Assert.Equal(Failure.Unauthenticated, (await s.ListAsync(null, null)).Error);
        Assert.Equal(Failure.Forbidden, (await s.ListAsync(Boss, null)).Error);
        Assert.Equal(Failure.Forbidden, (await s.StockAsync(Boss)).Error);
        Assert.Equal(Failure.Forbidden, (await s.AddItemAsync(Team, Flowers, GiftKind.Physical, Flowers, null, 1, 1)).Error);
        Assert.Equal(Failure.Forbidden, (await s.MoveStockAsync(Team, item, 3, null)).Error);
        Assert.Equal(Failure.Invalid, (await s.AddItemAsync(Mgr, new Bi("x", " "), GiftKind.Voucher, Flowers, null, 1, 1)).Error);
        Assert.Equal(Failure.Invalid, (await s.MoveStockAsync(Mgr, item, 0, null)).Error);
        Assert.Equal(Failure.Invalid, (await s.MoveStockAsync(Mgr, item, -9, null)).Error);
        Assert.Equal(Failure.NotFound, (await s.MoveStockAsync(Mgr, "gi-99", 1, null)).Error);
    }

    [Fact]
    public async Task A_team_request_waits_for_the_manager_and_needs_a_reason_the_managers_own_is_approved_at_once()
    {
        var (s, _, _, item) = await Make();
        Assert.Equal(Failure.Invalid, (await s.RequestAsync(Team, Ask(item, why: " "))).Error);
        Assert.Equal(Failure.Invalid, (await s.RequestAsync(Team, Ask(item, qty: 0))).Error);
        Assert.Equal(Failure.NotFound, (await s.RequestAsync(Team, Ask("gi-99"))).Error);
        Assert.Equal(GiftStatus.Pending, (await s.RequestAsync(Team, Ask(item))).Value!.Status);
        Assert.Equal(GiftStatus.Approved, (await s.RequestAsync(Mgr, Ask(item, why: null))).Value!.Status);
        // the team member sees their own; the manager sees all
        await s.RequestAsync(Team2, Ask(item));
        Assert.Single((await s.ListAsync(Team, null)).Value!);
        Assert.Equal(3, (await s.ListAsync(Mgr, null)).Value!.Count);
    }

    [Fact]
    public async Task The_manager_decides_once_and_a_rejection_needs_a_reason()
    {
        var (s, _, _, item) = await Make();
        var g = (await s.RequestAsync(Team, Ask(item))).Value!;
        Assert.Equal(Failure.Forbidden, (await s.DecideAsync(Team, g.Id, true, null)).Error);
        Assert.Equal(Failure.Invalid, (await s.DecideAsync(Mgr, g.Id, false, " ")).Error);
        Assert.Equal(Failure.NotFound, (await s.DecideAsync(Mgr, "gf-99", true, null)).Error);
        var ok = (await s.DecideAsync(Mgr, g.Id, true, "Call him first")).Value!;
        Assert.Equal(GiftStatus.Approved, ok.Status);
        Assert.Equal("cx@psi.sample", ok.ApprovedBy);
        Assert.Equal(Failure.Conflict, (await s.DecideAsync(Mgr, g.Id, false, "late")).Error);
    }

    [Fact]
    public async Task Sending_emails_Administration_and_takes_the_stock_cancelling_gives_it_back()
    {
        var (s, c, mail, item) = await Make(stock: 2);
        var g = (await s.RequestAsync(Team, Ask(item))).Value!;
        var today = DateOnly.FromDateTime(UaeTime.ToWall(c.Now));
        Assert.Equal(Failure.Conflict, (await s.SendAsync(Team, g.Id, Details(today))).Error); // not approved yet
        await s.DecideAsync(Mgr, g.Id, true, null);
        Assert.Equal(Failure.Forbidden, (await s.SendAsync(Team2, g.Id, Details(today))).Error);
        Assert.Equal(Failure.Invalid, (await s.SendAsync(Team, g.Id, Details(today) with { Address = " " })).Error);
        Assert.Equal(Failure.Invalid, (await s.SendAsync(Team, g.Id, Details(today.AddDays(-1)))).Error);
        Assert.Equal(2, (await s.StockAsync(Mgr)).Value!.Single().Available);
        var sent = (await s.SendAsync(Team, g.Id, Details(today))).Value!;
        Assert.Equal(GiftStatus.Sent, sent.Status);
        Assert.Equal(1, mail.Sent);
        Assert.Equal(1, (await s.StockAsync(Mgr)).Value!.Single().Available);
        Assert.True((await s.StockAsync(Mgr)).Value!.Single().Low); // 1 left, warn at 2
        Assert.Equal(GiftStatus.Cancelled, (await s.CancelAsync(Team, g.Id)).Value!.Status);
        Assert.Equal(2, (await s.StockAsync(Mgr)).Value!.Single().Available);
        Assert.Equal(Failure.Conflict, (await s.CancelAsync(Team, g.Id)).Error);
    }

    [Fact]
    public async Task A_send_is_refused_when_the_stock_is_not_enough()
    {
        var (s, c, _, item) = await Make(stock: 1);
        var g = (await s.RequestAsync(Mgr, Ask(item, qty: 3))).Value!;
        var r = await s.SendAsync(Mgr, g.Id, Details(DateOnly.FromDateTime(UaeTime.ToWall(c.Now))));
        Assert.Equal(Failure.Invalid, r.Error);
        Assert.Equal("Only 1 in stock.", r.Message);
    }

    [Fact]
    public async Task Delivered_gifts_count_and_a_recovery_gift_is_known_to_the_re_survey_view()
    {
        var (s, c, _, item) = await Make();
        var g = (await s.RequestAsync(Mgr, Ask(item, person: "p-7"))).Value!;
        Assert.False(await s.HasRecoveryGiftAsync("p-7")); // approved is not yet emailed
        await s.SendAsync(Mgr, g.Id, Details(DateOnly.FromDateTime(UaeTime.ToWall(c.Now))));
        Assert.True(await s.HasRecoveryGiftAsync("p-7"));
        Assert.Equal(GiftStatus.Delivered, (await s.MarkDeliveredAsync(Mgr, g.Id)).Value!.Status);
        Assert.Equal(Failure.Conflict, (await s.CancelAsync(Mgr, g.Id)).Error);
        Assert.True(await s.HasRecoveryGiftAsync("p-7"));
        Assert.False(await s.HasRecoveryGiftAsync("p-8"));
        // a thank-you gift is not a recovery gift
        var t = (await s.RequestAsync(Mgr, Ask(item, person: "p-9", reason: GiftReason.Thanks))).Value!;
        await s.SendAsync(Mgr, t.Id, Details(DateOnly.FromDateTime(UaeTime.ToWall(c.Now))));
        Assert.False(await s.HasRecoveryGiftAsync("p-9"));
    }
}
