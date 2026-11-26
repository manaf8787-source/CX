using PsiCx.Application;
using PsiCx.Domain;
using PsiCx.Infrastructure;
using PsiCx.Rules.Access;
using static PsiCx.Domain.RoleId;

namespace PsiCx.Tests;

public class UserServiceTests
{
    private static readonly Actor Super = new("u-admin", "admin@psi.sample", Admin);
    private static readonly Actor Adm = new("u-admin2", "admin2@psi.sample", Useradmin);
    private static readonly Actor Cx = new("u-cxmgr", "cx.manager@psi.sample", Cxmgr);

    private sealed record Rig(UserService Svc, IUserStore Users, AuditService Audit);

    private static async Task<Rig> Make()
    {
        var clock = new FakeClock(new DateTimeOffset(2026, 11, 26, 8, 0, 0, TimeSpan.Zero));
        var users = new InMemoryUserStore();
        var roles = new InMemoryCustomRoleStore();
        await SampleDirectory.SeedAsync(users, roles);
        var audit = new AuditService(new InMemoryAuditStore(), clock);
        return new Rig(new UserService(users, roles, audit, clock), users, audit);
    }

    [Fact]
    public async Task The_super_admin_the_admin_and_the_CX_manager_read_the_list_nobody_else()
    {
        var r = await Make();
        Assert.Equal(18, (await r.Svc.ListAsync(Super)).Value!.Count);
        Assert.True((await r.Svc.ListAsync(Adm)).IsOk);
        Assert.True((await r.Svc.ListAsync(Cx)).IsOk);
        Assert.Equal(Failure.Forbidden, (await r.Svc.ListAsync(new Actor("x", "x@psi.sample", Cxteam))).Error);
        Assert.Equal(Failure.Unauthenticated, (await r.Svc.ListAsync(null)).Error);
    }

    [Fact]
    public async Task Inviting_creates_an_invited_person_and_the_code_is_stored_only_as_a_hash()
    {
        var r = await Make();
        var res = await r.Svc.InviteAsync(Super, "  New.Person@PSI.test ", "New Person", Cxteam, null, null);
        Assert.True(res.IsOk);
        var u = res.Value!.User;
        Assert.Equal("new.person@psi.test", u.Email);
        Assert.Equal(UserStatus.Invited, u.Status);
        Assert.False(u.CanExport);
        Assert.Equal("u-admin", u.InvitedBy);
        Assert.StartsWith("inv-", res.Value.Token);
        Assert.Equal(14, res.Value.Token.Length);
        Assert.NotEqual(res.Value.Token, u.InviteTokenHash);
        Assert.Equal(InviteToken.Hash(res.Value.Token), u.InviteTokenHash);
    }

    [Fact]
    public async Task Invite_input_is_checked()
    {
        var r = await Make();
        Assert.Equal(Failure.Invalid, (await r.Svc.InviteAsync(Super, "not-an-email", "A", Cxteam, null, null)).Error);
        Assert.Equal(Failure.Invalid, (await r.Svc.InviteAsync(Super, "a@b.co", "   ", Cxteam, null, null)).Error);
        Assert.Equal(Failure.Conflict, (await r.Svc.InviteAsync(Super, "ADMIN@psi.sample", "Dup", Cxteam, null, null)).Error);
        Assert.Equal(Failure.Invalid, (await r.Svc.InviteAsync(Super, "e@b.co", "E", Envmgmt, null, null)).Error); // needs an environment
        var env = await r.Svc.InviteAsync(Super, "e@b.co", "E", Envmgmt, null, EnvId.Auh);
        Assert.Equal(EnvId.Auh, env.Value!.User.EnvId);
        Assert.Null((await r.Svc.InviteAsync(Super, "f@b.co", "F", Cxteam, null, EnvId.Dub)).Value!.User.EnvId); // environment only for an environment manager
    }

