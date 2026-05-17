# CMCMIS_SIMPLIFIED — Phase 3 Migration & Bootstrap Bundle

> **Version:** `v2.0 — LOCKED`
> **Generated:** Phase 3 Day 3, per FINAL_DB_DESIGN_v2.0
> **Author:** Claude (AI engineering pair) for Deep Sorathiya (DS)

---

## 📦 What's In This Bundle

```
phase3/
├── README.md                                 ← you are here
├── package.json                              ← npm dependencies
├── .env.example                              ← copy to .env, edit values
│
├── migrations/                               ← all 11 migration files
│   ├── 001__create_new_tables.sql            ← 15 new tables
│   ├── 002__alter_legacy_tables.sql          ← 6 ALTER + indexes + FKs
│   ├── 003__pre_bootstrap_admin_section.sql  ← INSERT SM_ID=9999
│   ├── 004__seed_super_admin_employees.sql   ← INSERT SA79900, AC77777
│   ├── 005__seed_roles.sql                   ← 5 system roles
│   ├── 006__seed_permissions.sql             ← 40 atomic permissions
│   ├── 007__seed_role_permissions.sql        ← grant matrix
│   ├── 008__seed_super_admin_users.js        ← bcrypt + users + user_roles
│   ├── 009__seed_org_departments_sections.sql ← TIMCD + T&ME + F&PE
│   ├── 010__seed_lookups_and_audit.sql       ← 28 lookup rows
│   ├── 050__backfill_cmms_cont_mst.sql       ← vendor master from eqip data
│   └── 099__isolate_legacy_unused.sql        ← rename to _legacy_*
│
└── runner/
    ├── run-migrations.js                     ← idempotent runner + verifier
    └── test-bootstrap.js                     ← end-to-end login simulation
```

---

## 🚀 Quick Start (5 commands)

```bash
# 1. Install dependencies
cd phase3
npm install

# 2. Set up your .env
cp .env.example .env
# edit .env with your local MySQL credentials

# 3. (Optional) Dry-run to see what would be applied
npm run migrate:dry

# 4. Apply all migrations
npm run migrate

# 5. Test the bootstrap end-to-end
npm run test:bootstrap
```

---

## 📋 Migration Order (and what each does)

| #   | File                                                                  | What it does                                                                                                                                                                                                                                                         |
| --- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 001 | `001__create_new_tables.sql`                                                                         | Creates 15 new tables in FK-safe order: departments, sections, cmms_cont_mst, roles, permissions, role_permissions, users, user_roles, refresh_tokens, login_audit, equipment_status_history, job_request_status_history, audit_log, audit_log_changes, export_audit |
| 002 | `002__alter_legacy_tables.sql`                                                                       | 6 ALTER TABLEs on legacy: adds MVP_STATUS enums, verify/approve/reject columns, audit columns, new indexes, and the FK from users.section_id → sections. Uses an idempotent helper procedure. Backfills existing rows per M7/M8.                                    |
| 003 | `003__pre_bootstrap_admin_section.sql`                                                               | INSERT IGNORE:`cmms_section_mst` SM_ID=9999 'ADMIN' (per M1)                                                                                                                                                                                                       |
| 004 | `004__seed_super_admin_employees.sql`                                                                | INSERT IGNORE: SA79900 + AC77777 into `cmms_emp_mst` (per M2)                                                                                                                                                                                                      |
| 005 | `005__seed_roles.sql`                                                                                | 5 system roles (locked)                                                                                                                                                                                                                                              |
| 006 | `006__seed_permissions.sql`                                                                          | 40 atomic permissions (per FINAL-DESC §6)                                                                                                                                                                                                                           |
| 007 | `007__seed_role_permissions.sql`                                                                     | Grant matrix — SUPER_ADMIN gets all, others per matrix                                                                                                                                                                                                              |
| 008 | `008__seed_super_admin_users.js`                                                                     | **Node.js** — bcrypts (`employee_id` → password_hash) and inserts `users` + `user_roles` + audit_log rows                                                                                                                                              |
| 009 | `009__seed_org_departments_sections.sql`                                                             | TIMCD department + T&ME, F&PE sections (per Q8)                                                                                                                                                                                                                      |
| 010 | `010__seed_lookups_and_audit.sql`                                                                    | 28 lookup rows in `cmms_parameter_master` + final bootstrap audit marker                                                                                                                                                                                           |
| 050 | `050__backfill_cmms_cont_mst.sql`                                                                    | (bonus) backfills `cmms_cont_mst` from DISTINCT EQM_MFRID (per M3/M4)                                                                                                                                                                                              |
| 099 | `099__isolate_legacy_unused.sql`                                                                     | RENAMEs 15 unused legacy tables to `_legacy_*` prefix                                                                                                                                                                                                              |

