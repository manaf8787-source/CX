# PSI CX Portal: backend

.NET 8 solution. Contract: `React-Frontend/src/types` (JSON uses the frontend ids and camelCase).

| Project | Role |
|---|---|
| `PsiCx.Domain` | Types shared with the frontend contract (ids, roles, Bi, consent) and the JSON setup |
| `PsiCx.Rules` | Pure rules engine, ported from `React-Frontend/src/utils` with the frontend's test cases as vectors |
| `PsiCx.Application` | Use cases and the interfaces for everything external (clock, database, connectors) |
| `PsiCx.Infrastructure` | EF Core, connectors, email/SMS; sample-data adapters first |
| `PsiCx.Api` | ASP.NET Core Web API, `/api/v1`, Swagger in Development |
| `PsiCx.Tests` | xUnit |

Run: `dotnet restore && dotnet test && dotnet run --project src/PsiCx.Api`, then open `/swagger` and `/api/v1/health`.

Rules: the portal never writes into the CRM, Odoo or the call center; every external system sits behind an interface; no feature depends on a specific database engine.