    [Fact]
    public async Task Who_may_give_which_role()
    {
        var r = await Make();
        Assert.Equal(Failure.Forbidden, (await r.Svc.InviteAsync(Cx, "a@b.co", "A", Cxteam, null, null)).Error); // the CX manager cannot manage users
        Assert.Equal(Failure.Forbidden, (await r.Svc.InviteAsync(Super, "s@b.co", "S", Admin, null, null)).Error); // no second super admin
        Assert.Equal(Failure.Forbidden, (await r.Svc.InviteAsync(Adm, "u@b.co", "U", Useradmin, null, null)).Error); // an Admin cannot create an Admin
        Assert.True((await r.Svc.InviteAsync(Super, "u@b.co", "U", Useradmin, null, null)).IsOk);
        Assert.Equal(Failure.Invalid, (await r.Svc.InviteAsync(Super, "c@b.co", "C", Custom, null, null)).Error);
        Assert.Equal(Failure.Invalid, (await r.Svc.InviteAsync(Super, "c@b.co", "C", Custom, "cr-nope", null)).Error);
        var custom = await r.Svc.InviteAsync(Adm, "c@b.co", "C", Custom, "cr-reporting-viewer", null);
        Assert.Equal("cr-reporting-viewer", custom.Value!.User.CustomRoleId);
    }

    [Fact]
    public async Task A_role_that_opens_administration_is_the_super_admins_to_build_and_give()
    {
        var r = await Make();
        var admins = new Dictionary<string, ScreenAccess> { ["/admin/audit"] = ScreenAccess.View };
        Assert.Equal(Failure.Forbidden, (await r.Svc.SaveCustomRoleAsync(Adm, null, "Auditor", admins)).Error);
        var made = await r.Svc.SaveCustomRoleAsync(Super, null, "Auditor", admins);
        Assert.True(made.IsOk);
        Assert.Equal(Failure.Forbidden, (await r.Svc.InviteAsync(Adm, "a@b.co", "A", Custom, made.Value!.Id, null)).Error);
        Assert.True((await r.Svc.InviteAsync(Super, "a@b.co", "A", Custom, made.Value.Id, null)).IsOk);
        Assert.Equal(Failure.Forbidden, (await r.Svc.SaveCustomRoleAsync(Adm, made.Value.Id, "Auditor", new Dictionary<string, ScreenAccess> { ["/home"] = ScreenAccess.View })).Error);
    }

    [Fact]
    public async Task Accepting_activates_the_person_and_spends_the_code()
    {
        var r = await Make();
        var invite = (await r.Svc.InviteAsync(Super, "n@b.co", "Old Name", Cxteam, null, null)).Value!;
        var accepted = await r.Svc.AcceptInviteAsync(invite.Token, " Real Name ");
        Assert.Equal(UserStatus.Active, accepted.Value!.Status);
        Assert.Equal("Real Name", accepted.Value.Name);
        Assert.Null(accepted.Value.InviteTokenHash);
        Assert.NotNull(accepted.Value.ActivatedAt);
        Assert.Equal(Failure.NotFound, (await r.Svc.AcceptInviteAsync(invite.Token, null)).Error); // spent
        Assert.Equal(Failure.NotFound, (await r.Svc.AcceptInviteAsync("inv-wrong", null)).Error);
        Assert.Equal(Failure.Invalid, (await r.Svc.AcceptInviteAsync("", null)).Error);
        // the sample open invitation works with its sample code
        Assert.True((await r.Svc.AcceptInviteAsync("inv-sample-aslead", null)).IsOk);
    }

    [Fact]
    public async Task Reinviting_gives_a_new_code_and_the_old_link_stops_working()
    {
        var r = await Make();
        var first = (await r.Svc.InviteAsync(Super, "n@b.co", "N", Cxteam, null, null)).Value!;
        var again = (await r.Svc.ReinviteAsync(Super, first.User.Id)).Value!;
        Assert.NotEqual(first.Token, again.Token);
        Assert.Equal(Failure.NotFound, (await r.Svc.AcceptInviteAsync(first.Token, null)).Error);
        Assert.True((await r.Svc.AcceptInviteAsync(again.Token, null)).IsOk);
        Assert.Equal(Failure.Conflict, (await r.Svc.ReinviteAsync(Super, first.User.Id)).Error); // active now
        Assert.Equal(Failure.Conflict, (await r.Svc.ReinviteAsync(Super, "u-admin2")).Error); // an active person has no invitation
        Assert.Equal(Failure.Forbidden, (await r.Svc.ReinviteAsync(Adm, "u-admin")).Error);   // the Super admin's row is not an Admin's to touch
    }

