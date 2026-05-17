---
name: project-cmcmis-modules-roles
description: "CMCMIS — 9 modules, 5 roles (NO Admin role), 3-layer RBAC, JWT+refresh, NO SSO in v1, equipment:create open to all roles except View-Only"
metadata:
  node_type: memory
  type: project
  originSessionId: b9863bb4-3873-480d-9bae-b15d6a527c82
---

**9 Modules** (per Module Architecture Map):
1. **Dashboard** — read-only aggregator (KPIs, alerts) — *MVP*
2. **Job Requests** — intake (Normal User → Lab In-charge) — *MVP*
3. **Job Cards** — work execution (Lab Engineer, Lab In-charge) — *MVP*
4. **Equipment** — asset master, all roles except View-Only can REGISTER — *MVP*
5. **Schedule** — PM + Calibration calendar — *Phase 2 (post-internship)*
6. **Procurement** — POs + spare parts — *Phase 2*
7. **Vendors** — master data — *Phase 2*
8. **Inquiry** — read-only search hub — *MVP*
9. **Reports** — analytical layer — *Phase 2*
10. **Admin** — master data CRUD + user/role management — *Phase 2 for master-data CRUD; Super Admin RBAC actions exist even in MVP*

**5 Roles ONLY** (hierarchy, top to bottom). User explicitly DELETED the separate "Admin" role — Super Admin is the only admin tier.
- Super Admin — assigns roles, ultimate authority, owns all master data
- Lab In-charge — approves jobs, schedules, verifies/closes job cards
- Lab Engineer — executes jobs, fills cards
- Normal User — raises requests
- View-Only User — read-only

**IMPORTANT — `equipment:create` override:**
ALL roles EXCEPT View-Only can register a new equipment.
✅ Super Admin, Lab In-charge, Lab Engineer, Normal User
❌ View-Only only

**First Super Admin bootstrap:** Seeded via DB migration. The migration inserts one super-admin record using the configured employee_id (no manual SQL needed at deploy).

**RBAC — three layers:**
`USER → ROLE → PERMISSION → RESOURCE+ACTION`
Permissions are granular: `job_request:create`, `equipment:update`, `audit_log:read`, etc.

**Auth flow:**
- v1: employee_id + password (bcrypt hash check vs `users` table — pulled from the existing organizational DB context).
- Future: Active Directory / SSO integration (NOT in MVP scope, but architecture must be SSO-ready).
- Lookup user → check active → fetch user_roles join → if no role assigned, auto-provision as "Normal User".
- Issue JWT (employee_id, role(s), permissions, exp=15min) + httpOnly refresh cookie (7 days).
- Super Admin must explicitly assign elevated roles; role assignments persist in DB.

**Critical State Machines** (enforced at DB + API layers, not just UI):
- Job Request: DRAFT → SUBMITTED → ASSIGNED → IN-PROGRESS → COMPLETED → VERIFIED/CLOSED (with REJECTED, REOPENED branches)
- Equipment: REGISTERED → ACTIVE → {UNDER_CALIBRATION, UNDER_REPAIR, OUT_OF_TOLERANCE, QUARANTINED} → ACTIVE | CONDEMNED/RETIRED

**How to apply:**
- Every write API must check both role AND fine-grained permission.
- State transitions must be enforced via a single `transition()` function per entity — never let arbitrary status updates happen.
- Audit log every state transition + every permission-gated action.
- Default-deny in middleware; whitelist permissions per route.
- Sensitive domain (defence/space-grade): enforce row-level visibility (division/lab scoping), secure sessions, limited exports.

See [[project-cmcmis-overview]], [[project-cmcmis-tech-stack]], [[project-cmcmis-mvp-scope]], [[project-cmcmis-constraints]].
