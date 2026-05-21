---
name: project-cmcmis-db-v2-locked
description: "FINAL_DB_DESIGN_v2.0 LOCKED 2026-05-17 — two-universe strategy, 53 active MVP tables (15 new + 6 alter + 32 keep) + 26 isolated _legacy_*, fresh auth stack, password ^[A-Z]{2}[0-9]{5}$ bcrypt-12 lifetime"
metadata: 
  node_type: memory
  type: project
  originSessionId: 4365bcb1-7e07-4521-8da8-e6524359a964
---

**Document:** `FINAL_DB_DESIGN_v2.0` — LOCKED on 2026-05-17. Supersedes v1.0 entirely. Subordinate only to FINAL-DESC-CMCMIS v1.0; any other interim drafts → defer to v2.0 for DB. Authority chain: FINAL-DESC v1.0 > FINAL_DB_DESIGN v2.0 > all other docs.

## Two-Universe Strategy (ADR-DB-01)

```
LEGACY UNIVERSE (cmms_*)        ←coexist→        MVP UNIVERSE (snake_case)
~60 tables · 390,000 rows                         15 new tables · 0 rows initially
Untouched data integrity                          Clean modern schema
Read-mostly for MVP                               Read/write hot path
FK targets preserved                              FK references both worlds
```

MVP runtime reads BOTH universes; writes ONLY to MVP tables + controlled ALTERs on legacy.

## Final Totals (locked)

| Bucket | Count |
|---|---|
| 🌱 NEW (active MVP) | 15 |
| 🔧 ALTER (active MVP) | 6 |
| ✅ KEEP (active MVP) | 32 |
| **Total active MVP runtime** | **53** |
| 🗄️ ISOLATE (renamed _legacy_*) | 26 |
| **GRAND TOTAL after Phase 3** | **79** |

## The 15 NEW Tables (snake_case)

| # | Table | Cluster |
|---|---|---|
| 1 | `users` | 1 Identity |
| 2 | `roles` | 1 Identity (5 seed rows: SUPER_ADMIN, LAB_IN_CHARGE, LAB_ENGINEER, NORMAL_USER, VIEW_ONLY) |
| 3 | `permissions` | 1 Identity (~40 seed rows, resource:action) |
| 4 | `role_permissions` | 1 Identity (~110 grant rows) |
| 5 | `user_roles` | 1 Identity (PK on user_id alone → enforces BR-RBAC-02 one-role-per-user) |
| 6 | `refresh_tokens` | 1 Identity (SHA-256 hash; raw never stored, ADR-DB-09) |
| 7 | `login_audit` | 1 Identity (every attempt, BR-AUTH-06) |
| 8 | `departments` | 2 Organisation (seed: TIMCD) |
| 9 | `sections` | 2 Organisation (seed: T&ME, F&PE under TIMCD; equipment_category ENUM('TME','FPE')) |
| 10 | `cmms_cont_mst` | 3 Equipment (NAMED WITH cmms_ PREFIX per ADR-DB-06 so legacy FKs auto-resolve) |
| 11 | `equipment_status_history` | 3 Equipment (separate from cmms_division_hist; Q5 locked) |
| 12 | `job_request_status_history` | 4 Job (separate from cmms_jobcard_status_hist; Q6 locked) |
| 13 | `audit_log` | 10 Audit (generic write-op audit) |
| 14 | `audit_log_changes` | 10 Audit (field-level before/after diffs) |
| 15 | `export_audit` | 10 Audit (PDF + future Excel exports) |

## The 6 ALTERed Tables (legacy KEEP + new columns)

| Table | Adds |
|---|---|
| `cmms_emp_mst` | INDEX idx_emm_active only |
| `cmms_eqip_mst` | EQM_VERIFIED_BY, EQM_VERIFIED_ON, **EQM_MVP_STATUS ENUM** (PENDING_VERIFICATION default per D10), EQM_MVP_STATUS_AT, EQM_SECTION_ID FK→new sections; 5 indexes |
| `cmms_jobrequest_mst` | **JR_MVP_STATUS ENUM** (DRAFT/SUBMITTED/ASSIGNED/IN_PROGRESS/COMPLETED/VERIFIED_CLOSED/REJECTED/REOPENED), JR_APPROVED_BY/ON, JR_REJECTED_BY/ON/REASON, JR_PRIORITY ENUM, JR_ASSIGNED_ENGINEER |
| `cmms_jobcard_mst` | **JM_MVP_STATUS ENUM** (ASSIGNED/IN_PROGRESS/COMPLETED/VERIFIED_CLOSED/REOPENED), JM_VERIFIED_BY/ON, JM_REOPENED_REASON |
| `cmms_parameter_master` | ADD PK (CategoryID, SrID), is_active, display_order, audit columns |
| `cmms_checklist_mst` | audit columns |

## Naming Conventions

| Layer | Convention |
|---|---|
| NEW tables | `snake_case`, plural for entities (`users`, `permissions`), singular for junctions (`user_roles`, `role_permissions`), suffix `_history` / `_audit` |
| NEW columns | `snake_case` (`employee_id`, `created_at`) |
| LEGACY tables | kept as-is for FK compatibility |
| LEGACY ALTER columns | match existing UPPER_PREFIX style (e.g., `EQM_VERIFIED_BY`) |
| ONE EXCEPTION | `cmms_cont_mst` keeps cmms_ prefix even though NEW — because 4 legacy FKs already reference it by that name (ADR-DB-06) |
| PKs | BIGINT UNSIGNED AUTO_INCREMENT, named `id` or `<entity>_id` |
| Timestamps | DATETIME(6), UTC in DB; created_at/updated_at; audit-style uses occurred_at/transitioned_at |
| Booleans | TINYINT(1), positive form (`is_active`, `is_locked`) |
| Enums | SCREAMING_SNAKE_CASE values |
| Engine/charset | InnoDB / utf8mb4_0900_ai_ci (matches existing) |