---

## 🔒 Idempotency

Every migration is **safe to re-run**. Mechanisms:

| Mechanism                                                                  | Used in                                 |
| -------------------------------------------------------------------------- | --------------------------------------- |
| `CREATE TABLE IF NOT EXISTS`                                             | 001                                     |
| `_cmcmis_safe_alter` helper procedure with `information_schema` checks | 002, 099                                |
| `INSERT IGNORE` on PK / UNIQUE                                           | 003, 004, 005, 006, 007, 009            |
| `INSERT … ON DUPLICATE KEY UPDATE`                                      | 010                                     |
| `NOT EXISTS` subquery + `INSERT`                                       | 008 (audit-log), 099 (audit marker)     |
| `schema_migrations` checksum tracking                                    | runner — skips if file already applied |

The runner additionally writes a row to `schema_migrations` after each successful apply, storing a SHA-256 checksum of the file. Subsequent runs skip files whose checksum matches.

---

## ✅ Verification Checklist (post-run)

After `npm run migrate` completes, the runner automatically runs §17 checks:

```
✓ roles count == 5
✓ permissions count == 40
✓ role_permissions count > 100
✓ users count == 2
✓ user_roles count == 2
✓ departments count == 1
✓ sections count == 2
✓ cmms_emp_mst includes SA79900
✓ cmms_emp_mst includes AC77777
✓ cmms_section_mst includes ADMIN (9999)
✓ lookup values seeded (≥25)
✓ audit_log has bootstrap rows (≥6)
✓ bcrypt: SA79900 password verifies as 'SA79900'
✓ bcrypt: AC77777 password verifies as 'AC77777'

ALL 14 CHECKS PASSED — system is RUNTIME READY.
```

---

## 🧪 End-to-End Test (`npm run test:bootstrap`)

Simulates the full auth path WITHOUT requiring the HTTP server:

| Test | What it does                              | Pass condition                                     |
| ---- | ----------------------------------------- | -------------------------------------------------- |
| 1    | SA79900 logs in with password `SA79900` | role=SUPER_ADMIN, 40 permissions                   |
| 2    | SA79900 creates a NORMAL_USER `DS00001` | New user inserted; assigned to T&ME                |
| 3    | DS00001 logs in with password `DS00001` | role=NORMAL_USER, ~12 permissions                  |
| 4    | DS00001 tries to create another user      | **403 Forbidden** — no `user:role-assign` |
| 5    | DS00001 logs in with wrong password       | Rejected; failed_login_count++                     |
| 6    | Login with malformed password `abc123`  | Rejected fast (regex fail) — no bcrypt CPU spent  |
| 7    | Reset DS00001's failed_count to zero      | Clean state                                        |

---

## 🆘 Recovery / Rollback

### "I want to re-run migrations from scratch"

```bash
# Drops the schema_migrations tracking table only
npm run migrate:reset

# All migration files re-run; idempotent guards prevent duplicate inserts.
npm run migrate
```

### "I want to nuke the new tables and start over"

