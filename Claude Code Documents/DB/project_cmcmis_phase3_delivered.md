---
name: project-cmcmis-phase3-delivered
description: "Phase 3 COMPLETE 2026-05-17 — PHASE3_COMPLETE_v2.0 bundle delivered: 16 files / ~2,800 lines / 12 migrations + Node runner + 7-test E2E + README. DB is RUNTIME READY."
metadata: 
  node_type: memory
  type: project
  originSessionId: 4365bcb1-7e07-4521-8da8-e6524359a964
---

**Document:** `PHASE3_COMPLETE_v2.0` — Phase 3 closed on 2026-05-17. Subordinate to FINAL-DESC-CMCMIS v1.0 (behaviour) and FINAL_DB_DESIGN_v2.0 (schema). State = 🟢 RUNTIME READY.

## Bundle Layout — ACTUAL ON DISK

Lives under `e:/SOFTWAREs By DS/cmcmis-simplified/SOFTWARE CODE/DATABASE/` (NOT `phase3/` as the doc shorthand suggested). Split into 3 sibling folders:

```
SOFTWARE CODE/DATABASE/
├── PHASE3_COMPLETE_v2.0.md     (48 KB — the spec doc)
├── migrations/                 (12 SQL+JS files)
│   ├── 001__create_new_tables.sql           (29 KB)
│   ├── 002__alter_legacy_tables.sql         (15 KB)
│   ├── 003__pre_bootstrap_admin_section.sql (1.4 KB)
│   ├── 004__seed_super_admin_employees.sql  (3.2 KB)
│   ├── 005__seed_roles.sql                  (1.5 KB)
│   ├── 006__seed_permissions.sql            (7.6 KB)
│   ├── 007__seed_role_permissions.sql       (6.9 KB)
│   ├── 008__seed_super_admin_users.js       (5.3 KB)
│   ├── 009__seed_org_departments_sections.sql (4.1 KB)
│   ├── 010__seed_lookups_and_audit.sql      (6.6 KB)
│   ├── 050__backfill_cmms_cont_mst.sql      (5.4 KB)
│   └── 099__isolate_legacy_unused.sql       (5.3 KB)
├── runner/
│   ├── run-migrations.js       (16 KB)
│   └── test-bootstrap.js       (13 KB)
└── phase 3/                    (⚠️ folder name has a space)
    ├── README.md               (9.7 KB)
    ├── package.json            (737 B)
    └── .env.example            (2.0 KB)
```

**Run from:** `cd "SOFTWARE CODE/DATABASE/phase 3" && npm install && npm run migrate` — but note that `package.json` references migrations + runner via relative paths; verify the script paths resolve to `../migrations` and `../runner` before first run.

## Bundle Layout — as doc-spec described (for reference)

```
phase3/
├── README.md                   (250 lines)
├── package.json                (npm deps + scripts)
├── .env.example                (config template)
├── migrations/                 (12 files, run alphabetically)
│   ├── 001__create_new_tables.sql               (431 lines, 15 NEW tables, FK-safe order)
│   ├── 002__alter_legacy_tables.sql             (307 lines, 6 ALTERs + _cmcmis_safe_alter proc + M7/M8 backfills + users.section_id FK deferred from 001)
│   ├── 003__pre_bootstrap_admin_section.sql     (49 lines, M1: SM_ID=9999 ADMIN section)
│   ├── 004__seed_super_admin_employees.sql      (97 lines, M2: SA79900+AC77777 into cmms_emp_mst, EMM_DEPT=9999)
│   ├── 005__seed_roles.sql                      (29 lines, 5 roles hard-coded IDs 1..5)
│   ├── 006__seed_permissions.sql                (73 lines, 40 atomic resource:action perms)
│   ├── 007__seed_role_permissions.sql           (126 lines, ~110 grant rows; SUPER_ADMIN auto-derived from SELECT)
│   ├── 008__seed_super_admin_users.js           (142 lines, bcryptjs hash + INSERT users + user_roles + 6 audit_log rows + round-trip sanity check)
│   ├── 009__seed_org_departments_sections.sql   (84 lines, TIMCD + T&ME + F&PE; head_employee_id=NULL per M9)
│   ├── 010__seed_lookups_and_audit.sql          (91 lines, 28 lookups across 6 categories + BOOTSTRAP_COMPLETE audit marker)
│   ├── 050__backfill_cmms_cont_mst.sql          (101 lines, M3/M4 vendor backfill from DISTINCT EQM_MFRID, foreign_key_checks=0 wrap)
│   └── 099__isolate_legacy_unused.sql           (103 lines, RENAME TABLE 15 legacy tables → _legacy_* via _cmcmis_safe_rename proc)
└── runner/
    ├── run-migrations.js       (351 lines, orchestrator + 14-check verifier)
    └── test-bootstrap.js       (324 lines, 7 E2E auth sims, DB-only no HTTP)
```

**Total: 16 files / ~2,800 lines.**

## npm Configuration

```json
{
  "dependencies": {
    "bcryptjs": "^2.4.3",
    "dotenv": "^16.4.5",
    "mysql2": "^3.11.0"
  },
  "scripts": {
    "migrate":          "node runner/run-migrations.js",
    "migrate:dry":      "node runner/run-migrations.js --dry-run",
    "migrate:status":   "node runner/run-migrations.js --status",
    "migrate:reset":    "node runner/run-migrations.js --reset",
    "test:bootstrap":   "node runner/test-bootstrap.js"
  }
}
```