    [Fact]
    public async Task Changing_a_role_follows_the_page_rules()
    {
        var r = await Make();
        Assert.Equal(RoleId.Marketing, (await r.Svc.ChangeRoleAsync(Super, "u-cxteam", Marketing, null, null)).Value!.RoleId);
        Assert.Equal(Failure.Forbidden, (await r.Svc.ChangeRoleAsync(Super, "u-admin", Cxmgr, null, null)).Error); // self (and the super admin)
        Assert.Equal(Failure.Forbidden, (await r.Svc.ChangeRoleAsync(Adm, "u-admin", Cxmgr, null, null)).Error);   // the super admin's role never changes
        Assert.Equal(Failure.Forbidden, (await r.Svc.ChangeRoleAsync(Adm, "u-admin2", Cxmgr, null, null)).Error);  // self
        Assert.Equal(Failure.Forbidden, (await r.Svc.ChangeRoleAsync(Cx, "u-cxteam2", Ld, null, null)).Error);
        // an Admin row is the super admin's
        var second = new Actor("u-other-admin", "o@psi.sample", Useradmin);
        Assert.Equal(Failure.Forbidden, (await r.Svc.ChangeRoleAsync(second, "u-admin2", Cxmgr, null, null)).Error);
        Assert.True((await r.Svc.ChangeRoleAsync(Super, "u-admin2", Cxmgr, null, null)).IsOk);
        // moving off a custom role clears it, onto a custom role sets it
        var toCustom = await r.Svc.ChangeRoleAsync(Super, "u-cxteam3", Custom, "cr-sales-support", null);
        Assert.Equal("cr-sales-support", toCustom.Value!.CustomRoleId);
        Assert.Null((await r.Svc.ChangeRoleAsync(Super, "u-cxteam3", Cxteam, null, null)).Value!.CustomRoleId);
        // an environment manager keeps or gets an environment
        Assert.Equal(Failure.Invalid, (await r.Svc.ChangeRoleAsync(Super, "u-cxteam2", Envmgmt, null, null)).Error);
        Assert.Equal(EnvId.Dub, (await r.Svc.ChangeRoleAsync(Super, "u-cxteam2", Envmgmt, null, EnvId.Dub)).Value!.EnvId);
    }

    [Fact]
    public async Task Export_is_a_privilege_per_person_with_the_page_locks()
    {
        var r = await Make();
        Assert.True((await r.Svc.SetExportAsync(Super, "u-cxteam", true)).Value!.CanExport);
        Assert.False((await r.Svc.SetExportAsync(Adm, "u-cxteam", false)).Value!.CanExport);
        Assert.Equal(Failure.Forbidden, (await r.Svc.SetExportAsync(Adm, "u-admin", false)).Error); // Admin and Super admin rows: the Super admin's
        Assert.Equal(Failure.Forbidden, (await r.Svc.SetExportAsync(Cx, "u-cxteam", true)).Error);
        await r.Svc.DeactivateAsync(Super, "u-cxteam2");
        Assert.Equal(Failure.Conflict, (await r.Svc.SetExportAsync(Super, "u-cxteam2", true)).Error); // deactivated: locked
        // unchanged value writes nothing
        var before = (await r.Audit.QueryAsync(Super, new AuditQuery(Kind: AuditKind.ExportRevoked))).Value!.Total;
        await r.Svc.SetExportAsync(Super, "u-cxteam", false);
        Assert.Equal(before, (await r.Audit.QueryAsync(Super, new AuditQuery(Kind: AuditKind.ExportRevoked))).Value!.Total);
    }

