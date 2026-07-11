---
name: project-cmcmis-constraints
description: "CMCMIS hard constraints — infra, storage, email, cache, deployment, existing DB context"
metadata: 
  node_type: memory
  type: project
  originSessionId: b9863bb4-3873-480d-9bae-b15d6a527c82
---

**Hard infrastructure & scope constraints — confirmed by user.**

| # | Constraint | Decision |
|---|---|---|
| 1 | **Organization context** | ISRO SAC-like government / technical / defence-grade environment |
| 2 | **Existing DB** | ~64 tables already exist with records. Some are stale / not needed. To be **reviewed in Phase 3 (DB Design)**. We're refactoring/extending, not starting from zero. |
| 3 | **SSO in v1** | ❌ NO. Use employee_id login with passwords from existing organizational DB. SSO/AD integration is FUTURE. Architecture must be SSO-ready. |
| 4 | **Deployment target** | Internal on-prem / org private infra. NOT public cloud (AWS/Azure/GCP). |
| 5 | **File storage** | ❌ NO file storage. PDFs are generated and downloaded on-demand only. Do NOT design upload/attachment storage. |
| 6 | **Email / SMTP** | ❌ NO emails in v1. |
| 7 | **Redis / cache layer** | ❌ NO. Use optimized SQL queries + pagination + MySQL connection pooling only. |
| 8 | **Backup infra** | ❌ Not in scope. (User said "no" — we will not architect backups; user will handle separately if needed.) |
| 9 | **Mobile / tablet UI** | ❌ NO. Desktop + laptop only. BUT the UI must be fully responsive across desktop/laptop viewport sizes. |
| 10 | **Barcode / QR** | ❌ NO. Not in scope. |
| 11 | **PDF generation** | ✅ YES — calibration certificates etc, formatted PDFs. Generated + downloaded only (no storage). |
| 12 | **Sensitive data handling** | Defence/space-grade. Enforce: role-based access, row-level visibility (division/lab scoping), secure sessions, limited exports. |
| 13 | **Compliance specifics** | NABL/ISO 17025/AS9100/cert templates/report formats/retention policy — user will instruct WHEN/IF needed. Do NOT pre-architect. |
| 14 | **Notification channels** | TBD — user will instruct later. NOT in MVP scope. |

**Why:** All these are user-decided product/infra constraints. Each "no" here actively prevents scope creep. Each "yes" is a hard requirement.

**How to apply:**
- Don't propose features that contradict this list (e.g., "let's add Redis" — NO).
- When in doubt about infra, default to the simplest MySQL-only path.
- When in doubt about compliance/format, ASK the user — don't assume.
- The existing 64-table DB is critical context; do not draft schema until we've reviewed what's already there in Phase 3.

See [[project-cmcmis-overview]], [[project-cmcmis-mvp-scope]], [[project-cmcmis-tech-stack]].