Node ≥ 18.0.0. Target DB: MySQL 8.x · InnoDB · utf8mb4_0900_ai_ci.

## Runner Architecture (run-migrations.js)

1. Loads `.env` → CFG (host/port/user/pwd/db/BCRYPT_ROUNDS/SUPER_ADMIN_EMPLOYEE_IDS)
2. `mysql2/promise.createConnection({ multipleStatements: true })`
3. Ensures `schema_migrations` table (PK migration_id, sha256, applied_at, duration_ms)
4. Lists migration files alphabetically
5. **Per file:** sha256(buf) → check `schema_migrations` → SKIP if checksum matches; WARN if changed since apply; otherwise apply (`.sql` → conn.query, `.js` → require + mod.up(conn, env)); record applied
6. Auto-runs 14-check verification suite; exits 1 if any check fails

## 14-Check Verification Suite (auto-run after `npm run migrate`)

| # | Check | Expected |
|---|---|---|
| 1 | `roles` count | == 5 |
| 2 | `permissions` count | == 40 |
| 3 | `role_permissions` count | > 100 |
| 4 | `users` count | == 2 |
| 5 | `user_roles` count | == 2 |
| 6 | `departments` where code='TIMCD' | == 1 |
| 7 | `sections` where code IN (TME, FPE) | == 2 |
| 8 | `cmms_emp_mst` has SA79900 | == 1 |
| 9 | `cmms_emp_mst` has AC77777 | == 1 |
| 10 | `cmms_section_mst` has SM_ID=9999 | == 1 |
| 11 | Lookup rows (CategoryID 100..199) | ≥ 25 |
| 12 | `audit_log` BOOTSTRAP rows | ≥ 6 |
| 13 | **bcrypt round-trip SA79900** | TRUE |
| 14 | **bcrypt round-trip AC77777** | TRUE |

## 7 E2E Tests (test-bootstrap.js — DB-only, no HTTP)

1. SA79900 login with password 'SA79900' → role=SUPER_ADMIN, 40 perms
2. SA79900 creates NORMAL_USER 'DS00001' (with pre-step INSERT into cmms_emp_mst as 'Deep Sorathiya')
3. DS00001 login with password 'DS00001' → role=NORMAL_USER, ~12 perms
4. DS00001 tries to create user → DENIED (no `user:role-assign` permission) — 403 simulation
5. DS00001 wrong password 'WX99999' → bcrypt fail + failed_login_count++ + FAILED_BAD_PASSWORD audit
6. Malformed password 'abc123' → regex rejects before bcrypt + FAILED_INVALID_FORMAT audit
7. Cleanup: reset DS00001 failed_login_count=0

## 5 Layers of Idempotency

1. **Runner-level:** `schema_migrations` + SHA-256 checksum; re-runs skip
2. **SQL-level:** `CREATE TABLE IF NOT EXISTS`, `INSERT IGNORE`, `INSERT ... ON DUPLICATE KEY UPDATE`, `NOT EXISTS` subqueries
3. **ALTER-level:** `_cmcmis_safe_alter` checks `information_schema` before ADD COLUMN/INDEX/FK
4. **JS-level:** 008 checks `users.employee_id` existence before INSERT
5. **Backfill-level:** 002 backfills only WHERE current value matches default; 050 INSERTs only DISTINCT

## 5-Step Quickstart

1. Load 64-table dump: `CREATE DATABASE cmcmis_redev … utf8mb4_0900_ai_ci; mysql … < cmcmis_schema_only.sql`
2. `cd phase3 && npm install`
3. `cp .env.example .env` → edit DB creds; NODE_ENV=development → BCRYPT_ROUNDS=10
4. `npm run migrate` (apply + auto-verify)
5. `npm run test:bootstrap` (7 E2E tests)

## Phase 4 Smoke-Test Gate (what proves Phase 4 auth is wired)

- Open browser → /login
- Enter SA79900 / SA79900 → JWT issued, redirect /dashboard
- Sidebar shows ALL menu items (Super Admin perms)
- Open /admin/users → see SA79900 + AC77777
- "Add User" → DS00001 / NORMAL_USER → success
- Logout → login as DS00001 → only Dashboard + limited sidebar items
- Open /admin/users directly → HTTP 403 Forbidden ✅

## What's NEXT (Phase 4)

See [[project-cmcmis-next-phase-code]] (updated 2026-05-17 to reflect Phase 3 done).

Auth module wired end-to-end:
- BE: `modules/auth/{controller,service,repo,validators}.js`, `modules/auth/refresh-tokens.repo.js`, `modules/auth/login-audit.repo.js`, `middleware/{authenticate,authorize,rate-limit}.js`, `modules/users/users.controller.js` (GET /api/v1/me)
- FE: login page, auth-context, protected-route, api-client with axios interceptors

> ⚠️ Phase 3 doc casually uses `.tsx` in the FE plan; per D1 this project is **JavaScript + JSDoc + Zod (NOT TypeScript)** — files are `.jsx`, not `.tsx`. D1 wins.

See [[project-cmcmis-db-v2-locked]] (the schema), [[project-cmcmis-db-v2-migration-answers]] (M1-M12), [[project-cmcmis-tech-stack]] (lib choices), [[feedback-code-style-high-comments]] (Phase 4 comment mandate).
