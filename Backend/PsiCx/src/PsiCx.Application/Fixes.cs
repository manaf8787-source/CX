using System.Text.Json;
using PsiCx.Domain;
using PsiCx.Rules;
using PsiCx.Rules.Access;

namespace PsiCx.Application;

public interface IFixStore
{
    Task<IReadOnlyList<CorrectiveAction>> ListAsync(CancellationToken ct = default);
    Task<CorrectiveAction?> GetAsync(string id, CancellationToken ct = default);
    /// <summary>Adds a new fix and gives it the next id ("ca-1", "ca-2", ...). Ids are never reused.</summary>
    Task<CorrectiveAction> AddAsync(Func<string, CorrectiveAction> build, CancellationToken ct = default);
    /// <summary>Replaces a fix only if it still has the status the caller read (a double click, two people at once).</summary>
    Task<bool> TryReplaceAsync(CorrectiveAction next, FixStatus expected, CancellationToken ct = default);
}

public interface IInvestigationStore
{
    Task<IReadOnlyList<Investigation>> ListAsync(CancellationToken ct = default);
    Task<Investigation> AddAsync(Func<string, Investigation> build, CancellationToken ct = default);
}

/// <summary>What the clocks need that lives in configuration: the rules, the matrix "Resolve (h)" and whether a pattern holds a VIP.</summary>
public interface IFixClockInputs
{
    Task<RulesBag> RulesAsync(CancellationToken ct = default);
    /// <summary>The matrix "Resolve (h)" in working hours for a product and fix kind; null when the cell is empty. Already halved for a VIP-related fix.</summary>
    Task<double?> ResolveHoursAsync(ProductId product, FixKind kind, string? patternId, CancellationToken ct = default);
}

/// <summary>Inputs read from settings: the rules from "rules", matrix hours from the "escalation_matrix" setting when it has them. [Proposed]</summary>
public sealed class SettingsFixClockInputs(ISettingsStore settings, IVipPatterns vip) : IFixClockInputs, IRulesSource
{
    public const double VipFactor = 0.5;

    /// <summary>The rules come from the "rules" setting (the CX manager edits them); a missing setting or item keeps the documented default.</summary>
    public async Task<RulesBag> RulesAsync(CancellationToken ct = default) => RulesSetting.From((await settings.CurrentAsync(SettingKeys.Rules, ct))?.Value);

    public static string MatrixKey(FixKind k) => k switch
    {
        FixKind.Employee => "employee",
        FixKind.ServiceBehaviour => "service",
        FixKind.TrainingGap => "training",
        FixKind.Process => "process",
        FixKind.ProductApp => "product",
        FixKind.Environment => "environment",
        FixKind.LegalPrivacy => "legal",
        _ => "marketing",
    };

    public async Task<double?> ResolveHoursAsync(ProductId product, FixKind kind, string? patternId, CancellationToken ct = default)
    {
        var current = await settings.CurrentAsync(SettingKeys.EscalationMatrix, ct);
        if (current is null) return null;
        var hours = Read(current.Value, product.ToString().ToLowerInvariant(), MatrixKey(kind));
        if (hours is null) return null;
        return patternId is not null && await vip.HasVipAsync(patternId, ct) ? hours * VipFactor : hours;
    }

    /// <summary>The matrix setting is an object keyed by product id; each value is a list of rows { kind, cells: { resolveH } }.</summary>
    internal static double? Read(JsonElement matrix, string product, string kindKey)
    {
        if (matrix.ValueKind != JsonValueKind.Object || !matrix.TryGetProperty(product, out var rows) || rows.ValueKind != JsonValueKind.Array) return null;
        foreach (var row in rows.EnumerateArray())
        {
            if (!row.TryGetProperty("kind", out var k) || k.GetString() != kindKey) continue;
            if (row.TryGetProperty("cells", out var cells) && cells.TryGetProperty("resolveH", out var h) && h.ValueKind == JsonValueKind.Number) return h.GetDouble();
            return null;
        }
        return null;
    }
}

/// <summary>Whether a pattern includes a person tagged VIP in the CRM. Until the people store exists nothing is VIP.</summary>
public interface IVipPatterns { Task<bool> HasVipAsync(string patternId, CancellationToken ct = default); }

public sealed class NoVipPatterns : IVipPatterns { public Task<bool> HasVipAsync(string patternId, CancellationToken ct = default) => Task.FromResult(false); }

public sealed record ProposeFix(FixKind Kind, string Owner, ProductId Product, Bi Title, string? PatternId = null, EnvId? EnvId = null);

