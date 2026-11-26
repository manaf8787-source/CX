using PsiCx.Application;
using PsiCx.Domain;

namespace PsiCx.Infrastructure;

/// <summary>In-memory audit store for development and tests. Append-only, like the real one. Replaced by the EF Core store once the database is chosen.</summary>
public sealed class InMemoryAuditStore : IAuditStore
{
    private readonly List<AuditEntry> _entries = [];
    private readonly object _gate = new();

    public Task AppendAsync(AuditEntry entry, CancellationToken ct = default)
    {
        lock (_gate) _entries.Add(entry);
        return Task.CompletedTask;
    }

    public Task<AuditEntry?> LastByUserAsync(string userId, CancellationToken ct = default)
    {
        lock (_gate) return Task.FromResult(_entries.LastOrDefault(e => e.UserId == userId));
    }

    public Task<AuditPage> QueryAsync(AuditQuery q, CancellationToken ct = default)
    {
        lock (_gate)
        {
            var found = _entries
                .Where(e => (q.UserId is null || e.UserId == q.UserId)
                         && (q.Kind is null || e.Kind == q.Kind)
                         && (q.From is null || e.At >= q.From)
                         && (q.To is null || e.At <= q.To))
                .Reverse() // newest first
                .ToList();
            return Task.FromResult(new AuditPage(found.Skip(q.Skip).Take(q.Take).ToList(), found.Count));
        }
    }
}

public sealed class InMemorySettingsStore : ISettingsStore
{
    private readonly Dictionary<string, List<SettingVersion>> _byKey = [];
    private readonly object _gate = new();

    public Task<SettingVersion?> CurrentAsync(string key, CancellationToken ct = default)
    {
        lock (_gate) return Task.FromResult(_byKey.TryGetValue(key, out var list) ? list[^1] : null);
    }

    public Task<IReadOnlyList<SettingVersion>> HistoryAsync(string key, CancellationToken ct = default)
    {
        lock (_gate) return Task.FromResult<IReadOnlyList<SettingVersion>>(_byKey.TryGetValue(key, out var list) ? list.ToList() : []);
    }

    public Task<bool> TryAppendAsync(SettingVersion next, CancellationToken ct = default)
    {
        lock (_gate)
        {
            var current = _byKey.TryGetValue(next.Key, out var list) ? list[^1].Version : 0;
            if (next.Version != current + 1) return Task.FromResult(false);
            if (list is null) _byKey[next.Key] = list = [];
            list.Add(next);
            return Task.FromResult(true);
        }
    }
}

public sealed class InMemoryFixStore : IFixStore
{
    private readonly List<CorrectiveAction> _items = [];
    private readonly object _gate = new();
    private int _last;

    public Task<IReadOnlyList<CorrectiveAction>> ListAsync(CancellationToken ct = default)
    { lock (_gate) return Task.FromResult<IReadOnlyList<CorrectiveAction>>(_items.ToList()); }

    public Task<CorrectiveAction?> GetAsync(string id, CancellationToken ct = default)
    { lock (_gate) return Task.FromResult(_items.FirstOrDefault(f => f.Id == id)); }

    public Task<CorrectiveAction> AddAsync(Func<string, CorrectiveAction> build, CancellationToken ct = default)
    {
        lock (_gate)
        {
            var item = build($"ca-{++_last}");
            _items.Add(item);
            return Task.FromResult(item);
        }
    }

    public Task<bool> TryReplaceAsync(CorrectiveAction next, FixStatus expected, CancellationToken ct = default)
    {
        lock (_gate)
        {
            var i = _items.FindIndex(f => f.Id == next.Id);
            if (i < 0 || _items[i].Status != expected) return Task.FromResult(false);
            _items[i] = next;
            return Task.FromResult(true);
        }
    }
}

public sealed class InMemoryInvestigationStore : IInvestigationStore
{
    private readonly List<Investigation> _items = [];
    private readonly object _gate = new();
    private int _last;

    public Task<IReadOnlyList<Investigation>> ListAsync(CancellationToken ct = default)
    { lock (_gate) return Task.FromResult<IReadOnlyList<Investigation>>(_items.ToList()); }

    public Task<Investigation> AddAsync(Func<string, Investigation> build, CancellationToken ct = default)
    {
        lock (_gate)
        {
            var item = build($"inv-{++_last}");
            _items.Add(item);
            return Task.FromResult(item);
        }
    }
}

public sealed class InMemorySignalStore : ISignalStore
{
    private readonly List<Signal> _items = [];
    private readonly object _gate = new();

