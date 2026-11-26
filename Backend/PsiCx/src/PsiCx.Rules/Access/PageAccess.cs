using PsiCx.Domain;

namespace PsiCx.Rules.Access;

/// <summary>
/// Port of React-Frontend/src/auth/access.ts: which pages (route prefixes) each role may open. The same table drives the menu in the
/// frontend and, in the backend, the screen-level check for API endpoints that serve a page. A custom role carries its own page list.
/// </summary>
public static class PageAccess
{
    public const string UsersPage = "/admin/users";
    public const string AuditPage = "/admin/audit";
    public const string TeamPerformancePage = "/performance";
    public const string UserPerformancePage = "/admin/performance";
    private const string WatchPage = "/settings/ai-team";
    private const string CampaignAuditPage = "/settings/campaign-audit";

    private static readonly string[] RegisterPages =
        ["/settings/feeds", "/settings/crm-mapping", "/settings/escalation-matrix", "/settings/weekly-sample", "/settings/public-mentions"];

    private static readonly string[] OpenToAll = ["/settings/glossary"];

    /// <summary>Page prefixes per role. A missing entry (CX manager, CX team) means every page.</summary>
    private static readonly IReadOnlyDictionary<RoleId, string[]> Paths = new Dictionary<RoleId, string[]>
    {
        [RoleId.Envmgmt] = ["/home", "/customers", "/runaway", "/actions", "/products/re", "/inbox", "/settings/surveys", WatchPage, "/agents", "/settings/public-mentions", "/settings/maintenance"],
        [RoleId.Teamlead] = ["/home", "/customers", "/actions", "/inbox", "/settings/public-mentions"],
        [RoleId.Aslead] = ["/home", "/customers", "/actions", "/settings/voc", "/products/af", "/inbox", "/settings/surveys", "/settings/public-mentions"],
        [RoleId.Ld] = ["/actions", "/inbox", "/settings/standards", "/settings/ld"],
        [RoleId.Hrspec] = ["/actions", "/settings/hr-team"],
        [RoleId.Hrmgr] = ["/settings/hr-team"],
        [RoleId.Marketing] = ["/home", "/customers", "/runaway", "/personas", "/inbox", "/settings/public-mentions", WatchPage, CampaignAuditPage],
        [RoleId.Auditmkt] = new[] { "/overview", "/customers", "/personas", "/runaway", "/inbox", "/settings/standards", "/settings/monthly-pack", "/settings/rules", "/settings/surveys", WatchPage, CampaignAuditPage }.Concat(RegisterPages).ToArray(),
        [RoleId.Exec] = new[] { "/home", "/customers", "/runaway", "/actions", "/personas", "/overview", "/settings/monthly-pack", "/inbox", "/settings/surveys", WatchPage, CampaignAuditPage }.Concat(RegisterPages).ToArray(),
        [RoleId.Shopper] = ["/settings/mystery-shopper"],
        [RoleId.Admin] = [UsersPage, AuditPage, UserPerformancePage, "/settings/hr-team", "/admin/integrations", "/admin/products"],
        [RoleId.Useradmin] = [UsersPage, UserPerformancePage, "/settings/hr-team", "/admin/integrations", "/admin/products"],
    };

    /// <summary>The page list of a role; null = every page. A custom role's list comes from the role the super admin built.</summary>
    private static IReadOnlyCollection<string>? PathsFor(RoleId role, IReadOnlyCollection<string>? customPaths) =>
        role == RoleId.Custom ? customPaths ?? [] : Paths.TryGetValue(role, out var p) ? p : null;

    private static bool Matches(string path, string prefix) => path == prefix || path.StartsWith(prefix + "/", StringComparison.Ordinal);

    private static bool IsCx(RoleId r) => r is RoleId.Cxmgr or RoleId.Cxteam;

    /// <summary>Pages a role may not open although its list says "every page".</summary>
    private static bool Blocked(RoleId role, string path)
    {
        if (IsCx(role) && Matches(path, CampaignAuditPage)) return true;
        if (IsCx(role) && Matches(path, UserPerformancePage)) return true;
        if (role != RoleId.Custom && Matches(path, "/reports")) return true;
        if (role == RoleId.Cxteam && Matches(path, "/agents")) return true;
        if (!IsCx(role) && Matches(path, "/actions/with-teams")) return true;
        if (IsCx(role) && Matches(path, "/settings/hr-team")) return true;
        if (IsCx(role) && Matches(path, "/settings/ld")) return true;
        if (IsCx(role) && (Matches(path, "/admin/integrations") || Matches(path, "/settings/feeds") || Matches(path, "/admin/products"))) return true;
        if (IsCx(role) && Matches(path, AuditPage)) return true;
        if (role == RoleId.Cxteam && new[] { UsersPage, "/settings/weekly-sample", "/settings/crm-mapping", "/settings/escalation-matrix", "/settings/rules" }.Any(p => Matches(path, p))) return true;
        return role == RoleId.Cxteam && Matches(path, TeamPerformancePage);
    }

    /// <summary>Reachable as a route: a parent such as /settings is reachable when any child is.</summary>
    public static bool CanAccessPath(RoleId role, string path, IReadOnlyCollection<string>? customPaths = null)
    {
        if (Blocked(role, path)) return false;
        var allowed = PathsFor(role, customPaths);
        if (allowed is null) return true;
        if (OpenToAll.Any(p => Matches(path, p))) return true;
        return allowed.Any(p => Matches(path, p) || Matches(p, path));
    }

    /// <summary>True only for an exact page or a child of one; /settings alone is not a page.</summary>
    public static bool CanOpenPage(RoleId role, string path, IReadOnlyCollection<string>? customPaths = null)
    {
        if (Blocked(role, path)) return false;
        var allowed = PathsFor(role, customPaths);
        if (allowed is null) return true;
        if (OpenToAll.Any(p => Matches(path, p))) return true;
        return allowed.Any(p => Matches(path, p));
    }

    /// <summary>First page under a section this role may open (for example the first Settings sub-page).</summary>
    public static string? FirstAllowedUnder(RoleId role, string section, IEnumerable<string> candidates, IReadOnlyCollection<string>? customPaths = null) =>
        candidates.FirstOrDefault(c => Matches(c, section) && CanOpenPage(role, c, customPaths));
}