public sealed class FixService(IFixStore fixes, IInvestigationStore investigations, IFixClockInputs inputs, AuditService audit, IClock clock, IPatternDirectory? patterns = null)
{
    private const string Page = "/actions";

    // ---- reads ----------------------------------------------------------------------------------------------

    public async Task<ServiceResult<IReadOnlyList<CorrectiveAction>>> ListAsync(Actor? actor, EnvId? env = null, CancellationToken ct = default)
    {
        if (actor is null) return ServiceResult<IReadOnlyList<CorrectiveAction>>.Fail(Failure.Unauthenticated, "Sign in first.");
        if (!PageAccess.CanAccessPath(actor.Role, Page)) return ServiceResult<IReadOnlyList<CorrectiveAction>>.Fail(Failure.Forbidden, "Corrective actions are not open to this role.");
        var scope = EnvAccess.Effective(actor, env);
        if (!scope.IsOk) return ServiceResult<IReadOnlyList<CorrectiveAction>>.Fail(scope.Error!.Value, scope.Message!);
        var all = new List<CorrectiveAction>();
        foreach (var f in (await fixes.ListAsync(ct)).OrderBy(f => f.ProposedAt))
        {
            if (!await InScopeAsync(f, scope.Value, ct)) continue;
            all.Add(await WithCounterAsync(f, ct));
        }
        return ServiceResult<IReadOnlyList<CorrectiveAction>>.Ok(all);
    }

    /// <summary>A fix with a pattern takes the environments of the pattern's signals; one without takes its own; neither = every environment.</summary>
    private async Task<bool> InScopeAsync(CorrectiveAction f, EnvScope scope, CancellationToken ct)
    {
        if (scope.Env is null) return true;
        if (f.PatternId is not null && patterns is not null)
        {
            var p = await patterns.FindPatternAsync(f.PatternId, ct);
            if (p is not null) return (await patterns.SignalsOfAsync(p, ct)).Any(sg => scope.Includes(sg.EnvId));
        }
        return f.EnvId is null || scope.Includes(f.EnvId.Value);
    }

    public async Task<ServiceResult<CorrectiveAction>> GetAsync(Actor? actor, string id, CancellationToken ct = default)
    {
        var gate = Gate(actor, null);
        if (gate is not null) return gate;
        var fix = await fixes.GetAsync(id, ct);
        return fix is null ? NotFound() : ServiceResult<CorrectiveAction>.Ok(await WithCounterAsync(fix, ct));
    }

    private async Task<CorrectiveAction> WithCounterAsync(CorrectiveAction f, CancellationToken ct)
        => f.Status == FixStatus.Proposed && f.Decision is null ? f with { ApprovalDaysLeft = await ApprovalDaysLeftAsync(f, ct) } : f;

    public async Task<ServiceResult<IReadOnlyList<Investigation>>> InvestigationsAsync(Actor? actor, CancellationToken ct = default)
    {
        if (actor is null) return ServiceResult<IReadOnlyList<Investigation>>.Fail(Failure.Unauthenticated, "Sign in first.");
        if (!PageAccess.CanAccessPath(actor.Role, Page)) return ServiceResult<IReadOnlyList<Investigation>>.Fail(Failure.Forbidden, "Investigations are not open to this role.");
        return ServiceResult<IReadOnlyList<Investigation>>.Ok(await investigations.ListAsync(ct));
    }

    /// <summary>Working days left of the approval window of a proposed fix (negative = late); the inbox counter.</summary>
    public async Task<int> ApprovalDaysLeftAsync(CorrectiveAction fix, CancellationToken ct = default)
    {
        var rules = await inputs.RulesAsync(ct);
        return FixClock.ApprovalDaysLeft(UaeTime.ToWall(fix.ProposedAt), UaeTime.ToWall(clock.UtcNow), rules);
    }

    // ---- propose --------------------------------------------------------------------------------------------

