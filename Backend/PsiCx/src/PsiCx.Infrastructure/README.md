Infrastructure: database (EF Core, provider chosen with the CTO), connectors (Meta, CRM, Odoo, call center, DNCR),
email/SMS, secrets. Every external system sits behind an interface declared in PsiCx.Application; the first
implementations are sample-data adapters, replaced one by one. The portal never writes into the CRM, Odoo or the call center.