## Password Policy (LOCKED via Q7)

- **Regex:** `^[A-Z]{2}[0-9]{5}$` — exactly 2 uppercase + 5 digits = 7 chars
- **Storage:** bcrypt VARCHAR(60), cost=12 prod / 10 dev
- **Initial password = employee_id** (e.g., SA79900's password is 'SA79900')
- **Lifetime** — no expiry, no rotation, no history, no must_change flag
- **Validation:** zod regex on FE + BE (frontend rejects before sending; backend rejects before bcrypt)
- **Lockout:** failed_login_count ≥ 5 → is_locked=TRUE; only Super Admin can unlock
- **Future SSO:** password_hash becomes NULLABLE; replace bcrypt check with SSO assertion

## Session & Token (LOCKED — defaults confirmed M12)

- JWT access: 15 min (HS256)
- Refresh token: 7 days, httpOnly cookie, SameSite=Lax, raw never stored — sha256(raw) in `refresh_tokens.token_hash`
- Session idle: 60 min sliding (BR-AUTH-04)
- CSRF double-submit token only on `/api/v1/auth/refresh`

## Architectural Decision Records (DB-specific)

| ADR | Decision |
|---|---|
| ADR-DB-01 | Two-universe (legacy + MVP) DB strategy |
| ADR-DB-02 | Fresh AUTH stack — ZERO migration from cmms_userrole_mst |
| ADR-DB-03 | Password = employee_id at seed time (V1 only, pre-SSO) |
| ADR-DB-04 | Bootstrap via env-CSV migration (`SUPER_ADMIN_EMPLOYEE_IDS=SA79900,AC77777`) |
| ADR-DB-05 | New `departments` + `sections` parallel to legacy `cmms_section_mst` (do not replace) |
| ADR-DB-06 | New vendor master keeps legacy name `cmms_cont_mst` (4 legacy FKs reference it) |
| ADR-DB-07 | Separate per-entity status-history tables (not polymorphic entity_status_history) |
| ADR-DB-08 | bcrypt cost factor 12 prod / 10 dev-test |
| ADR-DB-09 | Refresh tokens stored as SHA-256 hash, never plaintext |
| ADR-DB-10 | Audit log writes SYNCHRONOUS in MVP (async queue is P2 optimisation) |

## Bootstrap Seed Order (10 deterministic steps)

1. Create new tables (FK-safe order: departments → sections → cmms_cont_mst → permissions → roles → role_permissions → users → user_roles → refresh_tokens → login_audit → status histories → audit_log → audit_log_changes → export_audit)
2. ALTERs on legacy (cmms_emp_mst, cmms_eqip_mst, cmms_jobrequest_mst, cmms_jobcard_mst, cmms_parameter_master, cmms_checklist_mst; add FK users.section_id deferred)
3. Pre-bootstrap: INSERT ADMIN section into cmms_section_mst (SM_ID=9999, see [[project-cmcmis-db-v2-migration-answers]] M1)
4. Seed SA79900 + AC77777 into cmms_emp_mst (EMM_DEPT=9999)
5. Seed roles (5 rows, role_id 1..5)
6. Seed permissions (~40 rows)
7. Seed role_permissions matrix (SUPER_ADMIN all; LAB_IN_CHARGE ~30; LAB_ENGINEER ~20; NORMAL_USER ~12; VIEW_ONLY ~15)
8. Seed users (bcrypt computed in Node runner) + user_roles (both SUPER_ADMIN)
9. Seed departments (TIMCD) + sections (T&ME, F&PE)
10. Seed lookups (28 rows in cmms_parameter_master) + bootstrap audit_log entries

## Migration File Layout

```
migrations/
├── 001__create_new_tables.sql
├── 002__alter_legacy_tables.sql
├── 003__pre_bootstrap_admin_section.sql
├── 004__seed_super_admin_employees.sql
├── 005__seed_roles.sql
├── 006__seed_permissions.sql
├── 007__seed_role_permissions.sql
├── 008__seed_super_admin_users.js   (JS — bcrypt computed in Node)
├── 009__seed_org_departments_sections.sql
├── 010__seed_lookups_and_audit.sql
└── 099__isolate_legacy_unused.sql   (rename to _legacy_*)
```

## What's NOT migrated (locked OUT)

- ❌ NO migration from cmms_userrole_mst (565 rows, plaintext pwd) — Q3
- ❌ NO 23→5 role mapping table — Q4
- ❌ NO password reset emails / password_history — Q7
- ❌ NO data migration for cmms_accessright_mst, cmms_module_mst — fully replaced by permissions + role_permissions
- ❌ NO data migration for cmms_section_user_mst — replaced by user_roles

## 26 Tables ISOLATED (renamed `_legacy_*`)

cmms_accessright_mst (3,221), cmms_module_mst (163), cmms_role_mst (23), cmms_section_user_mst (294), cmms_userrole_mst (565), cmms_cal_jobcard_feedback_spec (0), cmms_jobcard_insp_maint_dtl (0), cf001 (6), cf002 (553), cf003 (570), cf004 (3,449), chklistvendor (238), cmms_parameter_master_bkp (4), cmms_parameter_master_jun2016 (233), cmms_parameter_master_incharge (9), + 11 P2 tables kept untouched.

See [[project-cmcmis-db-v2-migration-answers]] for M1-M12 locked answers, [[project-cmcmis-existing-db]] (now superseded for active design but kept for historical audit context), [[project-cmcmis-decisions]], [[project-cmcmis-business-rules]], [[project-cmcmis-next-phase-code]].
