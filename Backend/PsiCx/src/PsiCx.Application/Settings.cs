using System.Text.Json;
using PsiCx.Domain;
using PsiCx.Rules.Access;

namespace PsiCx.Application;

/// <summary>Storage of setting versions. The append is atomic: it succeeds only when the version is the next one.</summary>
public interface ISettingsStore
{
    Task<SettingVersion?> CurrentAsync(string key, CancellationToken ct = default);
    Task<IReadOnlyList<SettingVersion>> HistoryAsync(string key, CancellationToken ct = default);
    Task<bool> TryAppendAsync(SettingVersion next, CancellationToken ct = default);
}

/// <summary>The settings the portal keeps, and who may change each. Reading is open to every signed-in role.</summary>
public static class SettingKeys
{
    public const string Rules = "rules";
    public const string CrmMapping = "crm_mapping";
    public const string EscalationMatrix = "escalation_matrix";
    public const string AgentSettings = "agent_settings";
    public const string ReplyLibrary = "reply_library";
    public const string SurveySets = "survey_sets";
    public const string CallSurveyRule = "call_survey_rule";
    public const string BrightcallMapping = "brightcall_mapping";

    public static readonly IReadOnlyList<string> All = [Rules, CrmMapping, EscalationMatrix, AgentSettings, ReplyLibrary, SurveySets, CallSurveyRule, BrightcallMapping];

    public static bool IsKnown(string key) => All.Contains(key);

    /// <summary>Editors follow the same permission as the page. Rules and survey sets are the CX manager's [Proposed].</summary>
    public static bool CanEdit(string key, RoleId role) => key switch
    {
        CrmMapping => Permissions.CanEditCrmMapping(role),
        EscalationMatrix => Permissions.CanEditEscalationMatrix(role),
        AgentSettings => Permissions.CanEditAgentSettings(role),
        ReplyLibrary => Permissions.CanEditReplyLibrary(role),
        Rules or SurveySets or CallSurveyRule or BrightcallMapping => role == RoleId.Cxmgr,
        _ => false,
    };
}

public sealed class SettingsService(ISettingsStore store, AuditService audit, IClock clock, IEnumerable<ISettingValidator>? validators = null)
{
    /// <summary>1 MiB of JSON per version is far more than any of these needs.</summary>
    public const int MaxJsonBytes = 1_048_576;

    public async Task<ServiceResult<SettingVersion>> GetAsync(Actor? actor, string key, CancellationToken ct = default)
    {
        if (actor is null) return ServiceResult<SettingVersion>.Fail(Failure.Unauthenticated, "Sign in first.");
        if (!SettingKeys.IsKnown(key)) return ServiceResult<SettingVersion>.Fail(Failure.NotFound, $"Unknown setting '{key}'.");
        var current = await store.CurrentAsync(key, ct);
        return current is null
            ? ServiceResult<SettingVersion>.Fail(Failure.NotFound, $"Setting '{key}' has no saved version yet; the defaults apply.")
            : ServiceResult<SettingVersion>.Ok(current);
    }

    /// <summary>Newest first.</summary>
    public async Task<ServiceResult<IReadOnlyList<SettingVersion>>> HistoryAsync(Actor? actor, string key, CancellationToken ct = default)
    {
        if (actor is null) return ServiceResult<IReadOnlyList<SettingVersion>>.Fail(Failure.Unauthenticated, "Sign in first.");
        if (!SettingKeys.IsKnown(key)) return ServiceResult<IReadOnlyList<SettingVersion>>.Fail(Failure.NotFound, $"Unknown setting '{key}'.");
        var all = await store.HistoryAsync(key, ct);
        return ServiceResult<IReadOnlyList<SettingVersion>>.Ok(all.OrderByDescending(v => v.Version).ToList());
    }

    /// <summary>Saves the next version. <paramref name="expectedVersion"/> is the version the editor was looking at (0 when none): a stale edit is refused, never merged.</summary>
    public async Task<ServiceResult<SettingVersion>> PutAsync(Actor? actor, string key, JsonElement value, int expectedVersion, string? note, CancellationToken ct = default)
    {
        if (actor is null) return ServiceResult<SettingVersion>.Fail(Failure.Unauthenticated, "Sign in first.");
        if (!SettingKeys.IsKnown(key)) return ServiceResult<SettingVersion>.Fail(Failure.NotFound, $"Unknown setting '{key}'.");
        if (!SettingKeys.CanEdit(key, actor.Role)) return ServiceResult<SettingVersion>.Fail(Failure.Forbidden, "This role cannot change this setting.");
        if (value.ValueKind is JsonValueKind.Undefined or JsonValueKind.Null) return ServiceResult<SettingVersion>.Fail(Failure.Invalid, "A setting needs a value.");
        if (value.GetRawText().Length > MaxJsonBytes) return ServiceResult<SettingVersion>.Fail(Failure.Invalid, "The value is too large.");

        var current = await store.CurrentAsync(key, ct);
        var currentVersion = current?.Version ?? 0;
        if (expectedVersion != currentVersion)
            return ServiceResult<SettingVersion>.Fail(Failure.Conflict, $"Someone saved version {currentVersion} since you opened it (you had {expectedVersion}). Reload and apply your change again.");

        foreach (var v in validators ?? [])
            if (v.Handles(key) && v.Validate(value, current?.Value) is { } problem)
                return ServiceResult<SettingVersion>.Fail(Failure.Invalid, problem);

        var next = new SettingVersion(key, currentVersion + 1, value.Clone(), clock.UtcNow, actor.UserId, actor.Role, note);
        if (!await store.TryAppendAsync(next, ct))
            return ServiceResult<SettingVersion>.Fail(Failure.Conflict, "Someone saved at the same moment. Reload and apply your change again.");

        await audit.RecordAsync(actor, AuditKind.Action,
            new Bi($"Changed setting {key} (version {next.Version})", $"غيّر الإعداد {key} (النسخة {next.Version})"),
            $"/settings/{key}", ct);
        return ServiceResult<SettingVersion>.Ok(next);
    }

    /// <summary>Puts an older version's value back as a new version (history is kept, nothing is deleted).</summary>
    public async Task<ServiceResult<SettingVersion>> RestoreAsync(Actor? actor, string key, int version, int expectedVersion, CancellationToken ct = default)
    {
        if (actor is null) return ServiceResult<SettingVersion>.Fail(Failure.Unauthenticated, "Sign in first.");
        if (!SettingKeys.IsKnown(key)) return ServiceResult<SettingVersion>.Fail(Failure.NotFound, $"Unknown setting '{key}'.");
        if (!SettingKeys.CanEdit(key, actor.Role)) return ServiceResult<SettingVersion>.Fail(Failure.Forbidden, "This role cannot change this setting.");
        var old = (await store.HistoryAsync(key, ct)).FirstOrDefault(v => v.Version == version);
        if (old is null) return ServiceResult<SettingVersion>.Fail(Failure.NotFound, $"Setting '{key}' has no version {version}.");
        return await PutAsync(actor, key, old.Value, expectedVersion, $"Restored from version {version}", ct);
    }
}
