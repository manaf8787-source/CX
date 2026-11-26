using System.Text.RegularExpressions;
using PsiCx.Domain;
using static PsiCx.Domain.RoleId;

namespace PsiCx.Rules.Access;

/// <summary>
/// Port of React-Frontend/src/auth/permissions.ts: who may see or do what with data (the NFR-2 data-layer gating). Pure and role-based.
/// The server is the authority: the frontend gating is only convenience.
/// </summary>
public static class Permissions
{
    private static bool In(RoleId r, params RoleId[] roles) => Array.IndexOf(roles, r) >= 0;

    /// <summary>Conversation text: CX manager and CX team only.</summary>
    public static bool CanViewConversationText(RoleId r) => In(r, Cxmgr, Cxteam);

    /// <summary>Agent names (owner, 22 Nov): every signed-in person except the external mystery shopper sign-in and the admin roles.</summary>
    public static bool CanViewAgentNames(RoleId r) =>
        In(r, Cxmgr, Cxteam, Envmgmt, Teamlead, Aslead, Ld, Hrspec, Hrmgr, Marketing, Auditmkt, Exec, Custom);

    /// <summary>Heads and C-level are informed only: never the owner of a case or action, never in the approval chain.</summary>
    public static bool IsInformedOnly(RoleId r) => In(r, Exec, Hrmgr, Auditmkt);

    private static readonly Regex TopManagement = new(
        @"\b(head of|chief|ceo|coo|cfo|cto|c-level|chairman|board|managing director|general manager|vice president|vp)\b|رئيس|المدير العام|الرئيس التنفيذي|مجلس الإدارة",
        RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);

    /// <summary>True when an owner title names a head, a chief or the board (refused as the receiver of a case).</summary>
    public static bool IsTopManagementTitle(string title) => TopManagement.IsMatch(title);

    /// <summary>Acting on a corrective action. An "employee" note goes only to CX and the line management.</summary>
    public static bool CanActOnCorrectiveAction(RoleId r, string kind)
    {
        if (kind == "employee") return In(r, Cxmgr, Cxteam, Envmgmt, Teamlead, Aslead);
        if (IsInformedOnly(r)) return false;
        return In(r, Cxmgr, Cxteam, Envmgmt, Teamlead, Aslead);
    }

    /// <summary>The 60-day verdict is closed by a person in CX, never by the receiver of the fix.</summary>
    public static bool CanRecordFixVerdict(RoleId r) => In(r, Cxmgr, Cxteam);

    /// <summary>Shopper cases: conduct issues route through the HR pool; HR managers and the shopper never decide.</summary>
    public static bool CanActOnShopperCase(RoleId r)
    {
        if (IsInformedOnly(r)) return false;
        return In(r, Cxmgr, Cxteam, Hrspec, Envmgmt, Teamlead, Aslead);
    }

    /// <summary>22 Nov: naming and approving personas is the Internal Audit and Marketing Lead's.</summary>
    public static bool CanApprovePersona(RoleId r) => r == Auditmkt;

    public static bool CanViewPersonaAudit(RoleId r) => r == Auditmkt;

    /// <summary>22 Nov: the team report is the CX manager's; the all-users dashboard the Admin's and Super admin's; export: Super admin and CX manager.</summary>
    public static bool CanViewTeamPerformance(RoleId r) => r == Cxmgr;
    public static bool CanViewUserPerformance(RoleId r) => In(r, Admin, Useradmin);
    public static bool CanExportPerformance(RoleId r) => In(r, Admin, Cxmgr);

    public static bool CanEditCrmMapping(RoleId r) => In(r, Cxmgr, Auditmkt);
    public static bool CanEditEscalationMatrix(RoleId r) => In(r, Cxmgr, Auditmkt);

    /// <summary>The weekly sample is judged by the CX manager, the CX team and the Internal Audit and Marketing Lead.</summary>
    public static bool CanJudgeSample(RoleId r) => In(r, Cxmgr, Cxteam, Auditmkt);

