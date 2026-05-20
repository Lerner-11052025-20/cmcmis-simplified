---
name: cmcmis-phase14-delivered
description: "Phase 14 — Audit Log Viewer shipped 2026-05-22. Strictly read-only viewer over audit_log + user_role_history + status-history tables. 3 source tabs, deep-link, JSON pretty-print, CSV export. 20/20 smoke green."
metadata: 
  node_type: memory
  type: project
  originSessionId: a284e8c9-d46c-4bc6-801c-26b9391c0602
---

# CMCMIS Phase 14 — Audit Log Viewer DELIVERED (2026-05-22)

A new "Admin · Audit Log" sidebar entry for Super Admin, backed by a strictly READ-ONLY viewer over the existing audit + history tables. No new write tables, no ALTER on any sealed schema.

## Sidebar wiring

Added to [lib/permissions.js](SOFTWARE CODE/FE/src/lib/permissions.js) under the Admin section:

```js
{ label: 'Admin · Audit Log', to: '/audit', icon: ScrollText, requires: 'audit:read-list' }
```

Gated on the new `audit:read-list` permission (mig 600). Auto-hidden for every role except SUPER_ADMIN via `visibleNavItems()`.

## Permissions (2 new codes — mig 600)

- `audit:read-list` — view the page + lists + detail + filter dropdowns
- `audit:export` — download filtered audit data as CSV (row-capped)

