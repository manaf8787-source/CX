namespace PsiCx.Domain;

// Mirrors React-Frontend/src/types/common.ts. The JSON wire format uses the
// frontend ids (snake_case of the member name: EnvId.Dub -> "dub", CallStatus.NeedsHuman -> "needs_human").
// Keep enum member names lower-case-equivalent of the frontend ids so the
// camelCase policy reproduces them exactly (e.g. Cxmgr -> "cxmgr").

/// <summary>Every user-facing string carries both languages (frontend "Bi").</summary>
public sealed record Bi(string En, string Ar);

public enum ProductId { Re, Af, Cl, To, Ev, Wl }

public enum ChannelId
{
    Website, App, Whatsapp, Call, Ivr, Branch, Email, Survey, Shopper,
    Club, Wallet, Events, Tours, Facebook, Instagram, Linkedin, Google,
    Googleplay, Appstore, Webcomment
}

public enum Severity { Critical, Medium, Low }

/// <summary>Dubai, Abu Dhabi, PSI Assets, PSI-AI: separate CRMs, same business.</summary>
public enum EnvId { Dub, Auh, Ast, Ai }

public enum PersonSegment { Lead, Buyer, Tenant, Owner, Investor, Member }

public enum LeadSource { App, Website, Whatsapp, Club, Crm }

/// <summary>Consent as held by the CRM. DNCR: no calls, no surveys by call.</summary>
public sealed record ConsentFlags(bool Dncr, bool Whatsapp, bool Sms, bool Email);

/// <summary>Environment scope for a query: one environment, or all of them.</summary>
public readonly record struct EnvScope(EnvId? Env)
{
    public static EnvScope All => new(null);
    public static EnvScope Of(EnvId env) => new(env);
    public bool Includes(EnvId env) => Env is null || Env == env;
}
