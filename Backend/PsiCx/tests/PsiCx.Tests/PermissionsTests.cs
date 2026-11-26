using PsiCx.Domain;
using PsiCx.Rules.Access;
using static PsiCx.Domain.RoleId;

namespace PsiCx.Tests;

public class PermissionsTests
{
    private static readonly RoleId[] Twelve = [Cxmgr, Cxteam, Envmgmt, Teamlead, Aslead, Ld, Hrspec, Hrmgr, Marketing, Auditmkt, Exec, Shopper];

    private static string Who(Func<RoleId, bool> f) => string.Join(",", Twelve.Where(f).Select(r => r.ToString()).OrderBy(x => x, StringComparer.Ordinal));
    private static string Of(params RoleId[] roles) => string.Join(",", roles.Select(r => r.ToString()).OrderBy(x => x, StringComparer.Ordinal));
    private static string Open(string path) => Who(r => PageAccess.CanOpenPage(r, path));

    [Fact] public void Conversation_text_is_CX_only() => Assert.Equal(Of(Cxmgr, Cxteam), Who(Permissions.CanViewConversationText));

    [Fact]
    public void Agent_names_follow_the_22_Nov_decision_everyone_but_the_shopper()
    {
        Assert.Equal(Of(Cxmgr, Cxteam, Envmgmt, Teamlead, Aslead, Ld, Hrspec, Hrmgr, Marketing, Auditmkt, Exec), Who(Permissions.CanViewAgentNames));
        Assert.False(Permissions.CanViewAgentNames(Shopper));
        Assert.False(Permissions.CanViewAgentNames(Admin));
    }

    [Fact]
    public void Heads_and_C_level_are_informed_only_and_never_act()
    {
        Assert.Equal(Of(Auditmkt, Exec, Hrmgr), Who(Permissions.IsInformedOnly));
        foreach (var r in new[] { Exec, Hrmgr, Auditmkt })
        {
            Assert.False(Permissions.CanActOnShopperCase(r));
            foreach (var kind in new[] { "employee", "process", "training_gap", "marketing" }) Assert.False(Permissions.CanActOnCorrectiveAction(r, kind));
        }
    }

    [Fact]
    public void Employee_note_and_other_fixes_go_to_CX_and_line_management()
    {
        var line = Of(Aslead, Cxmgr, Cxteam, Envmgmt, Teamlead);
        Assert.Equal(line, Who(r => Permissions.CanActOnCorrectiveAction(r, "employee")));
        Assert.Equal(line, Who(r => Permissions.CanActOnCorrectiveAction(r, "process")));
    }

    [Fact]
    public void Shopper_cases_HR_specialist_yes_HR_manager_no()
    {
        Assert.True(Permissions.CanActOnShopperCase(Hrspec));
        Assert.False(Permissions.CanActOnShopperCase(Hrmgr));
        Assert.False(Permissions.CanActOnShopperCase(Shopper));
    }

    [Fact]
    public void The_audit_lead_audits_and_never_approves_a_fix()
    {
        foreach (var kind in new[] { "employee", "service", "training_gap", "process", "product", "environment", "legal", "marketing" })
            Assert.False(Permissions.CanActOnCorrectiveAction(Auditmkt, kind));
        Assert.False(Permissions.CanRecordFixVerdict(Auditmkt));
        Assert.False(PageAccess.CanOpenPage(Auditmkt, "/actions"));
        Assert.False(PageAccess.CanAccessPath(Auditmkt, "/actions/corrective"));
    }

    [Fact]
    public void Fix_verdict_and_edit_rights()
    {
        Assert.Equal(Of(Cxmgr, Cxteam), Who(Permissions.CanRecordFixVerdict));
        Assert.Equal(Of(Auditmkt), Who(Permissions.CanApprovePersona));
        Assert.Equal(Of(Auditmkt), Who(Permissions.CanViewPersonaAudit));
        Assert.Equal(Of(Cxmgr, Auditmkt), Who(Permissions.CanEditCrmMapping));
        Assert.Equal(Of(Cxmgr, Auditmkt), Who(Permissions.CanEditEscalationMatrix));
        Assert.Equal(Of(Cxmgr, Cxteam, Auditmkt), Who(Permissions.CanJudgeSample));
        Assert.Equal(Of(Cxmgr, Cxteam), Who(Permissions.CanMarkMentionReplied));
        Assert.Equal(Of(Cxteam), Who(Permissions.CanRecordCallAttempt));
        Assert.Equal(Of(Cxmgr), Who(Permissions.CanAssignCalls));
        Assert.Equal(Of(Auditmkt), Who(Permissions.CanEditCampaignAudit));
        Assert.Equal(Of(Cxmgr), Who(Permissions.CanEditAgentSettings));
        Assert.Equal(Of(Cxmgr), Who(Permissions.CanEditReplyLibrary));
    }