Default grants: **SUPER_ADMIN only** (per the user's "AS SUPER ADMIN" mandate). The legacy `audit_log:read` (mig 006) is left in place but no longer consulted by the FE.

## Tables touched (READ-ONLY)

| Table | Used as | Status |
|-------|---------|--------|
| `audit_log` | `source='audit_log'` (All Actions) | sealed in mig 010, 127 rows at delivery |
| `user_role_history` | `source='identity'` (Identity & Access) | sealed in mig 112, 17 rows |
| `job_request_status_history` | `source='transitions'` (UNION) | sealed in mig 100, 91 rows |
| `job_card_status_history` | `source='transitions'` (UNION) | sealed in mig 300, 11 rows |
| `schedule_status_history` | `source='transitions'` (UNION) | added in mig 500, 7 rows |

Zero schema changes. All existing indexes (idx_al_action, idx_al_actor, idx_al_entity, idx_al_time, idx_urh_*, idx_jrsh_*, idx_jcsh_*, idx_sched_hist_schedule) already cover the viewer's filter shapes.

## Backend endpoints (all GET — `/api/v1/audit`)

- `GET /` — paginated list. Query: `source, from, to, actor, action, entityType, entityId, q, page, page_size`. Returns `{ items, pagination, source, applied_filters }`.
- `GET /filters?source=` — distinct actions + entityTypes for the dropdowns (15-min in-process cache per source).
- `GET /export?source=…` — streamed CSV with `X-Export-Rows` + `X-Export-Capped` headers. Capped at 5000 rows.
- `GET /:id?source=&subSource=` — single-row detail with notes parsed as JSON when possible (falls back to raw text or "no details captured").

All gated by `authorize('audit:read-list')` except `/export` which uses `audit:export`. Validators in [audit.validators.js](SOFTWARE CODE/BE/src/modules/audit/audit.validators.js) reject unknown keys (`.strict()`).

## Frontend

- [AuditViewer.jsx](SOFTWARE CODE/FE/src/pages/audit/AuditViewer.jsx): source tabs (All Actions / Identity & Access / Status Transitions) + filter strip (date range, actor, action dropdown, entity-type dropdown, entity-id exact, free-text) + DataTable + Pagination + Refresh + Export CSV. Filter state syncs to URL search params for shareable links.
- [AuditDetailDrawer.jsx](SOFTWARE CODE/FE/src/pages/audit/AuditDetailDrawer.jsx): right-slide drawer with Who / What / Where / Transition (from→to pills) / Details (JSON pretty-print or fallback text). Renders a deep-link icon on entity_id when one exists. ZERO mutation controls.
- [lib/api/audit.js](SOFTWARE CODE/FE/src/lib/api/audit.js) + [lib/hooks/useAuditLog.js](SOFTWARE CODE/FE/src/lib/hooks/useAuditLog.js).

## Smoke matrix — 20/20 GREEN

`node db/discovery/smoke_phase14.js` → all green:

- A1 newest-first list shape
- A2–A5 filters: actor / action / entityType / entityId narrow correctly
- A6 free-text `q` (case-insensitive, LIKE-wildcard-escaped)
- A7 source=identity hits user_role_history (entity_type=user)
- A8 source=transitions UNION yields mixed sub_source (job_request + job_card + schedule)
- A9 detail returns notes_json/notes_text + transitions `from→to`
- A10 /filters returns actions + entityTypes
- A11 CSV export streams `Timestamp,Source,Action,...` header + N data rows
- A12 RBAC: anon→401, View-Only→403, SA→200
- A13 pagination math (`total_pages = ceil(total/page_size)`)
- A14 page 1 ≠ page 2 (no dedup bug)
- A15 **READ-ONLY proof: all 5 source table row counts UNCHANGED before/after smoke**
- A16 cross-check API row #127 against direct SELECT on audit_log

## Locked design decisions

- **P14-D1**: `audit_log` has NO before/after columns — only `notes` (JSON string written by each module's `writeAuditLog`). The detail drawer renders it as `notes_json` (parsed) or `notes_text` (fallback for legacy/non-JSON rows). For status-history sources the implicit before/after IS the `from_status → to_status` pair.
- **P14-D2**: 3 source tabs map to 3 different SQL queries — repo aliases each table's PK + time column to a uniform canonical `{ id, occurred_at, action, entity_type, entity_id, actor_employee_id, actor_name, ... }` shape.
- **P14-D3**: 'transitions' tab is a UNION ALL of job_request_status_history + job_card_status_history + schedule_status_history. Each row carries a `sub_source` discriminator so the detail endpoint knows which underlying table to query (O(1) lookup instead of trying all three).
- **P14-D4**: actor name resolution is a LEFT JOIN to `cmms_emp_mst.EMM_NAME` (varchar PK). For user_role_history (which keys on bigint user_id) we hop through `users.employee_id` first.
- **P14-D5**: free-text `q` filter ESCAPES SQL LIKE wildcards. The escape character is `|` (NOT `\`) because MariaDB's default sql_mode treats `\` as a C-style escape inside string literals — `ESCAPE '\\'` is parsed as `ESCAPE '\'` and breaks the statement (1064). Locked rule: **use `|` for SQL LIKE escapes on this server**.
- **P14-D6**: LIKE matches are case-insensitive by virtue of the `utf8mb4_unicode_ci` collation. Documented in the smoke test (A6 uses `/JR_/i`).
- **P14-D7**: filter dropdowns (`/audit/filters`) use a 15-min in-process cache per source. The universe of action codes is bounded (~50) and a per-page-load refetch is wasteful.
- **P14-D8**: CSV export is server-row-capped at 5000 (`HARD_ROW_CAP`). Response includes `X-Export-Rows` and `X-Export-Capped` headers; the FE pops an alert when capped.
- **P14-D9**: NO new audit row is written for read/export actions. This module is the one place in the codebase that explicitly does NOT extend the audit_log on action — recursion would be confusing and useless.
- **P14-D10**: legacy `audit_log:read` permission (mig 006) is kept but the FE has migrated to `audit:read-list` (mig 600) for Phase-13 naming consistency. The placeholder `/audit` route in App.jsx is now replaced with the real `<AuditViewer />`.

## Files touched / added

- BE migration: `600__phase14_audit_permissions.sql`
- BE module: `src/modules/audit/{validators, repo, service, controller, routes}.js`
- BE server: `src/server.js` mounts `/audit` AFTER `/procurement`
- FE: `lib/api/audit.js`, `lib/hooks/useAuditLog.js`
- FE pages: `pages/audit/{AuditViewer, AuditDetailDrawer}.jsx`
- FE wiring: `lib/permissions.js` (+ ScrollText nav item), `App.jsx` (route now real)
- Smoke: `db/discovery/smoke_phase14.js` (20 checks)

## How to re-run

```bash
# Apply migration (idempotent)
cd "SOFTWARE CODE/DATABASE/phase3" && node runner/run-migrations.js

# Server reloads automatically on nodemon; otherwise:
cd "SOFTWARE CODE/BE" && npm run dev

# Smoke
cd "SOFTWARE CODE/BE" && node db/discovery/smoke_phase14.js
```
