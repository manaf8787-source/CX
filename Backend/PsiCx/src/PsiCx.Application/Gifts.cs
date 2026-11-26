using PsiCx.Domain;

namespace PsiCx.Application;

public interface IGiftStore
{
    Task<IReadOnlyList<GiftItem>> ItemsAsync(CancellationToken ct = default);
    Task<GiftItem> AddItemAsync(Func<string, GiftItem> build, CancellationToken ct = default);
    Task<IReadOnlyList<StockMove>> MovesAsync(CancellationToken ct = default);
    Task<StockMove> AddMoveAsync(Func<string, StockMove> build, CancellationToken ct = default);
    Task<IReadOnlyList<Gift>> GiftsAsync(CancellationToken ct = default);
    Task<Gift?> GetAsync(string id, CancellationToken ct = default);
    Task<Gift> AddAsync(Func<string, Gift> build, CancellationToken ct = default);
    /// <summary>Replaces the gift only when its status is still the expected one (two people act on the same request).</summary>
    Task<bool> TryReplaceAsync(Gift next, GiftStatus expected, CancellationToken ct = default);
}

/// <summary>The email to the Administration team. The real one is built with the platform's mail service; until then nothing is sent.</summary>
public interface IGiftMailer
{
    Task SendAsync(Gift gift, GiftItem item, string to, CancellationToken ct = default);
}

public sealed class NoGiftMailer : IGiftMailer
{
    public Task SendAsync(Gift gift, GiftItem item, string to, CancellationToken ct = default) => Task.CompletedTask;
}

public sealed record NewGiftRequest(
    string? PersonId, string FullName, string ItemId, int Qty, GiftReason Reason, string? Justification, string? RelatedRef,
    Bi? CaseTitle, IReadOnlyList<Bi>? CaseFacts, Bi? TeamNote, string? Where);

public sealed record SendDetails(string Phone, string? Email, ContactMethod ContactMethod, string Address, DateOnly DeliverOn, string DeliverWindow, string? Note);

public sealed record GiftStock(GiftItem Item, int Available, bool Low);

/// <summary>
/// Gifts (owner, 23 Nov): CX sends a gift to a customer; the request is emailed to the Administration team, with a stock per item. Only CX
/// opens it. A team member asks, the CX manager approves or rejects, the member then fills the delivery details and sends.
/// </summary>
public sealed class GiftService(IGiftStore store, IGiftMailer mailer, IClock clock)
{
    public const string AdminEmail = "administration@psi.sample";

    private static ServiceResult<T> Deny<T>(Actor? a, string msg)
        => a is null ? ServiceResult<T>.Fail(Failure.Unauthenticated, "Sign in first.") : ServiceResult<T>.Fail(Failure.Forbidden, msg);

    private static bool IsCx(Actor a) => a.Role is RoleId.Cxmgr or RoleId.Cxteam;
    private const string CxOnly = "Gifts are for the CX manager and the CX team.";

    public async Task<ServiceResult<IReadOnlyList<GiftStock>>> StockAsync(Actor? actor, CancellationToken ct = default)
    {
        if (actor is null || !IsCx(actor)) return Deny<IReadOnlyList<GiftStock>>(actor, CxOnly);
        var gifts = await store.GiftsAsync(ct);
        var moves = await store.MovesAsync(ct);
        var rows = (await store.ItemsAsync(ct)).Where(i => !i.Archived).Select(i =>
        {
            var left = Available(i.Id, moves, gifts);
            return new GiftStock(i, left, left <= i.LowAt);
        }).ToList();
        return ServiceResult<IReadOnlyList<GiftStock>>.Ok(rows);
    }

    /// <summary>Stock received minus every gift that was emailed (sent or delivered). A cancelled or unsent request takes nothing out.</summary>
    internal static int Available(string itemId, IEnumerable<StockMove> moves, IEnumerable<Gift> gifts)
        => moves.Where(m => m.ItemId == itemId).Sum(m => m.Qty)
           - gifts.Where(g => g.ItemId == itemId && g.Status is GiftStatus.Sent or GiftStatus.Delivered).Sum(g => g.Qty);

    public async Task<ServiceResult<IReadOnlyList<Gift>>> ListAsync(Actor? actor, GiftStatus? status, CancellationToken ct = default)
    {
        if (actor is null || !IsCx(actor)) return Deny<IReadOnlyList<Gift>>(actor, CxOnly);
        var all = (await store.GiftsAsync(ct)).Where(g => status is null || g.Status == status);
        // A team member sees their own requests; the CX manager sees all (the approvals queue).
        if (actor.Role == RoleId.Cxteam) all = all.Where(g => g.RequestedById == actor.UserId);
        return ServiceResult<IReadOnlyList<Gift>>.Ok(all.OrderByDescending(g => g.RequestedAt).ToList());
    }