    public async Task<ServiceResult<CorrectiveAction>> ProposeAsync(Actor? actor, ProposeFix req, CancellationToken ct = default)
    {
        var gate = Gate(actor, req.Kind);
        if (gate is not null) return gate;
        var owner = req.Owner?.Trim() ?? "";
        if (owner.Length == 0) return Invalid("A fix needs an owner (a title).");
        if (Permissions.IsTopManagementTitle(owner)) return Invalid("A fix goes to the concerned people, never to top management.");
        if (string.IsNullOrWhiteSpace(req.Title.En) || string.IsNullOrWhiteSpace(req.Title.Ar)) return Invalid("The title is needed in English and Arabic.");

        if (req.PatternId is not null && patterns is not null && await patterns.FindPatternAsync(req.PatternId, ct) is null) return Invalid("That pattern is not detected now.");
        var now = clock.UtcNow;
        var due = await DueAsync(req.Product, req.Kind, req.PatternId, now, ct);
        var verifyDays = (await inputs.RulesAsync(ct)).VerifyDays;
        var fix = await fixes.AddAsync(id => new CorrectiveAction
        {
            Id = id, Kind = req.Kind, PatternId = req.PatternId, Title = req.Title, Owner = owner, Product = req.Product, EnvId = req.EnvId,
            Status = FixStatus.Proposed, ProposedAt = now, DueAt = due.At, DueSource = due.Source,
            VerificationDueAt = now.AddDays(verifyDays),
            AuditLog = [Line(actor!, now, "Proposed", "اقتُرح")],
        }, ct);
        await Trail(actor!, fix, $"Proposed {fix.Id}", $"اقترح {fix.Id}", ct);
        return ServiceResult<CorrectiveAction>.Ok(fix);
    }

    // ---- decide: approve, modify or reject within 5 working days ---------------------------------------------

    public async Task<ServiceResult<CorrectiveAction>> DecideAsync(Actor? actor, string id, FixDecision decision, string? reason, string? newOwner, CancellationToken ct = default)
    {
        var (fix, fail) = await Load(actor, id, ct);
        if (fail is not null) return fail;
        var gate = Gate(actor, fix!.Kind);
        if (gate is not null) return gate;
        if (fix.Status != FixStatus.Proposed) return Conflict("Only a proposed fix is decided.");
        if (fix.Decision == FixDecision.Rejected) return Conflict("This fix was rejected.");
        if (decision != FixDecision.Approved && string.IsNullOrWhiteSpace(reason)) return Invalid("A reason is needed to modify or reject a fix.");
        var owner = fix.Owner;
        if (decision == FixDecision.Modified && !string.IsNullOrWhiteSpace(newOwner))
        {
            owner = newOwner.Trim();
            if (Permissions.IsTopManagementTitle(owner)) return Invalid("A fix goes to the concerned people, never to top management.");
        }

        var now = clock.UtcNow;
        var because = string.IsNullOrWhiteSpace(reason) ? null : new Bi(reason.Trim(), reason.Trim());
        var next = fix with { Decision = decision, DecisionReason = because ?? fix.DecisionReason, Owner = owner };
        string en, ar;
        switch (decision)
        {
            case FixDecision.Approved:
                var due = await DueAsync(fix.Product, fix.Kind, fix.PatternId, now, ct);
                next = next with { Status = FixStatus.Approved, ApprovedAt = now, DueAt = due.At, DueSource = due.Source };
                (en, ar) = ("Approved", "اعتُمد");
                break;
            case FixDecision.Modified: (en, ar) = ("Modified", "عُدّل"); break;
            default: (en, ar) = ("Rejected", "رُفض"); break;
        }
        if (because is not null) { en += $": {because.En}"; ar += $": {because.Ar}"; }
        return await Save(actor!, fix, next with { AuditLog = [.. fix.AuditLog, Line(actor!, now, en, ar)] }, $"{en.Split(':')[0]} {fix.Id}", ct);
    }

    /// <summary>"Investigate before deciding": the manager asks for an investigation first (KB section 6). Flag only; the decision stays open.</summary>
    public async Task<ServiceResult<CorrectiveAction>> SendToInvestigationAsync(Actor? actor, string id, CancellationToken ct = default)
    {
        var (fix, fail) = await Load(actor, id, ct);
        if (fail is not null) return fail;
        var gate = Gate(actor, fix!.Kind);
        if (gate is not null) return gate;
        if (fix.Status != FixStatus.Proposed) return Conflict("Only a proposed fix goes to investigation before a decision.");
        var now = clock.UtcNow;
        return await Save(actor!, fix, fix with { SentToInvestigation = true, AuditLog = [.. fix.AuditLog, Line(actor!, now, "Sent to investigation before a decision", "أُرسل إلى التحقيق قبل القرار")] }, $"Investigation first on {fix.Id}", ct);
    }

    // ---- work: start, done -----------------------------------------------------------------------------------

