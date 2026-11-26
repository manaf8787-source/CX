using PsiCx.Application;
using PsiCx.Domain;

namespace PsiCx.Infrastructure;

public sealed class InMemoryUserStore : IUserStore
{
    private readonly List<PortalUser> _users = [];
    private readonly object _gate = new();

    public Task<PortalUser?> GetAsync(string id, CancellationToken ct = default)
    {
        lock (_gate) return Task.FromResult(_users.FirstOrDefault(u => u.Id == id));
    }

    public Task<PortalUser?> GetByEmailAsync(string email, CancellationToken ct = default)
    {
        var key = email.Trim().ToLowerInvariant();
        lock (_gate) return Task.FromResult(_users.FirstOrDefault(u => u.Email == key));
    }

    public Task<PortalUser?> GetByTokenHashAsync(string hash, CancellationToken ct = default)
    {
        lock (_gate) return Task.FromResult(_users.FirstOrDefault(u => u.InviteTokenHash == hash));
    }

    public Task<IReadOnlyList<PortalUser>> ListAsync(CancellationToken ct = default)
    {
        lock (_gate) return Task.FromResult<IReadOnlyList<PortalUser>>(_users.ToList());
    }

    public Task<bool> AddAsync(PortalUser user, CancellationToken ct = default)
    {
        lock (_gate)
        {
            if (_users.Any(u => u.Email == user.Email)) return Task.FromResult(false);
            _users.Add(user);
            return Task.FromResult(true);
        }
    }

    public Task UpdateAsync(PortalUser user, CancellationToken ct = default)
    {
        lock (_gate)
        {
            var i = _users.FindIndex(u => u.Id == user.Id);
            if (i >= 0) _users[i] = user;
        }
        return Task.CompletedTask;
    }

    public Task RemoveAsync(string id, CancellationToken ct = default)
    {
        lock (_gate) _users.RemoveAll(u => u.Id == id);
        return Task.CompletedTask;
    }
}

public sealed class InMemoryCustomRoleStore : ICustomRoleStore
{
    private readonly List<CustomRole> _roles = [];
    private readonly object _gate = new();

    public Task<IReadOnlyList<CustomRole>> ListAsync(CancellationToken ct = default)
    {
        lock (_gate) return Task.FromResult<IReadOnlyList<CustomRole>>(_roles.ToList());
    }

    public Task<CustomRole?> GetAsync(string id, CancellationToken ct = default)
    {
        lock (_gate) return Task.FromResult(_roles.FirstOrDefault(r => r.Id == id));
    }

    public Task UpsertAsync(CustomRole role, CancellationToken ct = default)
    {
        lock (_gate)
        {
            var i = _roles.FindIndex(r => r.Id == role.Id);
            if (i >= 0) _roles[i] = role; else _roles.Add(role);
        }
        return Task.CompletedTask;
    }

    public Task RemoveAsync(string id, CancellationToken ct = default)
    {
        lock (_gate) _roles.RemoveAll(r => r.Id == id);
        return Task.CompletedTask;
    }
}