    public Task<bool> AddAsync(Signal signal, CancellationToken ct = default)
    {
        lock (_gate)
        {
            if (_items.Any(s => s.Id == signal.Id)) return Task.FromResult(false);
            _items.Add(signal);
            return Task.FromResult(true);
        }
    }

    public Task<IReadOnlyList<Signal>> ListAsync(CancellationToken ct = default)
    { lock (_gate) return Task.FromResult<IReadOnlyList<Signal>>(_items.ToList()); }
}

public sealed class InMemorySurveyResponseStore : ISurveyResponseStore
{
    private readonly List<SurveyResponse> _items = [];
    private readonly object _gate = new();
    private int _last;

    public Task<SurveyResponse> AddAsync(Func<string, SurveyResponse> build, CancellationToken ct = default)
    {
        lock (_gate)
        {
            var item = build($"sr-{++_last}");
            _items.Add(item);
            return Task.FromResult(item);
        }
    }

    public Task<SurveyResponse?> GetAsync(string id, CancellationToken ct = default)
    { lock (_gate) return Task.FromResult(_items.FirstOrDefault(s => s.Id == id)); }

    public Task<IReadOnlyList<SurveyResponse>> ListAsync(CancellationToken ct = default)
    { lock (_gate) return Task.FromResult<IReadOnlyList<SurveyResponse>>(_items.ToList()); }

    public Task<bool> TryReplaceAsync(SurveyResponse next, CancellationToken ct = default)
    {
        lock (_gate)
        {
            var i = _items.FindIndex(s => s.Id == next.Id);
            if (i < 0) return Task.FromResult(false);
            _items[i] = next;
            return Task.FromResult(true);
        }
    }
}

public sealed class InMemoryGiftStore : IGiftStore
{
    private readonly List<GiftItem> _items = [];
    private readonly List<StockMove> _moves = [];
    private readonly List<Gift> _gifts = [];
    private readonly object _gate = new();
    private int _item, _move, _gift;

    public Task<IReadOnlyList<GiftItem>> ItemsAsync(CancellationToken ct = default) { lock (_gate) return Task.FromResult<IReadOnlyList<GiftItem>>(_items.ToList()); }
    public Task<GiftItem> AddItemAsync(Func<string, GiftItem> build, CancellationToken ct = default)
    { lock (_gate) { var x = build($"gi-{++_item}"); _items.Add(x); return Task.FromResult(x); } }
    public Task<IReadOnlyList<StockMove>> MovesAsync(CancellationToken ct = default) { lock (_gate) return Task.FromResult<IReadOnlyList<StockMove>>(_moves.ToList()); }
    public Task<StockMove> AddMoveAsync(Func<string, StockMove> build, CancellationToken ct = default)
    { lock (_gate) { var x = build($"sm-{++_move}"); _moves.Add(x); return Task.FromResult(x); } }
    public Task<IReadOnlyList<Gift>> GiftsAsync(CancellationToken ct = default) { lock (_gate) return Task.FromResult<IReadOnlyList<Gift>>(_gifts.ToList()); }
    public Task<Gift?> GetAsync(string id, CancellationToken ct = default) { lock (_gate) return Task.FromResult(_gifts.FirstOrDefault(g => g.Id == id)); }
    public Task<Gift> AddAsync(Func<string, Gift> build, CancellationToken ct = default)
    { lock (_gate) { var x = build($"gf-{++_gift}"); _gifts.Add(x); return Task.FromResult(x); } }
    public Task<bool> TryReplaceAsync(Gift next, GiftStatus expected, CancellationToken ct = default)
    {
        lock (_gate)
        {
            var i = _gifts.FindIndex(g => g.Id == next.Id);
            if (i < 0 || _gifts[i].Status != expected) return Task.FromResult(false);
            _gifts[i] = next;
            return Task.FromResult(true);
        }
    }
}

public sealed class InMemoryCallSurveyStore : ICallSurveyStore
{
    private readonly List<CallSurveyItem> _items = [];
    private readonly object _gate = new();
    private int _last;

    public Task<CallSurveyItem?> AddAsync(string callId, Func<string, CallSurveyItem> build, CancellationToken ct = default)
    {
        lock (_gate)
        {
            if (_items.Any(i => i.CallId == callId.Trim())) return Task.FromResult<CallSurveyItem?>(null);
            var item = build($"cs-{++_last}");
            _items.Add(item);
            return Task.FromResult<CallSurveyItem?>(item);
        }
    }

    public Task<CallSurveyItem?> GetByCallAsync(string callId, CancellationToken ct = default)
    { lock (_gate) return Task.FromResult(_items.FirstOrDefault(i => i.CallId == callId.Trim())); }

