using PsiCx.Domain;

namespace PsiCx.Rules.Access;

/// <summary>Port of customLevel / customAllowedPaths in React-Frontend/src/data/customRoles.ts: what a custom role may do on a page.</summary>
public static class CustomRoleAccess
{
    /// <summary>The level on a page: the most specific listed screen that contains it. No match is None.</summary>
    public static ScreenAccess LevelFor(IReadOnlyDictionary<string, ScreenAccess> screens, string path)
    {
        string? best = null;
        foreach (var key in screens.Keys)
            if ((path == key || path.StartsWith(key + "/", StringComparison.Ordinal)) && (best is null || key.Length > best.Length)) best = key;
        return best is null ? ScreenAccess.None : screens[best];
    }

    /// <summary>The page list handed to <see cref="PageAccess"/> for a custom role.</summary>
    public static IReadOnlyCollection<string> AllowedPaths(IReadOnlyDictionary<string, ScreenAccess> screens) => screens.Keys.ToList();

    /// <summary>True when the role can change things on the page (View only means every button and field is off).</summary>
    public static bool CanEdit(IReadOnlyDictionary<string, ScreenAccess> screens, string path) => LevelFor(screens, path) == ScreenAccess.Edit;

    /// <summary>A role that opens any administration screen is only for the super admin to build or give.</summary>
    public static bool TouchesAdministration(IReadOnlyDictionary<string, ScreenAccess> screens) =>
        screens.Keys.Any(k => k == "/admin" || k.StartsWith("/admin/", StringComparison.Ordinal));
}