    public async Task<ServiceResult<CorrectiveAction>> StartAsync(Actor? actor, string id, CancellationToken ct = default)
    {
        var (fix, fail) = await Load(actor, id, ct);
        if (fail is not null) return fail;
        var gate = Gate(actor, fix!.Kind);
        if (gate is not null) return gate;
        if (fix.Status != FixStatus.Approved) return Conflict("Only an approved fix is started.");
        return await Save(actor!, fix, fix with { Status = FixStatus.InProgress, AuditLog = [.. fix.AuditLog, Line(actor!, clock.UtcNow, "In progress", "قيد التنفيذ")] }, $"Started {fix.Id}", ct);
    }

    /// <summary>Marking done needs what was done (24 Nov), and starts the 60-day check from "done", not from approval (18 Nov).</summary>
    public async Task<ServiceResult<CorrectiveAction>> MarkDoneAsync(Actor? actor, string id, string note, DateOnly doneOn, string? evidence, CancellationToken ct = default)
    {
        var (fix, fail) = await Load(actor, id, ct);
        if (fail is not null) return fail;
        var gate = Gate(actor, fix!.Kind);
        if (gate is not null) return gate;
        if (fix.Status is not (FixStatus.Approved or FixStatus.InProgress)) return Conflict("Only an approved fix is marked done.");
        if (string.IsNullOrWhiteSpace(note)) return Invalid("Say what was done.");
        var now = clock.UtcNow;
        var rules = await inputs.RulesAsync(ct);
        var done = new FixCompletion(note.Trim(), doneOn, string.IsNullOrWhiteSpace(evidence) ? null : evidence.Trim(), actor!.Email, actor.Role.ToString().ToLowerInvariant(), now);
        var next = fix with
        {
            Status = FixStatus.Verification, DoneAt = now, Completion = done,
            VerificationDueAt = UaeTime.ToUtc(FixClock.VerificationDue(UaeTime.ToWall(now), rules)),
            AuditLog = [.. fix.AuditLog, Line(actor, now, "Done: waiting for the check", "نُفّذ: بانتظار التحقق"), Line(actor, now, $"What was done: {done.Note}", $"ما الذي نُفذ: {done.Note}")],
        };
        return await Save(actor, fix, next, $"Marked {fix.Id} done", ct);
    }

    // ---- the 60-day check and decision 3 ---------------------------------------------------------------------

    public async Task<ServiceResult<CorrectiveAction>> RecordVerdictAsync(Actor? actor, string id, FixVerdict verdict, CancellationToken ct = default)
    {
        var (fix, fail) = await Load(actor, id, ct);
        if (fail is not null) return fail;
        if (!Permissions.CanRecordFixVerdict(actor!.Role)) return ServiceResult<CorrectiveAction>.Fail(Failure.Forbidden, "Only the CX manager and the CX team close the 60-day check.");
        if (fix!.Status != FixStatus.Verification) return Conflict("Only a fix waiting for its check takes a verdict.");
        var status = verdict switch { FixVerdict.Effective => FixStatus.Effective, FixVerdict.Partial => FixStatus.Partial, _ => FixStatus.Failed };
        var (en, ar) = verdict switch
        {
            FixVerdict.Effective => ("Verdict: effective", "الحكم: فعّال"),
            FixVerdict.Partial => ("Verdict: partial", "الحكم: جزئي"),
            _ => ("Verdict: failed", "الحكم: فاشل"),
        };
        return await Save(actor, fix, fix with { Status = status, VerificationResult = verdict, AuditLog = [.. fix.AuditLog, Line(actor, clock.UtcNow, en, ar)] }, $"{en} on {fix.Id}", ct);
    }

