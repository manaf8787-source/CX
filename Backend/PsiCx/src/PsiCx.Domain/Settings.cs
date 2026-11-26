using System.Text.Json;

namespace PsiCx.Domain;

/// <summary>One saved version of a setting (rules, CRM mapping, escalation matrix, ...). Versions are never overwritten: a change adds the next one.</summary>
public sealed record SettingVersion(string Key, int Version, JsonElement Value, DateTimeOffset At, string ByUserId, RoleId ByRole, string? Note);
