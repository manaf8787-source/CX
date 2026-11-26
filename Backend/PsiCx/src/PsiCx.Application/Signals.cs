using PsiCx.Domain;
using PsiCx.Rules;
using PsiCx.Rules.Access;

namespace PsiCx.Application;

public interface ISignalStore
{
    /// <summary>Adds a signal; false when the id already exists (the same event is never counted twice).</summary>
    Task<bool> AddAsync(Signal signal, CancellationToken ct = default);
    Task<IReadOnlyList<Signal>> ListAsync(CancellationToken ct = default);
}

/// <summary>Patterns and their signals, for the services that hang a fix on a pattern.</summary>
public interface IPatternDirectory
{
    Task<Pattern?> FindPatternAsync(string patternId, CancellationToken ct = default);
    Task<IReadOnlyList<Signal>> SignalsOfAsync(Pattern pattern, CancellationToken ct = default);
}

/// <summary>
/// The environment switch (decided 18 Nov): it narrows everything that carries an environment. A role fixed to one environment
/// (environment management) always reads that one, whatever it asks for.
/// </summary>
public static class EnvAccess
{
    public static ServiceResult<EnvScope> Effective(Actor actor, EnvId? requested)
    {
        if (actor.Role != RoleId.Envmgmt) return ServiceResult<EnvScope>.Ok(new EnvScope(requested));
        return actor.Env is { } own
            ? ServiceResult<EnvScope>.Ok(EnvScope.Of(own))
            : ServiceResult<EnvScope>.Fail(Failure.Forbidden, "This role is fixed to one environment and none is assigned yet.");
    }
}

/// <summary>Signals are counted, not worked; a pattern is a group past a threshold. Detection reads the rules and the window.</summary>
public sealed class SignalService(ISignalStore store, IFixClockInputs inputs, IClock clock) : IPatternDirectory
{
    private const string Page = "/actions";

    public async Task<ServiceResult<IReadOnlyList<Signal>>> ListAsync(Actor? actor, EnvId? env, SignalKind? kind, CancellationToken ct = default)
    {
        var scope = Gate(actor);
        if (scope.Error is not null) return ServiceResult<IReadOnlyList<Signal>>.Fail(scope.Error.Value, scope.Message!);
        var s = EnvAccess.Effective(actor!, env);
        if (!s.IsOk) return ServiceResult<IReadOnlyList<Signal>>.Fail(s.Error!.Value, s.Message!);
        var all = (await store.ListAsync(ct)).Where(x => s.Value.Includes(x.EnvId) && (kind is null || x.Kind == kind)).OrderByDescending(x => x.OccurredAt).ToList();
        return ServiceResult<IReadOnlyList<Signal>>.Ok(all);
    }

    /// <summary>A signal comes from an event the rules read. CX adds one by hand when a case has no feed yet. [Proposed: CX manager and CX team]</summary>
    public async Task<ServiceResult<Signal>> IngestAsync(Actor? actor, Signal signal, CancellationToken ct = default)
    {
        if (actor is null) return ServiceResult<Signal>.Fail(Failure.Unauthenticated, "Sign in first.");
        if (actor.Role is not (RoleId.Cxmgr or RoleId.Cxteam)) return ServiceResult<Signal>.Fail(Failure.Forbidden, "Only CX adds a signal by hand.");
        if (string.IsNullOrWhiteSpace(signal.Id) || string.IsNullOrWhiteSpace(signal.Category)) return ServiceResult<Signal>.Fail(Failure.Invalid, "A signal needs an id and a category.");
        if (signal.IsPublic && signal.PersonId is not null) return ServiceResult<Signal>.Fail(Failure.Invalid, "A public mention has no person.");
        if (signal.OccurredAt > clock.UtcNow.AddMinutes(5)) return ServiceResult<Signal>.Fail(Failure.Invalid, "A signal cannot be in the future.");
        return await store.AddAsync(signal, ct) ? ServiceResult<Signal>.Ok(signal) : ServiceResult<Signal>.Fail(Failure.Conflict, "This signal is already counted.");
    }

    public async Task<ServiceResult<IReadOnlyList<Pattern>>> PatternsAsync(Actor? actor, EnvId? env, CancellationToken ct = default)
    {
        var scope = Gate(actor);
        if (scope.Error is not null) return ServiceResult<IReadOnlyList<Pattern>>.Fail(scope.Error.Value, scope.Message!);
        var s = EnvAccess.Effective(actor!, env);
        if (!s.IsOk) return ServiceResult<IReadOnlyList<Pattern>>.Fail(s.Error!.Value, s.Message!);
        var all = await DetectAsync(ct);
        var byId = (await store.ListAsync(ct)).ToDictionary(x => x.Id);
        // A pattern belongs to the environments of its signals.
        return ServiceResult<IReadOnlyList<Pattern>>.Ok(all.Where(p => p.SignalIds.Any(id => byId.TryGetValue(id, out var sg) && s.Value.Includes(sg.EnvId))).ToList());
    }

    private async Task<List<Pattern>> DetectAsync(CancellationToken ct)
    {
        var rules = await inputs.RulesAsync(ct);
        var patterns = PatternDetector.Detect(await store.ListAsync(ct), new DetectOptions(rules.Patterns.WindowDays, clock.UtcNow, rules.Patterns));
        var ids = PatternTrace.Ids(patterns.Select(p => p.Key));
        return patterns.Select(p => p with { TraceId = ids[p.Key] }).ToList();
    }

    public async Task<Pattern?> FindPatternAsync(string patternId, CancellationToken ct = default)
        => (await DetectAsync(ct)).FirstOrDefault(p => p.Id == patternId);

    public async Task<IReadOnlyList<Signal>> SignalsOfAsync(Pattern pattern, CancellationToken ct = default)
    {
        var ids = pattern.SignalIds.ToHashSet();
        return (await store.ListAsync(ct)).Where(s => ids.Contains(s.Id)).ToList();
    }

    private static ServiceResult<bool> Gate(Actor? actor)
    {
        if (actor is null) return ServiceResult<bool>.Fail(Failure.Unauthenticated, "Sign in first.");
        return PageAccess.CanAccessPath(actor.Role, Page) ? ServiceResult<bool>.Ok(true) : ServiceResult<bool>.Fail(Failure.Forbidden, "Signals are not open to this role.");
    }
}