    public async Task<ServiceResult<GiftItem>> AddItemAsync(Actor? actor, Bi name, GiftKind kind, Bi nature, decimal? unitValue, int lowAt, int openingStock, CancellationToken ct = default)
    {
        if (actor is null || actor.Role != RoleId.Cxmgr) return Deny<GiftItem>(actor, "The CX manager adds gift items and stock.");
        if (string.IsNullOrWhiteSpace(name.En) || string.IsNullOrWhiteSpace(name.Ar)) return ServiceResult<GiftItem>.Fail(Failure.Invalid, "A gift item has a name in English and Arabic.");
        if (lowAt < 0 || openingStock < 0 || unitValue < 0) return ServiceResult<GiftItem>.Fail(Failure.Invalid, "Numbers cannot be negative.");
        var item = await store.AddItemAsync(id => new GiftItem(id, name, kind, nature, unitValue, lowAt), ct);
        if (openingStock > 0) await store.AddMoveAsync(id => new StockMove(id, item.Id, openingStock, clock.UtcNow, actor.Email, "Opening stock"), ct);
        return ServiceResult<GiftItem>.Ok(item);
    }

    public async Task<ServiceResult<StockMove>> MoveStockAsync(Actor? actor, string itemId, int qty, string? note, CancellationToken ct = default)
    {
        if (actor is null || actor.Role != RoleId.Cxmgr) return Deny<StockMove>(actor, "The CX manager changes the stock.");
        if (qty == 0) return ServiceResult<StockMove>.Fail(Failure.Invalid, "A stock movement is not zero.");
        var item = (await store.ItemsAsync(ct)).FirstOrDefault(i => i.Id == itemId);
        if (item is null) return ServiceResult<StockMove>.Fail(Failure.NotFound, "Gift item not found.");
        if (qty < 0)
        {
            var left = Available(itemId, await store.MovesAsync(ct), await store.GiftsAsync(ct));
            if (left + qty < 0) return ServiceResult<StockMove>.Fail(Failure.Invalid, "The stock cannot go below zero.");
        }
        return ServiceResult<StockMove>.Ok(await store.AddMoveAsync(id => new StockMove(id, itemId, qty, clock.UtcNow, actor.Email, note), ct));
    }

    /// <summary>A request. The CX manager's own is approved at once; a team member's waits for the manager and needs a justification.</summary>
    public async Task<ServiceResult<Gift>> RequestAsync(Actor? actor, NewGiftRequest r, CancellationToken ct = default)
    {
        if (actor is null || !IsCx(actor)) return Deny<Gift>(actor, CxOnly);
        if (string.IsNullOrWhiteSpace(r.FullName)) return ServiceResult<Gift>.Fail(Failure.Invalid, "A gift goes to a named customer.");
        if (r.Qty < 1) return ServiceResult<Gift>.Fail(Failure.Invalid, "At least one gift.");
        var item = (await store.ItemsAsync(ct)).FirstOrDefault(i => i.Id == r.ItemId && !i.Archived);
        if (item is null) return ServiceResult<Gift>.Fail(Failure.NotFound, "Gift item not found.");
        var manager = actor.Role == RoleId.Cxmgr;
        if (!manager && string.IsNullOrWhiteSpace(r.Justification)) return ServiceResult<Gift>.Fail(Failure.Invalid, "Say why this customer is eligible for a gift.");
        var now = clock.UtcNow;
        var gift = await store.AddAsync(id => new Gift(
            id, r.PersonId, r.FullName.Trim(), "", null, ContactMethod.Call, "", null, "", r.ItemId, r.Qty, r.Reason, null, r.RelatedRef ?? id,
            actor.Email, actor.UserId, now, AdminEmail, manager ? GiftStatus.Approved : GiftStatus.Pending,
            Justification: r.Justification?.Trim(), ApprovedBy: manager ? actor.Email : null, DecidedAt: manager ? now : null,
            CaseTitle: r.CaseTitle, CaseFacts: r.CaseFacts, TeamNote: r.TeamNote, Where: r.Where), ct);
        return ServiceResult<Gift>.Ok(gift);
    }

    /// <summary>The CX manager approves or rejects a request that is waiting.</summary>
    public async Task<ServiceResult<Gift>> DecideAsync(Actor? actor, string id, bool approve, string? note, CancellationToken ct = default)
    {
        if (actor is null || actor.Role != RoleId.Cxmgr) return Deny<Gift>(actor, "The CX manager approves or rejects gifts.");
        var g = await store.GetAsync(id, ct);
        if (g is null) return ServiceResult<Gift>.Fail(Failure.NotFound, "Gift request not found.");
        if (g.Status != GiftStatus.Pending) return ServiceResult<Gift>.Fail(Failure.Conflict, "This request was already decided.");
        if (!approve && string.IsNullOrWhiteSpace(note)) return ServiceResult<Gift>.Fail(Failure.Invalid, "Say why it is not approved.");
        var next = g with { Status = approve ? GiftStatus.Approved : GiftStatus.Rejected, ApprovedBy = actor.Email, DecidedAt = clock.UtcNow, DecisionNote = note?.Trim() };
        return await Replace(next, GiftStatus.Pending, ct);
    }

