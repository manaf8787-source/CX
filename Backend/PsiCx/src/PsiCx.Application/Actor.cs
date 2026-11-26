using PsiCx.Domain;

namespace PsiCx.Application;

/// <summary>The signed-in person a request acts for.</summary>
public sealed record Actor(string UserId, string Email, RoleId Role);

/// <summary>
/// Who is calling. Sign-in (SSO, decided with the CTO) provides the real implementation; until then the Api uses a development
/// implementation that reads headers, and nothing in production.
/// </summary>
public interface ICurrentUser
{
    Actor? Actor { get; }
}
