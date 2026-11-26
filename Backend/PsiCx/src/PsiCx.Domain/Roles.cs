namespace PsiCx.Domain;

// Mirrors React-Frontend/src/types/roles.ts.
public enum RoleId
{
    Cxmgr, Cxteam, Envmgmt, Teamlead, Aslead, Ld, Hrspec, Hrmgr,
    Marketing, Auditmkt, Exec, Shopper,
    /// <summary>Super admin: invites users, creates Admins, opens the audit log.</summary>
    Admin,
    /// <summary>"Admin": manages users but cannot create another Admin or open the audit log.</summary>
    Useradmin,
    /// <summary>A role the super admin builds screen by screen.</summary>
    Custom
}

public enum ScreenAccess { None, View, Edit }
