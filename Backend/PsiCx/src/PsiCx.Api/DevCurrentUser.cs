using PsiCx.Application;
using PsiCx.Domain;

namespace PsiCx.Api;

/// <summary>
/// DEVELOPMENT ONLY. Reads the caller from headers (X-Dev-User-Id, X-Dev-Email, X-Dev-Role) so the endpoints can be exercised before sign-in exists.
/// Registered only when the environment is Development; any other environment gets <see cref="NoCurrentUser"/> (every call is 401)
/// until the real sign-in (SSO, decided with the CTO) replaces both.
/// </summary>
public sealed class DevCurrentUser(IHttpContextAccessor http) : ICurrentUser
{
    public Actor? Actor
    {
        get
        {
            var h = http.HttpContext?.Request.Headers;
            if (h is null) return null;
            var id = h["X-Dev-User-Id"].ToString();
            var email = h["X-Dev-Email"].ToString();
            var role = h["X-Dev-Role"].ToString().Replace("_", "");
            if (id.Length == 0 || !Enum.TryParse<RoleId>(role, ignoreCase: true, out var r)) return null;
            return new Actor(id, email.Length == 0 ? id : email, r);
        }
    }
}

public sealed class NoCurrentUser : ICurrentUser
{
    public Actor? Actor => null;
}