    /// <summary>A NEW fix on the same pattern after a partial or failed verdict; the parent keeps its status and links to the child.</summary>
    public async Task<ServiceResult<CorrectiveAction>> RequestSecondStepAsync(Actor? actor, string parentId, CancellationToken ct = default)
    {
        var (parent, fail) = await Load(actor, parentId, ct);
        if (fail is not null) return fail;
        if (!Permissions.CanRecordFixVerdict(actor!.Role)) return ServiceResult<CorrectiveAction>.Fail(Failure.Forbidden, "Only the CX manager and the CX team close the 60-day check.");
        if (!IsOpenVerdict(parent!.Status)) return Conflict("A second step follows a partial or failed check.");
        var all = await fixes.ListAsync(ct);
        if (all.Any(f => f.ParentFixId == parent.Id && !(f.Status == FixStatus.Proposed && f.Decision == FixDecision.Rejected))) return Conflict("This fix already has an open second step.");

        var now = clock.UtcNow;
        var outcome = parent.Status == FixStatus.Partial ? FixVerdict.Partial : FixVerdict.Failed;
        var due = await DueAsync(parent.Product, parent.Kind, parent.PatternId, now, ct);
        var who = actor.Role == RoleId.Cxteam ? new Bi("CX team", "فريق تجربة العملاء") : new Bi("CX manager", "مدير تجربة العملاء");
        var word = outcome == FixVerdict.Partial ? new Bi("partial", "جزئية") : new Bi("failed", "فاشلة");
        var ca = Trace(parent.Id);
        var child = await fixes.AddAsync(id => new CorrectiveAction
        {
            Id = id, Kind = parent.Kind, PatternId = parent.PatternId, Owner = parent.Owner, Product = parent.Product,
            EnvId = parent.PatternId is null ? parent.EnvId : null,
            Title = new Bi($"Second step on {ca}: {parent.Title.En}", $"خطوة ثانية على {ca}: {parent.Title.Ar}"),
            Status = FixStatus.Proposed, ProposedAt = now, DueAt = due.At, DueSource = due.Source,
            VerificationDueAt = now.AddDays(60),
            ProposedBy = new Bi($"{who.En}, after a {word.En} result", $"{who.Ar}، بعد نتيجة {word.Ar}"),
            ParentFixId = parent.Id, ParentOutcome = outcome,
            AuditLog = [Line(actor, now, $"Second step requested after {ca}", $"طُلبت خطوة ثانية بعد {ca}")],
        }, ct);
        await fixes.TryReplaceAsync(parent with { AuditLog = [.. parent.AuditLog, Line(actor, now, $"Second step requested: {Trace(child.Id)}", $"طُلبت خطوة ثانية: {Trace(child.Id)}")] }, parent.Status, ct);
        await Trail(actor, child, $"Second step {child.Id} on {parent.Id}", $"خطوة ثانية {child.Id} على {parent.Id}", ct);
        return ServiceResult<CorrectiveAction>.Ok(child);
    }

    /// <summary>"Investigate first (5 interviews)" from a partial or failed fix; hangs on the fix's pattern.</summary>
    public async Task<ServiceResult<Investigation>> InvestigateFromFixAsync(Actor? actor, string id, string? environment, CancellationToken ct = default)
    {
        var (fix, fail) = await Load(actor, id, ct);
        if (fail is not null) return ServiceResult<Investigation>.Fail(fail.Error!.Value, fail.Message!);
        if (!Permissions.CanRecordFixVerdict(actor!.Role)) return ServiceResult<Investigation>.Fail(Failure.Forbidden, "Only the CX manager and the CX team close the 60-day check.");
        if (!IsOpenVerdict(fix!.Status)) return ServiceResult<Investigation>.Fail(Failure.Conflict, "An investigation from a fix follows a partial or failed check.");
        if (fix.PatternId is null) return ServiceResult<Investigation>.Fail(Failure.Invalid, "This fix has no pattern to investigate.");
        var word = fix.Status == FixStatus.Partial ? new Bi("partial", "جزئية") : new Bi("failed", "فاشلة");
        var ca = Trace(fix.Id);
        var inv = await investigations.AddAsync(n => new Investigation
        {
            Id = n, PatternId = fix.PatternId, Kind = InvestigationKind.CustomerInterviews, RequestedCount = 5, DoneCount = 0, Environment = environment,
            Status = InvestigationStatus.InProgress, Note = new Bi($"Requested from {ca} after a {word.En} result.", $"طُلب من {ca} بعد نتيجة {word.Ar}."),
        }, ct);
        var tag = $"INV-{inv.Id.Split('-').Last()}";
        var updated = fix with { InvestigationId = inv.Id, AuditLog = [.. fix.AuditLog, Line(actor, clock.UtcNow, $"Investigation requested: 5 interviews ({tag})", $"طُلب تحقيق: 5 مقابلات ({tag})")] };
        await fixes.TryReplaceAsync(updated, fix.Status, ct);
        await Trail(actor, updated, $"Investigation {inv.Id} from {fix.Id}", $"تحقيق {inv.Id} من {fix.Id}", ct);
        return ServiceResult<Investigation>.Ok(inv);
    }