    [Fact]
    public void Customer_names_and_mobiles_never_go_to_the_audit_lead()
    {
        Assert.Equal(Of(Cxmgr, Cxteam, Envmgmt, Teamlead, Aslead, Marketing, Exec), Who(Permissions.CanViewCustomerNames));
        Assert.Equal(Who(Permissions.CanViewCustomerNames), Who(Permissions.CanViewMobiles));
        Assert.Equal(Who(Permissions.CanViewCustomerNames), Who(Permissions.CanViewNamesInSample));
        foreach (var r in new[] { Auditmkt, Ld, Hrspec, Hrmgr, Shopper }) Assert.False(Permissions.CanViewMobiles(r));
    }

    [Fact]
    public void Who_starts_a_campaign_never_the_audit_role()
    {
        Assert.Equal(Of(Cxmgr, Marketing), Who(r => Permissions.CanStartCampaign(r, Permissions.CampaignKind.Persona)));
        Assert.Equal(Of(Cxmgr, Cxteam), Who(r => Permissions.CanStartCampaign(r, Permissions.CampaignKind.Ai)));
        Assert.False(Permissions.CanStartCampaign(Auditmkt, Permissions.CampaignKind.Persona));
    }

    [Fact]
    public void Performance_and_user_administration()
    {
        Assert.True(Permissions.CanViewTeamPerformance(Cxmgr));
        Assert.False(Permissions.CanViewTeamPerformance(Cxteam));
        Assert.True(Permissions.CanViewUserPerformance(Admin));
        Assert.True(Permissions.CanViewUserPerformance(Useradmin));
        Assert.False(Permissions.CanViewUserPerformance(Cxmgr));
        Assert.True(Permissions.CanExportPerformance(Admin));
        Assert.True(Permissions.CanExportPerformance(Cxmgr));
        Assert.False(Permissions.CanExportPerformance(Useradmin));
        Assert.True(Permissions.CanManageUsers(Useradmin));
        Assert.True(Permissions.CanManageAdmins(Admin));
        Assert.False(Permissions.CanManageAdmins(Useradmin));
        Assert.False(Permissions.CanManageUsers(Cxmgr));
    }

    [Fact]
    public void Assistant_is_for_CX_Marketing_executives_and_environment_managers() =>
        Assert.Equal(Of(Cxmgr, Cxteam, Envmgmt, Exec, Marketing), Who(Permissions.CanUseAssistant));

    [Fact]
    public void Sample_reader_is_audit_for_the_audit_lead_only()
    {
        Assert.Equal(Permissions.SampleReader.Audit, Permissions.SampleReaderOf(Auditmkt));
        Assert.Equal(Permissions.SampleReader.Cx, Permissions.SampleReaderOf(Cxmgr));
    }

    [Theory]
    [InlineData("Head of Sales", true)]
    [InlineData("Chief Executive", true)]
    [InlineData("المدير العام", true)]
    [InlineData("Sales team lead", false)]
    [InlineData("Environment manager", false)]
    public void Top_management_titles(string title, bool expected) => Assert.Equal(expected, Permissions.IsTopManagementTitle(title));

    [Fact]
    public void Agent_display_never_leaks_a_ref()
    {
        var dir = new[] { new Permissions.AgentDirectoryEntry("ag-1", "Sample Agent", "Sales team lead", [Cxmgr, Teamlead]) };
        Assert.Equal(new Permissions.AgentDisplay(true, "Sample Agent"), Permissions.ResolveAgentDisplay("ag-1", Cxmgr, dir, "An agent"));
        Assert.Equal(new Permissions.AgentDisplay(false, "Sales team lead"), Permissions.ResolveAgentDisplay("ag-1", Envmgmt, dir, "An agent"));
        Assert.Equal(new Permissions.AgentDisplay(false, "An agent"), Permissions.ResolveAgentDisplay("ag-404", Cxmgr, dir, "An agent"));
        Assert.Equal("An agent", Permissions.ResolveAgentDisplay(null, Cxmgr, dir, "An agent").Label);
    }

    // --- Pages ---

    [Fact]
    public void CX_manager_and_team_open_everything_except_what_is_not_theirs()
    {
        foreach (var p in new[] { "/home", "/actions/signals", "/settings/rules" }.Concat(new[] { "/intelligent-cx-team" }))
        {
            Assert.True(PageAccess.CanOpenPage(Cxmgr, p));
            if (p != "/settings/rules") Assert.True(PageAccess.CanOpenPage(Cxteam, p));
        }
        Assert.False(PageAccess.CanOpenPage(Cxmgr, "/settings/campaign-audit"));
        Assert.False(PageAccess.CanOpenPage(Cxmgr, "/admin/audit"));
        Assert.False(PageAccess.CanOpenPage(Cxteam, "/settings/rules"));
        Assert.False(PageAccess.CanOpenPage(Cxteam, "/performance"));
        Assert.True(PageAccess.CanOpenPage(Cxmgr, "/performance"));
    }

