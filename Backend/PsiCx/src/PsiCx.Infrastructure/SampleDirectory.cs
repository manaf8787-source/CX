using PsiCx.Application;
using PsiCx.Domain;
using static PsiCx.Domain.RoleId;

namespace PsiCx.Infrastructure;

/// <summary>
/// The sample directory of the prototype (React-Frontend/src/data/users.ts SEED_USERS and SEED_ROLES), for development and demos only.
/// All names and emails are sample data. Never seeded in production.
/// </summary>
public static class SampleDirectory
{
    private static readonly DateTimeOffset Seeded = new(2026, 11, 19, 7, 0, 0, TimeSpan.Zero);

    private static PortalUser U(string id, string email, string name, RoleId role, string? customRole = null, EnvId? env = null, bool export = false, UserStatus status = UserStatus.Active, string? inviteToken = null) =>
        new(id, email, name, role, customRole, env, status, Seeded, status == UserStatus.Invited ? null : Seeded,
            inviteToken is null ? null : InviteToken.Hash(inviteToken), id == "u-admin" ? null : "u-admin", export);

    public static IReadOnlyList<PortalUser> Users { get; } =
    [
        U("u-admin", "admin@psi.sample", "Super admin", Admin, export: true),
        U("u-admin2", "admin2@psi.sample", "Admin", Useradmin),
        U("u-viewer", "reporting.viewer@psi.sample", "Reporting viewer", Custom, "cr-reporting-viewer"),
        U("u-cxmgr", "cx.manager@psi.sample", "CX manager", Cxmgr, export: true),
        U("u-cxteam", "cx.team@psi.sample", "Abeer", Cxteam),
        U("u-cxteam2", "cx.team2@psi.sample", "Muhannad", Cxteam),
        U("u-cxteam3", "cx.team3@psi.sample", "Dina", Cxteam),
        U("u-env", "env.manager@psi.sample", "Dubai CEO", Envmgmt, env: EnvId.Dub),
        U("u-env2", "env.manager.auh@psi.sample", "Firas", Envmgmt, env: EnvId.Auh),
        U("u-env3", "env.manager.assets@psi.sample", "Niveen", Envmgmt, env: EnvId.Ast),
        U("u-env4", "env.manager.ai@psi.sample", "PSI-AI CEO", Envmgmt, env: EnvId.Ai),
        U("u-salessupport", "sales.support@psi.sample", "Sales support", Custom, "cr-sales-support"),
        U("u-mkt", "marketing@psi.sample", "Marketing manager", Marketing),
        U("u-hrdir", "hr.director@psi.sample", "HR director", Hrmgr),
        U("u-hrspec", "hr.specialist@psi.sample", "HR specialist", Hrspec),
        U("u-ld", "ld@psi.sample", "L&D manager", Ld),
        U("u-audit", "audit@psi.sample", "Internal Audit and Marketing Lead", Auditmkt),
        U("u-aslead", "aftersales.lead@psi.sample", "After-Sales team lead", Aslead, status: UserStatus.Invited, inviteToken: "inv-sample-aslead"),
    ];

    public static IReadOnlyList<CustomRole> Roles { get; } =
    [
        new("cr-reporting-viewer", "Reporting viewer", new Dictionary<string, ScreenAccess> { ["/reports"] = ScreenAccess.View }),
        new("cr-sales-support", "Sales support", new Dictionary<string, ScreenAccess> { ["/home"] = ScreenAccess.View, ["/agents/sales"] = ScreenAccess.View }),
    ];

    public static async Task SeedAsync(IUserStore users, ICustomRoleStore roles)
    {
        foreach (var r in Roles) await roles.UpsertAsync(r);
        foreach (var u in Users) await users.AddAsync(u);
    }
}