    /// <summary>"Accept as is": the person takes a partial or failed result as it stands; the fix closes as effective.</summary>
    public async Task<ServiceResult<CorrectiveAction>> AcceptAsIsAsync(Actor? actor, string id, CancellationToken ct = default)
    {
        var (fix, fail) = await Load(actor, id, ct);
        if (fail is not null) return fail;
        if (!Permissions.CanRecordFixVerdict(actor!.Role)) return ServiceResult<CorrectiveAction>.Fail(Failure.Forbidden, "Only the CX manager and the CX team close the 60-day check.");
        if (!IsOpenVerdict(fix!.Status)) return Conflict("Accept as is follows a partial or failed check.");
        var word = fix.Status == FixStatus.Partial ? new Bi("partial", "جزئية") : new Bi("failed", "فاشلة");
        var next = fix with { Status = FixStatus.Effective, VerificationResult = FixVerdict.Effective, AuditLog = [.. fix.AuditLog, Line(actor, clock.UtcNow, $"Accepted as is after a {word.En} result", $"قُبل كما هو بعد نتيجة {word.Ar}")] };
        return await Save(actor, fix, next, $"Accepted {fix.Id} as is", ct);
    }

    // ---- helpers --------------------------------------------------------------------------------------------

    public static bool IsOpenVerdict(FixStatus s) => s is FixStatus.Partial or FixStatus.Failed;

    /// <summary>The trace id shown to people, as the frontend numbers them: ca-1 reads CA-201 (200 + n).</summary>
    public static string Trace(string id)
    {
        var tail = new string(id.Reverse().TakeWhile(char.IsDigit).Reverse().ToArray());
        return int.TryParse(tail, out var n) ? $"CA-{200 + n}" : id.ToUpperInvariant();
    }

    private async Task<(DateTimeOffset At, FixDueSource Source)> DueAsync(ProductId product, FixKind kind, string? patternId, DateTimeOffset from, CancellationToken ct)
    {
        var rules = await inputs.RulesAsync(ct);
        var hours = await inputs.ResolveHoursAsync(product, kind, patternId, ct);
        var due = FixClock.FixDue(UaeTime.ToWall(from), hours, rules);
        return (UaeTime.ToUtc(due.DueAt), due.Source);
    }

    private static ServiceResult<CorrectiveAction>? Gate(Actor? actor, FixKind? kind)
    {
        if (actor is null) return ServiceResult<CorrectiveAction>.Fail(Failure.Unauthenticated, "Sign in first.");
        if (kind is null) return PageAccess.CanAccessPath(actor.Role, Page) ? null : ServiceResult<CorrectiveAction>.Fail(Failure.Forbidden, "Corrective actions are not open to this role.");
        var k = kind.Value == FixKind.Employee ? "employee" : kind.Value.ToString();
        return Permissions.CanActOnCorrectiveAction(actor.Role, k) ? null : ServiceResult<CorrectiveAction>.Fail(Failure.Forbidden, "This role cannot act on corrective actions.");
    }

    private async Task<(CorrectiveAction? Fix, ServiceResult<CorrectiveAction>? Fail)> Load(Actor? actor, string id, CancellationToken ct)
    {
        if (actor is null) return (null, ServiceResult<CorrectiveAction>.Fail(Failure.Unauthenticated, "Sign in first."));
        var fix = await fixes.GetAsync(id, ct);
        return fix is null ? (null, NotFound()) : (fix, null);
    }

    private async Task<ServiceResult<CorrectiveAction>> Save(Actor actor, CorrectiveAction old, CorrectiveAction next, string trail, CancellationToken ct)
    {
        if (!await fixes.TryReplaceAsync(next, old.Status, ct)) return Conflict("This fix changed while you were looking at it. Reload and try again.");
        await Trail(actor, next, trail, trail, ct);
        return ServiceResult<CorrectiveAction>.Ok(next);
    }

    private Task Trail(Actor actor, CorrectiveAction fix, string en, string ar, CancellationToken ct)
        => audit.RecordAsync(actor, AuditKind.Action, new Bi(en, ar), Page, ct);

    private static FixAuditLine Line(Actor actor, DateTimeOffset at, string en, string ar) => new(at, actor.Role.ToString().ToLowerInvariant(), new Bi(en, ar));

    private static ServiceResult<CorrectiveAction> NotFound() => ServiceResult<CorrectiveAction>.Fail(Failure.NotFound, "Corrective action not found.");
    private static ServiceResult<CorrectiveAction> Conflict(string m) => ServiceResult<CorrectiveAction>.Fail(Failure.Conflict, m);
    private static ServiceResult<CorrectiveAction> Invalid(string m) => ServiceResult<CorrectiveAction>.Fail(Failure.Invalid, m);
}
