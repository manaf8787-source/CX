using Microsoft.AspNetCore.Mvc;
using PsiCx.Application;
using PsiCx.Domain;

namespace PsiCx.Api.Controllers;

/// <summary>Gifts to customers, emailed to the Administration team, with the stock and the history. CX only.</summary>
[ApiController]
[Route("api/v1/gifts")]
public sealed class GiftsController(GiftService gifts, ICurrentUser me) : ControllerBase
{
    public sealed record ItemRequest(Bi Name, GiftKind Kind, Bi Nature, decimal? UnitValue, int LowAt, int OpeningStock);
    public sealed record MoveRequest(int Qty, string? Note);
    public sealed record DecisionRequest(bool Approve, string? Note);

    [HttpGet] public async Task<IActionResult> List([FromQuery] GiftStatus? status, CancellationToken ct) => this.ToActionResult(await gifts.ListAsync(me.Actor, status, ct));
    [HttpPost] public async Task<IActionResult> Request([FromBody] NewGiftRequest b, CancellationToken ct) => this.ToActionResult(await gifts.RequestAsync(me.Actor, b, ct));
    [HttpPost("{id}/decision")] public async Task<IActionResult> Decide(string id, [FromBody] DecisionRequest b, CancellationToken ct) => this.ToActionResult(await gifts.DecideAsync(me.Actor, id, b.Approve, b.Note, ct));
    [HttpPost("{id}/send")] public async Task<IActionResult> Send(string id, [FromBody] SendDetails b, CancellationToken ct) => this.ToActionResult(await gifts.SendAsync(me.Actor, id, b, ct));
    [HttpPost("{id}/delivered")] public async Task<IActionResult> Delivered(string id, CancellationToken ct) => this.ToActionResult(await gifts.MarkDeliveredAsync(me.Actor, id, ct));
    [HttpPost("{id}/cancel")] public async Task<IActionResult> Cancel(string id, CancellationToken ct) => this.ToActionResult(await gifts.CancelAsync(me.Actor, id, ct));

    [HttpGet("stock")] public async Task<IActionResult> Stock(CancellationToken ct) => this.ToActionResult(await gifts.StockAsync(me.Actor, ct));
    [HttpPost("items")] public async Task<IActionResult> AddItem([FromBody] ItemRequest b, CancellationToken ct) => this.ToActionResult(await gifts.AddItemAsync(me.Actor, b.Name, b.Kind, b.Nature, b.UnitValue, b.LowAt, b.OpeningStock, ct));
    [HttpPost("items/{itemId}/stock")] public async Task<IActionResult> Move(string itemId, [FromBody] MoveRequest b, CancellationToken ct) => this.ToActionResult(await gifts.MoveStockAsync(me.Actor, itemId, b.Qty, b.Note, ct));
}