    [Fact]
    public void The_shopper_sees_only_their_tasks_and_the_glossary()
    {
        Assert.True(PageAccess.CanOpenPage(Shopper, "/settings/mystery-shopper"));
        Assert.True(PageAccess.CanOpenPage(Shopper, "/settings/glossary"));
        foreach (var p in new[] { "/home", "/customers", "/actions", "/settings/rules" }) Assert.False(PageAccess.CanOpenPage(Shopper, p));
    }

    [Fact]
    public void Child_paths_inherit_and_a_parent_alone_is_not_a_page()
    {
        Assert.True(PageAccess.CanOpenPage(Teamlead, "/actions/corrective"));
        Assert.True(PageAccess.CanAccessPath(Ld, "/settings"));
        Assert.False(PageAccess.CanOpenPage(Ld, "/settings"));
        Assert.False(PageAccess.CanOpenPage(Teamlead, "/actionsx"));
    }

    [Fact]
    public void HR_manager_is_limited_to_HR_team_performance()
    {
        Assert.True(PageAccess.CanOpenPage(Hrmgr, "/settings/hr-team"));
        Assert.False(PageAccess.CanOpenPage(Hrmgr, "/actions"));
    }

    [Fact]
    public void First_allowed_page_under_a_section()
    {
        var subs = new[] { "/settings/overview", "/settings/ld", "/settings/standards" };
        Assert.Equal("/settings/ld", PageAccess.FirstAllowedUnder(Ld, "/settings", subs));
        Assert.Null(PageAccess.FirstAllowedUnder(Shopper, "/settings", subs));
    }

    [Fact]
    public void Role_page_lists()
    {
        Assert.Equal(Of(Cxmgr, Cxteam, Envmgmt, Teamlead, Aslead, Ld, Marketing, Auditmkt, Exec), Open("/inbox")); // L&D has it in the current access.ts; the older frontend test said not
        Assert.Equal(Of(Cxmgr, Cxteam, Exec, Auditmkt), Open("/overview"));
        Assert.Equal(Of(Cxmgr, Auditmkt, Exec), Open("/settings/crm-mapping"));          // the CX team no longer opens it
        Assert.Equal(Of(Cxmgr, Cxteam, Auditmkt, Exec, Marketing, Teamlead, Aslead, Envmgmt), Open("/settings/public-mentions"));
        Assert.Equal(Of(Marketing, Auditmkt, Exec), Open("/settings/campaign-audit"));   // CX does not open it (22 Nov)
        Assert.Equal(Of(Cxmgr, Cxteam, Exec, Auditmkt, Aslead, Envmgmt), Open("/settings/surveys"));
        Assert.Equal(Of(Cxmgr, Cxteam, Envmgmt, Marketing, Auditmkt, Exec), Open("/settings/ai-team"));
    }

    [Fact]
    public void The_audit_lead_gains_customers_but_not_cases()
    {
        Assert.True(PageAccess.CanOpenPage(Auditmkt, "/customers"));
        Assert.True(PageAccess.CanOpenPage(Auditmkt, "/runaway"));
        Assert.False(PageAccess.CanOpenPage(Auditmkt, "/close-the-loop"));
        Assert.False(PageAccess.CanOpenPage(Auditmkt, "/home"));
        Assert.False(PageAccess.CanOpenPage(Auditmkt, "/settings/overview"));
    }

    [Fact]
    public void Waiting_on_other_teams_is_the_CX_side_only()
    {
        Assert.True(PageAccess.CanOpenPage(Cxmgr, "/actions/with-teams"));
        Assert.False(PageAccess.CanOpenPage(Teamlead, "/actions/with-teams"));
        Assert.False(PageAccess.CanOpenPage(Exec, "/actions/with-teams"));
    }

    [Fact]
    public void Admin_roles_see_the_user_pages_only_and_the_audit_log_is_the_super_admins()
    {
        Assert.True(PageAccess.CanOpenPage(Admin, "/admin/users"));
        Assert.True(PageAccess.CanOpenPage(Admin, "/admin/audit"));
        Assert.True(PageAccess.CanOpenPage(Useradmin, "/admin/users"));
        Assert.False(PageAccess.CanOpenPage(Useradmin, "/admin/audit"));
        Assert.False(PageAccess.CanOpenPage(Admin, "/home"));
        Assert.False(PageAccess.CanOpenPage(Useradmin, "/customers"));
    }

    [Fact]
    public void A_custom_role_gets_exactly_its_own_pages()
    {
        var mine = new[] { "/home", "/reports" };
        Assert.True(PageAccess.CanOpenPage(Custom, "/reports", mine));
        Assert.True(PageAccess.CanOpenPage(Custom, "/home", mine));
        Assert.False(PageAccess.CanOpenPage(Custom, "/customers", mine));
        Assert.False(PageAccess.CanOpenPage(Custom, "/home")); // no list = nothing
        Assert.True(PageAccess.CanOpenPage(Custom, "/settings/glossary"));
        Assert.False(PageAccess.CanOpenPage(Cxmgr, "/reports")); // the counts-only page is for custom roles
    }
}