    /// <summary>The requester (or the manager) fills the delivery details and emails Administration. Takes the quantity out of the stock.</summary>
    public async Task<ServiceResult<Gift>> SendAsync(Actor? actor, string id, SendDetails d, CancellationToken ct = default)
    {
        if (actor is null || !IsCx(actor)) return Deny<Gift>(actor, CxOnly);
        var g = await store.GetAsync(id, ct);
        if (g is null) return ServiceResult<Gift>.Fail(Failure.NotFound, "Gift request not found.");
        if (actor.Role == RoleId.Cxteam && g.RequestedById != actor.UserId) return ServiceResult<Gift>.Fail(Failure.Forbidden, "Only the person who asked sends it.");
        if (g.Status != GiftStatus.Approved) return ServiceResult<Gift>.Fail(Failure.Conflict, "Only an approved request is sent.");
        if (string.IsNullOrWhiteSpace(d.Phone) || string.IsNullOrWhiteSpace(d.Address) || string.IsNullOrWhiteSpace(d.DeliverWindow))
            return ServiceResult<Gift>.Fail(Failure.Invalid, "Administration needs the phone, the address and the delivery window.");
        if (d.DeliverOn < DateOnly.FromDateTime(UaeTime.ToWall(clock.UtcNow))) return ServiceResult<Gift>.Fail(Failure.Invalid, "The delivery day cannot be in the past.");
        var item = (await store.ItemsAsync(ct)).First(i => i.Id == g.ItemId);
        var left = Available(g.ItemId, await store.MovesAsync(ct), await store.GiftsAsync(ct));
        if (left < g.Qty) return ServiceResult<Gift>.Fail(Failure.Invalid, $"Only {left} in stock.");
        var next = g with { Phone = d.Phone.Trim(), Email = d.Email, ContactMethod = d.ContactMethod, Address = d.Address.Trim(), DeliverOn = d.DeliverOn, DeliverWindow = d.DeliverWindow, Note = d.Note, Status = GiftStatus.Sent };
        var saved = await Replace(next, GiftStatus.Approved, ct);
        if (saved.IsOk) await mailer.SendAsync(saved.Value!, item, g.EmailedTo, ct);
        return saved;
    }

    /// <summary>Administration confirms delivery. In the real platform this is the link in the email; here CX records it.</summary>
    public async Task<ServiceResult<Gift>> MarkDeliveredAsync(Actor? actor, string id, CancellationToken ct = default)
    {
        if (actor is null || !IsCx(actor)) return Deny<Gift>(actor, CxOnly);
        var g = await store.GetAsync(id, ct);
        if (g is null) return ServiceResult<Gift>.Fail(Failure.NotFound, "Gift request not found.");
        if (g.Status != GiftStatus.Sent) return ServiceResult<Gift>.Fail(Failure.Conflict, "Only a sent gift is delivered.");
        return await Replace(g with { Status = GiftStatus.Delivered, DeliveredAt = clock.UtcNow }, GiftStatus.Sent, ct);
    }

    /// <summary>Cancels a request that has not been delivered; a sent one returns its quantity to the stock. The requester or the manager.</summary>
    public async Task<ServiceResult<Gift>> CancelAsync(Actor? actor, string id, CancellationToken ct = default)
    {
        if (actor is null || !IsCx(actor)) return Deny<Gift>(actor, CxOnly);
        var g = await store.GetAsync(id, ct);
        if (g is null) return ServiceResult<Gift>.Fail(Failure.NotFound, "Gift request not found.");
        if (actor.Role == RoleId.Cxteam && g.RequestedById != actor.UserId) return ServiceResult<Gift>.Fail(Failure.Forbidden, "Only the person who asked cancels it.");
        if (g.Status is GiftStatus.Delivered or GiftStatus.Cancelled or GiftStatus.Rejected) return ServiceResult<Gift>.Fail(Failure.Conflict, "This request can no longer be cancelled.");
        return await Replace(g with { Status = GiftStatus.Cancelled, CancelledAt = clock.UtcNow }, g.Status, ct);
    }

    /// <summary>Whether a recovery gift reached this person (emailed or delivered): the "gift" in how a detractor was reached.</summary>
    public async Task<bool> HasRecoveryGiftAsync(string personId, CancellationToken ct = default)
        => (await store.GiftsAsync(ct)).Any(g => g.PersonId == personId && g.Reason == GiftReason.Recovery && g.Status is GiftStatus.Sent or GiftStatus.Delivered);

    private async Task<ServiceResult<Gift>> Replace(Gift next, GiftStatus expected, CancellationToken ct)
        => await store.TryReplaceAsync(next, expected, ct)
            ? ServiceResult<Gift>.Ok(next)
            : ServiceResult<Gift>.Fail(Failure.Conflict, "Someone else changed this request first. Reload and try again.");
}