    [Fact]
    public async Task Deactivate_and_reactivate()
    {
        var r = await Make();
        Assert.Equal(Failure.Forbidden, (await r.Svc.DeactivateAsync(Adm, "u-admin2")).Error);     // self
        Assert.Equal(Failure.Forbidden, (await r.Svc.DeactivateAsync(Adm, "u-admin")).Error);      // a Super admin row
        Assert.Equal(Failure.Conflict, (await r.Svc.DeactivateAsync(Super, "u-aslead")).Error);    // only an active person
        Assert.Equal(UserStatus.Disabled, (await r.Svc.DeactivateAsync(Super, "u-cxteam")).Value!.Status);
        Assert.Equal(Failure.Conflict, (await r.Svc.DeactivateAsync(Super, "u-cxteam")).Error);
        Assert.Equal(UserStatus.Active, (await r.Svc.ReactivateAsync(Super, "u-cxteam")).Value!.Status);
        Assert.Equal(Failure.Conflict, (await r.Svc.ReactivateAsync(Super, "u-cxteam")).Error);
        Assert.Equal(Failure.NotFound, (await r.Svc.DeactivateAsync(Super, "nope")).Error);
    }

    [Fact]
    public async Task The_last_active_super_admin_cannot_be_deactivated()
    {
        var r = await Make();
        var second = await r.Users.AddAsync(new PortalUser("u-admin-b", "admin.b@psi.sample", "B", Admin, null, null, UserStatus.Active, DateTimeOffset.UnixEpoch, DateTimeOffset.UnixEpoch, null, "u-admin", false));
        Assert.True(second);
        var b = new Actor("u-admin-b", "admin.b@psi.sample", Admin);
        Assert.Equal(UserStatus.Disabled, (await r.Svc.DeactivateAsync(b, "u-admin")).Value!.Status); // two were active: fine
        // one is left: the other one tries (a third super admin disabled the first); here the remaining super admin is the target
        var c = new Actor("u-someone", "s@psi.sample", Admin);
        Assert.Equal(Failure.Conflict, (await r.Svc.DeactivateAsync(c, "u-admin-b")).Error);
    }

    [Fact]
    public async Task Only_an_open_invitation_is_withdrawn_and_an_accepted_person_stays()
    {
        var r = await Make();
        Assert.True((await r.Svc.WithdrawInviteAsync(Super, "u-aslead")).IsOk);
        Assert.Null(await r.Users.GetAsync("u-aslead"));
        Assert.Equal(Failure.Conflict, (await r.Svc.WithdrawInviteAsync(Super, "u-cxteam")).Error);
        Assert.Equal(Failure.NotFound, (await r.Svc.WithdrawInviteAsync(Super, "u-aslead")).Error);
    }

    [Fact]
    public async Task Custom_roles_validate_and_cannot_be_deleted_while_given()
    {
        var r = await Make();
        Assert.Equal(Failure.Invalid, (await r.Svc.SaveCustomRoleAsync(Super, null, " ", new Dictionary<string, ScreenAccess> { ["/home"] = ScreenAccess.View })).Error);
        Assert.Equal(Failure.Invalid, (await r.Svc.SaveCustomRoleAsync(Super, null, "R", new Dictionary<string, ScreenAccess>())).Error);
        Assert.Equal(Failure.Invalid, (await r.Svc.SaveCustomRoleAsync(Super, null, "R", new Dictionary<string, ScreenAccess> { ["home"] = ScreenAccess.View })).Error);
        Assert.Equal(Failure.Invalid, (await r.Svc.SaveCustomRoleAsync(Super, null, "R", new Dictionary<string, ScreenAccess> { ["/home"] = ScreenAccess.None })).Error);
        Assert.Equal(Failure.Forbidden, (await r.Svc.SaveCustomRoleAsync(Cx, null, "R", new Dictionary<string, ScreenAccess> { ["/home"] = ScreenAccess.View })).Error);

        var made = (await r.Svc.SaveCustomRoleAsync(Adm, null, "Reports", new Dictionary<string, ScreenAccess> { ["/reports"] = ScreenAccess.View })).Value!;
        var edited = (await r.Svc.SaveCustomRoleAsync(Adm, made.Id, "Reports 2", new Dictionary<string, ScreenAccess> { ["/reports"] = ScreenAccess.View, ["/inbox"] = ScreenAccess.Edit })).Value!;
        Assert.Equal(made.Id, edited.Id);
        Assert.Equal(2, edited.Screens.Count);

        Assert.Equal(Failure.Conflict, (await r.Svc.DeleteCustomRoleAsync(Super, "cr-reporting-viewer")).Error); // given to u-viewer
        Assert.True((await r.Svc.DeleteCustomRoleAsync(Super, made.Id)).IsOk);
        Assert.Equal(Failure.NotFound, (await r.Svc.DeleteCustomRoleAsync(Super, made.Id)).Error);
    }