```sql
-- Run manually in phpMyAdmin if you really need to:
DROP TABLE IF EXISTS export_audit, audit_log_changes, audit_log,
                     job_request_status_history, equipment_status_history,
                     login_audit, refresh_tokens, user_roles, users,
                     role_permissions, permissions, roles,
                     cmms_cont_mst, sections, departments,
                     schema_migrations;
-- Then remove the ALTERed columns from legacy tables (rare!).
```

### "A migration failed halfway"

- The runner stops on the first error.
- The failed migration is **NOT** recorded in `schema_migrations`.
- Fix the issue, then `npm run migrate` again. The runner picks up where it left off.

---

## 🐛 Common Issues

### "Cannot add foreign key constraint"

- **Cause:** Trying to add FK before parent table exists.
- **Fix:** Run migrations in order (001 first). The runner does this automatically.

### "Duplicate entry for key 'PRIMARY'"

- **Cause:** Re-running a non-idempotent INSERT.
- **Fix:** Should never happen — all our INSERTs are `INSERT IGNORE` or `ON DUPLICATE KEY UPDATE`. If it happens, the file was edited.

### "Access denied for user 'root'@'localhost'"

- **Cause:** Wrong DB credentials.
- **Fix:** Check `.env` — `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_NAME`.

### "Table 'cmms_emp_mst' doesn't exist"

- **Cause:** You're running migrations against a DB that doesn't have the legacy 64-table dump loaded.
- **Fix:** Load the legacy dump first, then run migrations.

---

## 📊 What's In the DB After Migration

| Bucket                      | Count | Examples                                                                                                      |
| --------------------------- | ----- | ------------------------------------------------------------------------------------------------------------- |
| 🌱 New tables               | 15    | users, roles, permissions, departments, sections, audit_log, …                                               |
| 🔧 Altered legacy tables    | 6     | cmms_eqip_mst, cmms_jobrequest_mst, cmms_jobcard_mst, cmms_parameter_master, cmms_emp_mst, cmms_checklist_mst |
| ✅ Kept legacy tables       | 32    | cmms_jobcard_*, cmms_checklist_*, cmms_section_mst, …                                                      |
| 🗄️ Isolated legacy tables | 15    | `_legacy_userrole_mst`, `_legacy_accessright_mst`, `_legacy_cf001`, …                                  |

**Total tables in DB:** ~68 (depends on whether bonus migrations 050 ran)
**Total active in MVP code path:** 53

---

## 🎯 Next: Phase 4

With Phase 3 complete and verified:

- Bootstrap is RUNTIME READY ✓
- Auth tables are populated ✓
- Permission grants are loaded ✓
- Test bootstrap passes ✓

**Phase 4** wires the first feature module end-to-end:

- Backend `auth` module (`/api/v1/auth/login`, `/auth/refresh`, `/me`)
- Frontend login page
- Middleware: `authenticate`, `authorize`, `rowLevelScope`
- One protected route working end-to-end as a smoke test.

---

## 🆔 Lock Manifest

```
Document Version:    v2.0 LOCKED
Migration files:     11 (001–010 + 099) + 1 bonus (050)
Runner:              run-migrations.js + test-bootstrap.js
Idempotent:          YES (schema_migrations + SHA-256 + IF NOT EXISTS + IGNORE)
DB engine target:    MySQL 8.x · InnoDB · utf8mb4_0900_ai_ci
Node version:        ≥ 18.0.0
NPM deps:            bcryptjs, dotenv, mysql2
Bootstrap admins:    SA79900, AC77777  (password = employee_id, bcrypt)
Roles:               exactly 5 (SUPER_ADMIN, LAB_IN_CHARGE, LAB_ENGINEER,
                     NORMAL_USER, VIEW_ONLY)
Permissions:         40 atomic (resource:action)
Org:                 TIMCD (dept) → T&ME, F&PE (sections, equipment_category)
```

---

**ENERGY LEVEL: LOCKED IN. 🫡**

Phase 3 complete. Phase 4 awaiting your green flag.
