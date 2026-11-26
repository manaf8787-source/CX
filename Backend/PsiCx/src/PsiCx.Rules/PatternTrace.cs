namespace PsiCx.Rules;

/// <summary>Display ids PT-nnn for patterns. Port of ptId and patternTraceIds in React-Frontend/src/utils/trace.ts.</summary>
public static class PatternTrace
{
    /// <summary>32-bit FNV-1a over UTF-16 code units, the same as the frontend's hash.</summary>
    public static uint Fnv1a(string s)
    {
        var h = 0x811c9dc5u;
        foreach (var c in s)
        {
            h ^= c;
            h = unchecked(h * 0x01000193u);
        }
        return h;
    }

    /// <summary>PT-nnn from one key (100 + hash mod 900). Two keys can collide; use <see cref="Ids"/> for a set.</summary>
    public static string PtId(string key) => $"PT-{100 + (int)(Fnv1a(key) % 900)}";

    /// <summary>PT-nnn for a whole set of keys, collisions probed away in ordinal key order, so the result does not depend on input order.</summary>
    public static Dictionary<string, string> Ids(IEnumerable<string> keys)
    {
        var taken = new HashSet<int>();
        var result = new Dictionary<string, string>();
        foreach (var key in keys.OrderBy(k => k, StringComparer.Ordinal))
        {
            var n = (int)(Fnv1a(key) % 900);
            for (var guard = 0; taken.Contains(n) && guard < 900; guard++) n = (n + 1) % 900;
            taken.Add(n);
            result[key] = $"PT-{100 + n}";
        }
        return result;
    }
}