    public Task<IReadOnlyList<CallSurveyItem>> ListAsync(CancellationToken ct = default)
    { lock (_gate) return Task.FromResult<IReadOnlyList<CallSurveyItem>>(_items.ToList()); }

    public Task<bool> TryReplaceAsync(CallSurveyItem next, CallSurveyStatus expected, CancellationToken ct = default)
    {
        lock (_gate)
        {
            var i = _items.FindIndex(x => x.Id == next.Id);
            if (i < 0 || _items[i].Status != expected) return Task.FromResult(false);
            _items[i] = next;
            return Task.FromResult(true);
        }
    }
}

/// <summary>Development and tests: contacts added by hand. The real directory reads the CRM (four environments) and the DNCR.</summary>
public sealed class InMemoryCallContactDirectory : ICallContactDirectory
{
    private readonly List<CallContact> _items = [];
    private readonly object _gate = new();

    public void Set(CallContact c)
    {
        lock (_gate) { _items.RemoveAll(x => x.PersonId == c.PersonId); _items.Add(c); }
    }

    public Task<CallContact?> FindByPhoneAsync(string phone, CancellationToken ct = default)
    { lock (_gate) return Task.FromResult(_items.FirstOrDefault(x => x.Phone == phone)); }

    public Task<CallContact?> GetAsync(string personId, CancellationToken ct = default)
    { lock (_gate) return Task.FromResult(_items.FirstOrDefault(x => x.PersonId == personId)); }
}

public sealed class InMemoryAiCallStore : IAiCallStore
{
    private readonly List<AiCallDailyRow> _rows = [];
    private readonly List<AiCallDailyExtra> _extras = [];
    private readonly List<AiCampaignTotals> _campaigns = [];
    private readonly List<AiCallEvent> _events = [];
    private DateTimeOffset? _refreshed;
    private int _last;
    private readonly object _gate = new();

    public Task ReplaceDailyAsync(DateOnly from, DateOnly to, IReadOnlyList<AiCallDailyRow> rows, IReadOnlyList<AiCallDailyExtra> extras, DateTimeOffset refreshedAt, CancellationToken ct = default)
    {
        lock (_gate)
        {
            _rows.RemoveAll(r => r.Date >= from && r.Date <= to);
            _extras.RemoveAll(x => x.Date >= from && x.Date <= to);
            _rows.AddRange(rows);
            _extras.AddRange(extras);
            _refreshed = refreshedAt;
        }
        return Task.CompletedTask;
    }

    public Task UpsertCampaignsAsync(IReadOnlyList<AiCampaignTotals> campaigns, DateTimeOffset refreshedAt, CancellationToken ct = default)
    {
        lock (_gate)
        {
            foreach (var c in campaigns)
            {
                _campaigns.RemoveAll(x => x.Campaign == c.Campaign && x.EnvId == c.EnvId);
                _campaigns.Add(c);
            }
            _refreshed = refreshedAt;
        }
        return Task.CompletedTask;
    }

    public Task<IReadOnlyList<AiCallDailyRow>> RowsAsync(CancellationToken ct = default) { lock (_gate) return Task.FromResult<IReadOnlyList<AiCallDailyRow>>(_rows.ToList()); }
    public Task<IReadOnlyList<AiCallDailyExtra>> ExtrasAsync(CancellationToken ct = default) { lock (_gate) return Task.FromResult<IReadOnlyList<AiCallDailyExtra>>(_extras.ToList()); }
    public Task<IReadOnlyList<AiCampaignTotals>> CampaignsAsync(CancellationToken ct = default) { lock (_gate) return Task.FromResult<IReadOnlyList<AiCampaignTotals>>(_campaigns.ToList()); }
    public Task<DateTimeOffset?> LastRefreshAsync(CancellationToken ct = default) { lock (_gate) return Task.FromResult(_refreshed); }

    public Task<AiCallEvent?> AddEventAsync(string callId, Func<string, AiCallEvent> build, CancellationToken ct = default)
    {
        lock (_gate)
        {
            if (_events.Any(e => e.CallId == callId.Trim())) return Task.FromResult<AiCallEvent?>(null);
            var ev = build($"ae-{++_last}");
            _events.Add(ev);
            return Task.FromResult<AiCallEvent?>(ev);
        }
    }

    public Task<AiCallEvent?> GetEventAsync(string callId, CancellationToken ct = default) { lock (_gate) return Task.FromResult(_events.FirstOrDefault(e => e.CallId == callId.Trim())); }
    public Task<IReadOnlyList<AiCallEvent>> EventsAsync(CancellationToken ct = default) { lock (_gate) return Task.FromResult<IReadOnlyList<AiCallEvent>>(_events.ToList()); }
}