    [Fact]
    public async Task Every_user_change_is_in_the_audit_log()
    {
        var r = await Make();
        var inv = (await r.Svc.InviteAsync(Super, "n@b.co", "N", Cxteam, null, null)).Value!;
        await r.Svc.ChangeRoleAsync(Super, inv.User.Id, Ld, null, null);
        await r.Svc.SetExportAsync(Super, "u-cxteam", true);
        await r.Svc.DeactivateAsync(Super, "u-cxteam2");
        await r.Svc.ReactivateAsync(Super, "u-cxteam2");
        await r.Svc.WithdrawInviteAsync(Super, inv.User.Id);
        var kinds = (await r.Audit.QueryAsync(Super, new AuditQuery())).Value!.Items.Select(i => i.Kind.ToString()).Reverse().ToArray();
        Assert.Equal("UserInvited,UserRoleChanged,ExportGranted,UserDeactivated,UserReactivated,InviteWithdrawn", string.Join(",", kinds));
    }
}

public class CustomRoleAccessTests
{
    private static readonly Dictionary<string, ScreenAccess> Viewer = new() { ["/reports"] = ScreenAccess.View };
    private static readonly Dictionary<string, ScreenAccess> Mixed = new() { ["/actions"] = ScreenAccess.View, ["/actions/corrective"] = ScreenAccess.Edit };

    [Fact]
    public void The_most_specific_screen_decides()
    {
        Assert.Equal(ScreenAccess.View, CustomRoleAccess.LevelFor(Viewer, "/reports"));
        Assert.Equal(ScreenAccess.View, CustomRoleAccess.LevelFor(Viewer, "/reports/x"));
        Assert.Equal(ScreenAccess.None, CustomRoleAccess.LevelFor(Viewer, "/reportsx"));
        Assert.Equal(ScreenAccess.None, CustomRoleAccess.LevelFor(Viewer, "/home"));
        Assert.Equal(ScreenAccess.View, CustomRoleAccess.LevelFor(Mixed, "/actions/signals"));
        Assert.Equal(ScreenAccess.Edit, CustomRoleAccess.LevelFor(Mixed, "/actions/corrective/1"));
        Assert.True(CustomRoleAccess.CanEdit(Mixed, "/actions/corrective"));
        Assert.False(CustomRoleAccess.CanEdit(Viewer, "/reports"));
    }

    [Fact]
    public void A_custom_role_opens_exactly_its_pages_through_PageAccess()
    {
        var paths = CustomRoleAccess.AllowedPaths(Viewer);
        Assert.True(PageAccess.CanOpenPage(Custom, "/reports", paths));
        Assert.False(PageAccess.CanOpenPage(Custom, "/home", paths));
    }

    [Fact]
    public void Administration_screens_are_detected()
    {
        Assert.True(CustomRoleAccess.TouchesAdministration(new Dictionary<string, ScreenAccess> { ["/admin/users"] = ScreenAccess.View }));
        Assert.False(CustomRoleAccess.TouchesAdministration(Viewer));
        Assert.False(CustomRoleAccess.TouchesAdministration(new Dictionary<string, ScreenAccess> { ["/administration-x"] = ScreenAccess.View }));
    }
}