    /// <summary>The "Open" button on a sample row: CX roles only.</summary>
    public static bool CanOpenSampleRecord(RoleId r) => In(r, Cxmgr, Cxteam);

    public enum SampleReader { Cx, Audit }

    /// <summary>The weekly sample is split by reader: audit rows for the audit lead, content rows for the others.</summary>
    public static SampleReader SampleReaderOf(RoleId r) => r == Auditmkt ? SampleReader.Audit : SampleReader.Cx;

    /// <summary>Customer names (decided 18 Nov): everyone who works with people, except the Internal Audit and Marketing Lead.</summary>
    public static bool CanViewCustomerNames(RoleId r) => In(r, Cxmgr, Cxteam, Envmgmt, Teamlead, Aslead, Marketing, Exec);

    /// <summary>Exports show mobiles only to roles that may see names (decided 18 Nov).</summary>
    public static bool CanViewMobiles(RoleId r) => CanViewCustomerNames(r);

    public static bool CanViewNamesInSample(RoleId r) => CanViewCustomerNames(r);

    /// <summary>23 Nov: a human from the CX team replies to public comments; Marketing reads.</summary>
    public static bool CanMarkMentionReplied(RoleId r) => In(r, Cxmgr, Cxteam);

    public static bool CanEditAgentSettings(RoleId r) => r == Cxmgr;
    public static bool CanEditReplyLibrary(RoleId r) => r == Cxmgr;

    /// <summary>22 Nov: the CX manager does not make the calls; the CX team does.</summary>
    public static bool CanRecordCallAttempt(RoleId r) => r == Cxteam;

    /// <summary>22 Nov: the CX manager gives a case to a CX team member or asks for another call.</summary>
    public static bool CanAssignCalls(RoleId r) => r == Cxmgr;

    /// <summary>22 Nov: the campaign audit belongs to the Internal Audit and Marketing Lead.</summary>
    public static bool CanEditCampaignAudit(RoleId r) => r == Auditmkt;

    public enum CampaignKind { Persona, Ai }

    /// <summary>[Proposed] who starts a cleared campaign: Marketing (and the CX manager) a persona campaign; CX an AI campaign; never the audit role.</summary>
    public static bool CanStartCampaign(RoleId r, CampaignKind kind) =>
        kind == CampaignKind.Ai ? In(r, Cxmgr, Cxteam) : In(r, Marketing, Cxmgr);

    // --- Users and administration (access.ts) ---

    /// <summary>Who can invite, re-invite, change a role or deactivate: the Super admin and the Admin.</summary>
    public static bool CanManageUsers(RoleId r) => In(r, Admin, Useradmin);

    /// <summary>Only the Super admin creates, changes or deactivates an Admin or another Super admin.</summary>
    public static bool CanManageAdmins(RoleId r) => r == Admin;

    /// <summary>KB §13: the assistant is for CX, Marketing, executives and environment managers.</summary>
    public static bool CanUseAssistant(RoleId r) => In(r, Cxmgr, Cxteam, Marketing, Exec, Envmgmt);

    public sealed record AgentDirectoryEntry(string AgentRef, string DisplayName, string DirectManagerTitle, IReadOnlyCollection<RoleId> VisibleTo);

    public sealed record AgentDisplay(bool Visible, string Label);

    /// <summary>A real name only when the role may see names AND is listed on the entry; otherwise the manager's title. Never the bare ref.</summary>
    public static AgentDisplay ResolveAgentDisplay(string? agentRef, RoleId role, IEnumerable<AgentDirectoryEntry> directory, string fallback)
    {
        if (string.IsNullOrEmpty(agentRef)) return new(false, fallback);
        var entry = directory.FirstOrDefault(d => d.AgentRef == agentRef);
        if (entry is null) return new(false, fallback);
        if (CanViewAgentNames(role) && entry.VisibleTo.Contains(role)) return new(true, entry.DisplayName);
        return new(false, entry.DirectManagerTitle);
    }
}
