# CMCMIS_SIMPLIFIED — FINAL DATABASE DESIGN

**Document:** `FINAL-DB-DESIGN-v2.0`
**Version:** **v2.0 — LOCKED**
**Date:** May 17, 2026 (Phase 3 — Day 2)
**Prepared by:** Claude (AI engineering pair) for Deep Sorathiya (DS)
**Supersedes:** `FINAL_MVP_DB.md` (v1.0, Day 1)
**Authority:** Subordinate to `FINAL-DESC-CMCMIS v1.0` only. Any other interim drafts → defer to this document for DB.

---

## 🔒 LOCK MANIFEST

This document is **LOCKED**. It is the canonical database design for CMCMIS_SIMPLIFIED. Once construction begins, any change requires an explicit v2.1 revision with DS sign-off.

| Anchor                             | Locked Value                                                                                      |
| ---------------------------------- | ------------------------------------------------------------------------------------------------- |
| Total tables in active MVP runtime | **53** (38 existing kept/altered + 15 new)                                                  |
| Total tables in DB after Phase 3   | **~79** (active + 26 isolated `_legacy_*`)                                                |
| Naming convention (NEW tables)     | `snake_case`, no `cmms_` prefix                                                               |
| Naming convention (LEGACY tables)  | Kept as-is; FK-referenced legacy tables remain `cmms_*`                                         |
| Engine / charset                   | InnoDB ·`utf8mb4_0900_ai_ci` (matches existing)                                                |
| Auth approach                      | **Completely fresh stack** — zero migration from `cmms_userrole_mst`                     |
| Roles                              | **Exactly 5** (SUPER_ADMIN, LAB_IN_CHARGE, LAB_ENGINEER, NORMAL_USER, VIEW_ONLY)            |
| Password format                    | **7 chars: `^[A-Z]{2}[0-9]{5}$`** (2 uppercase letters + 5 digits)                        |
| Password policy                    | **Lifetime**, no expiry, no history, no rotation (until SSO)                                |
| Initial password rule              | `password = employee_id` (e.g., SA79900's password is `SA79900`)                              |
| Password storage                   | bcrypt hash, cost factor 12 in prod                                                               |
| Org structure                      | **NEW** `departments` + `sections` tables; TIMCD = department; T&ME and F&PE = sections |
| Vendor master                      | **NEW** `cmms_cont_mst` (created fresh; satisfies legacy FKs)                             |
| Status history (Equipment)         | **NEW** `equipment_status_history` (separate from `cmms_division_hist`)                 |
| Status history (Job Request)       | **NEW** `job_request_status_history` (separate from `cmms_jobcard_status_hist`)         |
| Bootstrap Super Admins             | **SA79900** + **AC77777** (seeded into `cmms_emp_mst` + new `users`)              |

---

## 📋 TABLE OF CONTENTS

| #  | Section                                                     | Status    |
| -- | ----------------------------------------------------------- | --------- |
| 1  | Executive Summary                                           | —        |
| 2  | The 8 Answers — Locked Decisions                           | ✅        |
| 3  | What Changed Since v1.0 (Day 1)                             | ✅        |
| 4  | Architecture Decision Records (ADRs)                        | ✅        |
| 5  | Naming Conventions                                          | ✅        |
| 6  | The 3-Layer RBAC Model — Visual                            | ✅        |
| 7  | **CLUSTER 1 — Identity & Access (AUTH)** — Complete | ✅ FULL   |
| 8  | **CLUSTER 2 — Organisation (NEW)**                   | ✅ FULL   |
| 9  | **CLUSTER 3 — Equipment Master**                     | ✅ FULL   |
| 10 | **CLUSTER 4 — Job Lifecycle**                        | ✅ FULL   |
| 11 | **CLUSTER 10 — Audit & Logs**                        | ✅ FULL   |
| 12 | **CLUSTER 12 — Lookups**                             | ✅ FULL   |
| 13 | P2 Clusters — Sketch Only                                  | 📝 SKETCH |
| 14 | Master Table Inventory (all 79 tables)                      | ✅        |
| 15 | Complete ERD (textual)                                      | ✅        |
| 16 | State Machines (Auth, Equipment, Job Request, Job Card)     | ✅        |
| 17 | Bootstrap Seed Order (10-step deterministic)                | ✅        |
| 18 | Migration Data Requirements (what DS needs to provide)      | ✅        |
| 19 | Index Strategy & Query Patterns                             | ✅        |
| 20 | Phase 3 Day 3 Plan                                          | ✅        |

---

## 1. EXECUTIVE SUMMARY

CMCMIS_SIMPLIFIED has **two parallel DB universes** that coexist by design:

```
   ┌─────────────────────────────────────────────────────────────────┐
   │                  THE TWO-UNIVERSE STRATEGY                       │
   └─────────────────────────────────────────────────────────────────┘

   LEGACY UNIVERSE (cmms_*)              MVP UNIVERSE (snake_case)
   ═══════════════════════════           ═══════════════════════════
   ~60 tables · 390,000 rows             15 new tables · 0 rows (yet)
   Untouched data integrity              Clean modern schema
   Read-mostly for MVP                   Read/write for MVP
   FK targets preserved                  FK references both worlds

         │                                       │
         │     ◄══════ JOINED VIA ══════►       │
         │   cmms_emp_mst.EMM_ID                 │
         │   cmms_eqip_mst (TYPE,ID)             │
         │   cmms_section_mst.SM_ID              │
         ▼                                       ▼
   ╔═════════════════════════════════════════════════════════════════╗
   ║  THE MVP RUNTIME READS BOTH UNIVERSES,                          ║
   ║  WRITES ONLY TO MVP TABLES + CONTROLLED ALTERs ON LEGACY        ║
   ╚═════════════════════════════════════════════════════════════════╝
```

**Key wins of this approach:**

1. **Zero data loss** — every row of legacy data is preserved.
2. **Zero downtime risk** — new auth runs alongside the old one. If anything breaks, the legacy data is untouched.
3. **Clean RBAC** — the new auth stack has no compromise from 23-role legacy mess.
4. **Audit-grade** — bcrypt passwords, 3-layer RBAC, comprehensive audit_log, all per locked BRs.
5. **Future-proof** — SSO swap-in is a single adapter change; the rest of the schema is SSO-ready.

**MVP cluster totals (active runtime):**

| Cluster                      | NEW tables                                                 | KEEP existing        | ALTER existing  | Total active |
| ---------------------------- | ---------------------------------------------------------- | -------------------- | --------------- | ------------ |
| 1 Identity & Access          | 7                                                          | 1 (`cmms_emp_mst`) | 1 (light ALTER) | 8            |
| 2 Organisation               | 2 (`departments`, `sections`)                          | 3                    | 0               | 5            |
| 3 Equipment                  | 2 (`cmms_cont_mst`, `equipment_status_history`)        | 6                    | 1               | 9            |
| 4 Job Lifecycle              | 1 (`job_request_status_history`)                         | 19                   | 2               | 22           |
| 10 Audit                     | 3 (`audit_log`, `audit_log_changes`, `export_audit`) | 0                    | 0               | 3            |
| 12 Lookups                   | 0                                                          | 5                    | 1               | 6            |
| **TOTAL MVP-CRITICAL** | **15**                                               | **34**         | **5**     | **53** |

---

## 2. THE 8 ANSWERS — LOCKED DECISIONS

Each question, your answer, and the exact action I'm taking.

### Q1 — `cmms_cont_mst` (vendor master)

> **DS:** Create the schema new — I don't have it in my DB right now.

✅ **LOCKED ACTION:** I will design `cmms_cont_mst` as a brand-new fresh table. Keeping the **exact name** `cmms_cont_mst` so the existing FK constraints from 4 legacy tables (`cmms_eqip_mst.EQM_MFRID`, `cmms_amc_mst.AMC_VENDERID`, `cmms_checklist_mst.CHKL_MAKE`, `cmms_inv_mst.INV_MCODE`) automatically work the moment we create it.

### Q2 — SA79900 and AC77777 existence

> **DS:** Not exist as of now. Please seed/insert into the database.

✅ **LOCKED ACTION:** Bootstrap migration will INSERT 2 new rows into `cmms_emp_mst` for SA79900 and AC77777, then INSERT corresponding rows into the new `users` and `user_roles` tables.

### Q3 — Migration of 565 existing user-role rows

> **DS:** Skip migration. Entirely new AUTH + RBAC + permissions + user_roles. Super Admin (SA79900 or AC77777) assigns roles to normal users; assigned role is stored; next login uses RBAC + permissions.

✅ **LOCKED ACTION:**

- **Zero migration** from `cmms_userrole_mst` (it stays as legacy, untouched, no read access from MVP code).
- New `users` table starts empty (except for the 2 Super Admin seeds).
- Super Admin assigns roles to new users through the UI (or CLI in MVP).
- First-login flow: User logs in with their `employee_id` as both username and password → on success, the stored role + permissions drive their session.

### Q4 — 23 old roles → 5 new roles

> **DS:** Only 5 roles in the entire CMCMIS-SIMPLIFIED.

✅ **LOCKED ACTION:** The `roles` table will be seeded with **exactly 5 rows**. The legacy `cmms_role_mst` (23 rows) is isolated and not read by MVP runtime.

### Q5 — Equipment status history

> **DS:** Keep separated. Design new schema and lock it.

✅ **LOCKED ACTION:** New `equipment_status_history` table designed below. `cmms_division_hist` (3,676 rows) stays untouched as a legacy reference for division-change history specifically.

### Q6 — Job request status history

> **DS:** Keep separated. Design new schema and lock it.

✅ **LOCKED ACTION:** New `job_request_status_history` table designed below. `cmms_jobcard_status_hist` (22,214 rows) continues to serve job cards specifically.

### Q7 — Password policy

> **DS:** Fixed 7 characters. 2 compulsory uppercase letters + 5 fixed digits. No lowercase, no special chars, no symbols. Lifetime password — no expiry, no history. Until SSO replaces it.

✅ **LOCKED ACTION:**

- **Format:** `^[A-Z]{2}[0-9]{5}$` — exactly 2 uppercase letters followed by exactly 5 digits.
- **Length:** Exactly 7 characters.
- **Storage:** bcrypt hash (cost factor 12). Plaintext rule = `password == employee_id` validates the same regex on both ends.
- **No expiry** → removed `password_expires_at` column.
- **No history** → `password_history` table dropped from design.
- **No `password_must_change` flag** → simplified out; bootstrap users login with `employee_id` as password directly.
- **Validation point:** Both backend (zod schema) and DB (CHECK constraint via trigger or app-layer guarantee).

**Verification example:**

- `SA79900` → matches `^[A-Z]{2}[0-9]{5}$`? S,A=uppercase ✓, 79900=5 digits ✓ → **VALID**
- `AC77777` → A,C=uppercase ✓, 77777=5 digits ✓ → **VALID**

### Q8 — `EMM_DEPT` semantics → new org table

> **DS:** Design a new table schema for it.

✅ **LOCKED ACTION:** New `departments` + `sections` tables created. `TIMCD` seeded as a department; `T&ME` and `F&PE` seeded as sections under TIMCD. The legacy `cmms_section_mst` (293 rows) and `cmms_emp_mst.EMM_DEPT` (FK to it) remain untouched. The new `users` table carries its own `section_id` FK to the new `sections` table.

---

## 3. WHAT CHANGED SINCE v1.0 (DAY 1)

| #  | Day 1 (v1.0)                                                                      | Day 2 (v2.0 — locked)                              | Why                                                  |
| -- | --------------------------------------------------------------------------------- | --------------------------------------------------- | ---------------------------------------------------- |
| 1  | `password_must_change`, `password_changed_at`, `password_history` in design | ❌**Removed**                                 | Q7: lifetime password, no rotation                   |
| 2  | `password_hash VARCHAR(60)` default NULL with `must_change` flow              | ✅**Always populated**                        | bcrypt(employee_id) seeded directly at user creation |
| 3  | Migration of 565 `cmms_userrole_mst` rows discussed                             | ❌**No migration**                            | Q3: entirely new stack                               |
| 4  | Mapping 23 → 5 roles needed                                                      | ❌**Not needed**                              | Q4: only 5 roles, fresh users only                   |
| 5  | `cmms_cont_mst` flagged as missing/blocking                                     | ✅**Designed fresh**                          | Q1: new schema for it                                |
| 6  | `departments`/`sections` not designed (used legacy `cmms_section_mst`)      | ✅**NEW tables added**                        | Q8: clean new org table                              |
| 7  | SA79900/AC77777 existence unverified                                              | ✅**Will be seeded into `cmms_emp_mst`**    | Q2: insert new                                       |
| 8  | `equipment_status_history`, `job_request_status_history` proposed             | ✅**Confirmed + locked**                      | Q5, Q6: keep separate                                |
| 9  | Permission seeds were sketched                                                    | ✅**Full permission grants per matrix below** | Final lock                                           |
| 10 | "Phase 3 Day 2" plan was TBD                                                      | ✅**This document IS that**                   | Delivered                                            |

---

## 4. ARCHITECTURE DECISION RECORDS (ADRs)

Each ADR is short — what was decided, why, and what was rejected.

### ADR-DB-01 — Two-universe (legacy + MVP) DB

**Decision:** Keep legacy `cmms_*` tables untouched (except controlled ALTERs). Build new MVP runtime tables in clean `snake_case`.
**Why:** 390,000 rows of historical data; defence-grade audit context; cannot tolerate data loss; FINAL-DESC §21 Constraint #2 explicitly forbids dropping existing tables in MVP.
**Rejected:** Full migration to a "blank" DB (too risky), in-place modernisation of existing auth (incompatible models, plaintext passwords).

### ADR-DB-02 — Fresh AUTH stack (zero migration)

**Decision:** Per Q3, no rows migrated from `cmms_userrole_mst`. New `users` table seeded only with SA79900 and AC77777.
**Why:** Plaintext passwords cannot be salvaged; 23-role legacy doesn't map to 5-role locked model; cleaner audit trail starting from a known baseline.
**Rejected:** Partial migration (active users only) — Q3 explicit "skip migration".

### ADR-DB-03 — Password = employee_id (V1 only, pre-SSO)

**Decision:** Initial password for every user = their employee_id. Stored as bcrypt hash.
**Why:** Q7 explicit; pre-SSO interim model; matches the locked regex `^[A-Z]{2}[0-9]{5}$` since all employee_ids in `cmms_emp_mst` are exactly that format.
**Tradeoff acknowledged:** Security is weak (passwords are guessable from employee_ids). Acceptable for on-prem defence-grade intranet (no public exposure) + scheduled SSO replacement.
**Rejected:** Random initial passwords (operationally painful without email channel for delivery).

### ADR-DB-04 — Bootstrap via env-CSV migration

**Decision:** Super Admin seed via `SUPER_ADMIN_EMPLOYEE_IDS=SA79900,AC77777` env var, read by migration runner. Locked from FINAL-DESC D11.
**Why:** Reproducible, codified, no manual SQL on production boxes.
**Rejected:** Manual SQL insert (un-audited).

### ADR-DB-05 — New `departments` + `sections` parallel to legacy `cmms_section_mst`

**Decision:** Per Q8, build new clean org tables. Do NOT replace `cmms_section_mst`.
**Why:** 13 legacy tables FK-reference `cmms_section_mst`; replacing would cascade into 600+ rows of dependent data; new tables give clean foundation for new users.
**Rejected:** Adding `department_id` to `cmms_section_mst` directly (still polluted with 293 legacy rows we don't trust).

### ADR-DB-06 — New `cmms_cont_mst` keeps legacy name

**Decision:** Create the missing vendor master with the legacy name `cmms_cont_mst` (not `vendors`).
**Why:** 4 legacy tables already FK-reference `cmms_cont_mst (CMM_CONT_ID)`. Using the same name makes their FKs valid the moment the table exists.
**Tradeoff:** Naming convention "MVP tables = snake_case" has this one explicit exception, documented here.

### ADR-DB-07 — Separate status-history tables per entity (not polymorphic)

**Decision:** Per Q5, Q6: `equipment_status_history`, `job_request_status_history`, `cmms_jobcard_status_hist` (existing) remain three separate tables — not a polymorphic `entity_status_history` with `entity_type` column.
**Why:** Type-safe FKs, simpler queries, better indexes per entity, easier audits per entity type. Polymorphic tables are operational pain at audit time.
**Rejected:** Single `entity_status_history` (sacrifices typed FKs for one less table).

### ADR-DB-08 — bcrypt cost factor 12 in prod

**Decision:** bcrypt rounds = 12 (production), 10 (dev/test only).
**Why:** NFR Security target; ~250ms per hash on commodity hardware; ahead of brute-force economics for ≥3 years.
**Rejected:** Lower rounds (10), Argon2 (different security profile, less mature in Node.js ecosystem).

### ADR-DB-09 — Refresh tokens stored as SHA-256 hash, not plaintext

**Decision:** `refresh_tokens.token_hash VARCHAR(64)` = `sha256(raw_token)`. Raw token never persisted.
**Why:** If DB is stolen, attacker cannot forge sessions; still validates server-side via hash comparison.
**Rejected:** Plaintext token storage (instant takeover on DB compromise).

### ADR-DB-10 — Audit log is fire-and-forget (async-friendly) but synchronous in MVP

**Decision:** MVP writes `audit_log` synchronously inside the same transaction as the business write. Async queue is a Phase 2 optimisation if latency becomes an issue.
**Why:** Synchronous = guaranteed consistency between business state and audit. Avoids "operation happened but audit lost" failure modes. Locked BR-AUD-01 requires 100% coverage.
**Rejected:** Fully async fire-and-forget (loses coverage guarantee in MVP).

---

## 5. NAMING CONVENTIONS

```
   ┌───────────────────────────────────────────────────────────────┐
   │  CMCMIS NAMING CONVENTIONS — LOCKED                           │
   ├───────────────────────────────────────────────────────────────┤
   │                                                               │
   │  NEW TABLES (MVP runtime)                                     │
   │  ──────────────────────────                                   │
   │  • snake_case (lowercase, _ separator)                        │
   │  • Plural for entity tables  → users, permissions, roles      │
   │  • Singular descriptive for junction → user_roles, role_perms │
   │  • Suffix _history for audit-style tables                     │
   │  • Suffix _audit for security/compliance logs                 │
   │                                                               │
   │  LEGACY TABLES (cmms_*)                                       │
   │  ──────────────────────────                                   │
   │  • Names kept as-is for FK compatibility                      │
   │  • Inactive ones renamed _legacy_* prefix in Day 3            │
   │                                                               │
   │  ONE EXPLICIT EXCEPTION (ADR-DB-06)                           │
   │  ──────────────────────────                                   │
   │  • cmms_cont_mst stays cmms_cont_mst even though new          │
   │    (because 4 legacy FKs already reference it by that name)   │
   │                                                               │
   │  COLUMN NAMES                                                 │
   │  ──────────────────────────                                   │
   │  • NEW tables → snake_case (user_id, employee_id, created_at) │
   │  • LEGACY ALTERs → match the existing column prefix style     │
   │    (e.g., cmms_eqip_mst gets EQM_VERIFIED_BY in caps to       │
   │     match its existing EQM_* prefix convention)               │
   │                                                               │
   │  PRIMARY KEYS                                                 │
   │  ──────────────────────────                                   │
   │  • New tables → BIGINT UNSIGNED AUTO_INCREMENT, named `id`    │
   │    or `<entity>_id` if used as FK target                      │
   │  • Junction tables → composite PK on both FK columns          │
   │                                                               │
   │  FOREIGN KEYS                                                 │
   │  ──────────────────────────                                   │
   │  • Index name: idx_<table_prefix>_<purpose>                   │
   │  • Constraint name: fk_<child_table>_<parent_table>           │
   │  • ON DELETE: explicit per table (CASCADE / RESTRICT / NULL)  │
   │                                                               │
   │  TIMESTAMPS                                                   │
   │  ──────────────────────────                                   │
   │  • All new tables: created_at, updated_at as DATETIME(6)      │
   │  • Audit-style tables: occurred_at, transitioned_at, etc.     │
   │  • All times in DB stored UTC; application converts to IST    │
   │                                                               │
   │  BOOLEANS                                                     │
   │  ──────────────────────────                                   │
   │  • is_active, is_locked, is_system  (positive form, TINYINT 1)│
   │  • Avoid "not_*" naming                                       │
   │                                                               │
   │  ENUMS                                                        │
   │  ──────────────────────────                                   │
   │  • SCREAMING_SNAKE values: 'SUPER_ADMIN', 'PENDING_VERIFICATION'│
   │  • Sourced from FINAL-DESC state machines                     │
   │                                                               │
   └───────────────────────────────────────────────────────────────┘
```

---

## 6. THE 3-LAYER RBAC MODEL — VISUAL

The locked RBAC contract (BR-RBAC-03) says: **Code never checks role names. Code always checks permissions.**

```
   ┌────────────────────────────────────────────────────────────────┐
   │              3-LAYER RBAC — END-TO-END PICTURE                  │
   └────────────────────────────────────────────────────────────────┘

           LAYER 1                LAYER 2              LAYER 3
        ─────────────         ──────────────       ──────────────────
           USER                  ROLE                 PERMISSION
           │                      │                    │
           │                      │                    │
        ┌──┴────────┐         ┌───┴──────┐         ┌───┴──────────────┐
        │ identity  │   M:1   │ bundle   │   M:N   │ resource:action  │
        │ (employee │ ──────► │ (e.g.,   │ ──────► │ (e.g.,           │
        │  + bcrypt │         │  LAB_    │         │  equipment:      │
        │  password)│         │  ENGINEER│         │  create)         │
        └───────────┘         └──────────┘         └──────────────────┘
              │                    │                       │
              │                    │                       │
              ▼                    ▼                       ▼
        ┌──────────────────────────────────────────────────────────┐
        │  CONTROLLER CODE:                                          │
        │    authorize('equipment:create') {                         │
        │      // looks up: does THIS user's role include             │
        │      //           the permission 'equipment:create'?        │
        │      // YES  → proceed                                      │
        │      // NO   → 403 Forbidden                                │
        │    }                                                       │
        │  NEVER WRITES:  if (user.role === 'LAB_ENGINEER') {...}    │
        └──────────────────────────────────────────────────────────┘

   ┌────────────────────────────────────────────────────────────────┐
   │  WHY IT MATTERS:                                                │
   │                                                                 │
   │  Business says: "Lab Engineers should also approve job requests"│
   │                                                                 │
   │  Old 2-layer way: change CODE, recompile, redeploy.            │
   │                                                                 │
   │  Our 3-layer way: Super Admin checks one box in the UI →        │
   │                   INSERT INTO role_permissions(...) → done.     │
   │                   No redeploy, no code change.                  │
   │                                                                 │
   └────────────────────────────────────────────────────────────────┘
```

### The 5 roles — locked

| `role_id` | `role_code`     | `role_name`  | Permissions (count) | Primary purpose                          |
| ----------- | ----------------- | -------------- | ------------------- | ---------------------------------------- |
| 1           | `SUPER_ADMIN`   | Super Admin    | All (~45)           | Bootstrap, master data, system integrity |
| 2           | `LAB_IN_CHARGE` | Lab In-Charge  | ~30                 | Approve, assign, verify, close           |
| 3           | `LAB_ENGINEER`  | Lab Engineer   | ~20                 | Execute jobs, fill cards, observations   |
| 4           | `NORMAL_USER`   | Normal User    | ~12                 | Raise requests, register equipment       |
| 5           | `VIEW_ONLY`     | View-Only User | ~15                 | Read everything, write nothing           |

---

## 7. CLUSTER 1 — IDENTITY & ACCESS (AUTH) — COMPLETE DESIGN

This is the cornerstone cluster. Everything else depends on it.

### 7.1 Architecture Diagram — Cluster 1

```
                     ┌──────────────────────────────────┐
                     │   cmms_emp_mst   (LEGACY KEEP)   │
                     │   ─ employee directory ─          │
                     │   PK: EMM_ID  VARCHAR(7)          │
                     │       EMM_NAME, EMM_DESIGNATION   │
                     │       EMM_DEPT  → cmms_section_   │
                     │                    mst (legacy)   │
                     │       EMM_EMAIL, EMM_MOBILE       │
                     │       EMM_INACTIVE                │
                     │                                   │
                     │   ► 57 existing rows + 2 NEW      │
                     │      (SA79900, AC77777)           │
                     └────────────┬──────────────────────┘
                                  │ FK on employee_id
                                  │ (one cmms_emp_mst row : at most one users row)
                                  ▼
   ┌────────────────────────────────────────────────────────────────┐
   │  users (NEW)                                                    │
   │  ─── auth identity ───                                           │
   │  PK: user_id  BIGINT                                             │
   │      employee_id (UNIQUE, FK → cmms_emp_mst.EMM_ID)              │
   │      password_hash  VARCHAR(60)   (bcrypt of employee_id)        │
   │      section_id  → sections.section_id (new org table)           │
   │      is_active, is_locked                                        │
   │      failed_login_count, last_login_at, last_login_ip            │
   │      password_hash_set_at                                        │
   │      created_at/by, updated_at/by                                │
   └────┬──────────────────────────┬──────────────────────────────┬──┘
        │ 1:1                       │ 1:N                          │ 1:N
        │ (PK enforces ONE role)    │                              │
        ▼                          ▼                              ▼
   ┌─────────────┐         ┌─────────────────┐         ┌─────────────────┐
   │ user_roles  │         │ refresh_tokens  │         │ login_audit     │
   │ PK:user_id  │         │ (SHA-256 hash)  │         │ (every attempt) │
   │    role_id  │         │  expires_at     │         │  outcome ENUM   │
   │    assigned_│         │  revoked_at     │         │  ip, user_agent │
   │    at/by    │         │  ip, ua         │         └─────────────────┘
   └─────┬───────┘         └─────────────────┘
         │ M:1
         ▼
   ┌──────────────┐
   │ roles (5)    │   ← seeded once, system rows, not editable via UI
   │ role_id 1-5  │
   │ role_code    │   (SUPER_ADMIN, LAB_IN_CHARGE, LAB_ENGINEER,
   │ role_name    │    NORMAL_USER, VIEW_ONLY)
   └─────┬────────┘
         │ M:N
         ▼
   ┌────────────────────┐
   │ role_permissions   │
   │ PK: (role_id,      │   ← which role gets which permission
   │      permission_id)│
   │ granted_at/by      │
   └─────┬──────────────┘
         │ M:1
         ▼
   ┌──────────────────────┐
   │ permissions (~45)    │
   │ PK: permission_id    │
   │ permission_code      │   e.g., 'equipment:create',
   │ resource             │         'job_card:verify-close'
   │ action               │
   └──────────────────────┘
```

### 7.2 Old vs New — Crisp Comparison

| Concern                 | Legacy (DO NOT USE)                                             | New MVP (locked)                                               | Notes                         |
| ----------------------- | --------------------------------------------------------------- | -------------------------------------------------------------- | ----------------------------- |
| Auth identity table     | `cmms_userrole_mst` (565 rows, plaintext pwd)                 | `users` (NEW, bcrypt)                                        | Q3: zero migration            |
| Roles table             | `cmms_role_mst` (23 rows)                                     | `roles` (5 rows)                                             | Q4: 5 roles only              |
| Permissions model       | `cmms_accessright_mst` (mod_id, role_id → 5 flags)           | `permissions` + `role_permissions` (resource:action)       | BR-RBAC-03                    |
| User-to-role link       | `(USER_ID, USER_DIVISION_ID, USER_ROLE)` (multi-row possible) | `user_roles (user_id PK)` (exactly one row per user)         | BR-RBAC-02                    |
| Menu/route control      | `cmms_module_mst` (163 rows)                                  | Permission-driven (sidebar reads permissions, not menus table) | UI generates from permissions |
| Password storage        | `USER_PASSWORD VARCHAR(10)` plaintext                         | `password_hash VARCHAR(60)` bcrypt                           | NFR Security                  |
| Password reset/rotation | Not enforced                                                    | **None in MVP** (lifetime password per Q7)               | Until SSO                     |
| Refresh tokens          | None (cookie-only session)                                      | `refresh_tokens` (SHA-256 hashed)                            | D17                           |
| Login audit             | None                                                            | `login_audit` (every attempt + outcome)                      | BR-AUTH-06                    |
| Failed-login lockout    | None                                                            | `users.failed_login_count` + `is_locked` flag              | Defence-grade                 |

### 7.3 Password Policy — Full Specification

```
   ┌─────────────────────────────────────────────────────────┐
   │  PASSWORD POLICY — LOCKED                                │
   ├─────────────────────────────────────────────────────────┤
   │                                                          │
   │  REGEX:    ^[A-Z]{2}[0-9]{5}$                            │
   │                                                          │
   │  STRUCTURE:                                              │
   │    ┌──────┬──────┬──────┬──────┬──────┬──────┬──────┐    │
   │    │ char1│ char2│ char3│ char4│ char5│ char6│ char7│    │
   │    │ [A-Z]│ [A-Z]│ [0-9]│ [0-9]│ [0-9]│ [0-9]│ [0-9]│    │
   │    └──────┴──────┴──────┴──────┴──────┴──────┴──────┘    │
   │      U      U      d      d      d      d      d         │
   │                                                          │
   │  EXAMPLES:                                               │
   │    ✓ VALID:    SA79900, AC77777, DS12345, MK00001        │
   │    ✗ INVALID:  sa79900 (lowercase)                       │
   │                SA7990  (only 6 chars)                    │
   │                SA799000 (8 chars)                        │
   │                S179900 (digit in pos 2)                  │
   │                SA7990A (letter in pos 7)                 │
   │                SA-7990 (special char)                    │
   │                                                          │
   │  STORAGE:                                                │
   │    Plaintext → never written to disk                     │
   │    Hash → bcrypt(plaintext, rounds=12)                   │
   │    Column type: VARCHAR(60) NOT NULL                     │
   │                                                          │
   │  EXPIRY:        None (lifetime, per Q7)                  │
   │  ROTATION:      None (per Q7)                            │
   │  HISTORY:       Not tracked (per Q7)                     │
   │  RESET FLOW:    None in MVP (only Super Admin            │
   │                 can change via DB or future UI)          │
   │                                                          │
   │  INITIAL PASSWORD: password = employee_id                │
   │    Example: SA79900's password is 'SA79900'              │
   │             AC77777's password is 'AC77777'              │
   │                                                          │
   │  ENFORCEMENT LAYERS:                                     │
   │    1. Frontend → zod schema, regex validation on input   │
   │    2. Backend  → zod schema (same regex), pre-hash check │
   │    3. Database → NOT enforced at column level            │
   │                  (bcrypt hash is opaque 60 chars)        │
   │                  → enforced at application layer only    │
   │                                                          │
   │  FUTURE (SSO):                                           │
   │    Replace bcrypt check with SSO assertion verification. │
   │    `users.password_hash` becomes NULLABLE.               │
   │    No other schema change needed.                        │
   │                                                          │
   └─────────────────────────────────────────────────────────┘
```

### 7.4 Complete DDL — Cluster 1 (Identity & Access)

```sql
-- ════════════════════════════════════════════════════════════════════
-- CLUSTER 1: IDENTITY & ACCESS (AUTH)
-- Locked decisions: D11, D12, D17, D18 + Q3, Q4, Q7 + BR-AUTH-*, BR-RBAC-*
-- ════════════════════════════════════════════════════════════════════

-- ----------------------------------------------------------------------
-- 1.0 — Light ALTER on cmms_emp_mst (legacy KEEP)
-- ----------------------------------------------------------------------
-- We do NOT touch the business columns. Only add an index for fast
-- "loginable employees" lookup.

ALTER TABLE `cmms_emp_mst`
  ADD INDEX `idx_emm_active` (`EMM_INACTIVE`);

-- Note: cmms_emp_mst.EMM_DEPT (FK → cmms_section_mst.SM_ID) is LEGACY.
-- The new `users` table will carry its own section_id FK to the new
-- `sections` table. Both coexist by design.


-- ----------------------------------------------------------------------
-- 1.1 — users (NEW)
-- ----------------------------------------------------------------------
-- One row per loginable user. Bound to cmms_emp_mst (employee directory)
-- via UNIQUE FK on employee_id. New users are SEEDED by Super Admin only.

CREATE TABLE `users` (
  `user_id`                 BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `employee_id`             VARCHAR(7)      NOT NULL
                            COMMENT 'Matches cmms_emp_mst.EMM_ID; also the initial password (pre-SSO)',
  `password_hash`           VARCHAR(60)     NOT NULL
                            COMMENT 'bcrypt(employee_id) at seed time; bcrypt(new_password) if Super Admin resets',
  `section_id`              INT UNSIGNED    NULL DEFAULT NULL
                            COMMENT 'FK → sections.section_id (new org table). NULL allowed for unassigned users.',
  `is_active`               TINYINT(1)      NOT NULL DEFAULT 1
                            COMMENT 'BR-AUTH-07: inactive cannot login but history preserved',
  `is_locked`               TINYINT(1)      NOT NULL DEFAULT 0
                            COMMENT 'Auto-set TRUE after N consecutive failed logins',
  `failed_login_count`      SMALLINT UNSIGNED NOT NULL DEFAULT 0
                            COMMENT 'Reset to 0 on successful login',
  `last_login_at`           DATETIME(6)     NULL DEFAULT NULL,
  `last_login_ip`           VARCHAR(45)     NULL DEFAULT NULL
                            COMMENT 'IPv6-ready',
  `password_hash_set_at`    DATETIME(6)     NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
                            COMMENT 'When the current hash was computed (not a rotation timestamp)',
  `created_at`              DATETIME(6)     NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by`              VARCHAR(7)      NULL DEFAULT NULL
                            COMMENT 'employee_id of admin who created this account, or BOOTSTRAP',
  `updated_at`              DATETIME(6)     NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
                                            ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by`              VARCHAR(7)      NULL DEFAULT NULL,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `uk_users_employee_id` (`employee_id`),
  CONSTRAINT `fk_users_employee`
    FOREIGN KEY (`employee_id`)
    REFERENCES `cmms_emp_mst` (`EMM_ID`),
  -- FK to new sections table is added at the end of Cluster 2 DDL (ordering)
  INDEX `idx_users_active`      (`is_active`, `is_locked`),
  INDEX `idx_users_section`     (`section_id`),
  INDEX `idx_users_created_at`  (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- ----------------------------------------------------------------------
-- 1.2 — roles (NEW) — exactly 5 system rows
-- ----------------------------------------------------------------------
CREATE TABLE `roles` (
  `role_id`           TINYINT UNSIGNED NOT NULL
                      COMMENT 'Hard-coded IDs 1..5 to keep role-permission seeds deterministic',
  `role_code`         VARCHAR(30)     NOT NULL
                      COMMENT 'SUPER_ADMIN | LAB_IN_CHARGE | LAB_ENGINEER | NORMAL_USER | VIEW_ONLY',
  `role_name`         VARCHAR(60)     NOT NULL
                      COMMENT 'Human-readable display name',
  `role_description`  VARCHAR(255)    NULL DEFAULT NULL,
  `is_system`         TINYINT(1)      NOT NULL DEFAULT 1
                      COMMENT 'System roles cannot be deleted via UI',
  `created_at`        DATETIME(6)     NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`role_id`),
  UNIQUE KEY `uk_roles_code` (`role_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- SEED (the 5 locked roles)
INSERT INTO `roles` (`role_id`, `role_code`, `role_name`, `role_description`) VALUES
  (1, 'SUPER_ADMIN',   'Super Admin',    'Master data + RBAC management + system integrity oversight'),
  (2, 'LAB_IN_CHARGE', 'Lab In-Charge',  'Approve job requests, assign engineers, verify, close, manage schedules'),
  (3, 'LAB_ENGINEER',  'Lab Engineer',   'Execute assigned jobs, fill job cards, record observations'),
  (4, 'NORMAL_USER',   'Normal User',    'Raise job requests, register equipment, track own requests'),
  (5, 'VIEW_ONLY',     'View-Only User', 'Read all data, no write actions ever; auditor / management view');


-- ----------------------------------------------------------------------
-- 1.3 — permissions (NEW) — atomic resource:action
-- ----------------------------------------------------------------------
CREATE TABLE `permissions` (
  `permission_id`     SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `permission_code`   VARCHAR(80)       NOT NULL
                      COMMENT 'e.g., equipment:create, job_card:verify-close',
  `resource`          VARCHAR(40)       NOT NULL
                      COMMENT 'Entity name, e.g., equipment, job_card, audit_log',
  `action`            VARCHAR(60)       NOT NULL
                      COMMENT 'Operation, e.g., create, read-list, verify-close, reopen',
  `description`       VARCHAR(255)      NULL DEFAULT NULL,
  `is_system`         TINYINT(1)        NOT NULL DEFAULT 1,
  `created_at`        DATETIME(6)       NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`permission_id`),
  UNIQUE KEY `uk_perm_code` (`permission_code`),
  INDEX `idx_perm_resource` (`resource`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- SEED (full permission catalogue from FINAL-DESC §6)
INSERT INTO `permissions` (`permission_code`, `resource`, `action`, `description`) VALUES
  -- Auth & Identity (4)
  ('auth:login',                 'auth',         'login',                'Submit credentials'),
  ('auth:logout',                'auth',         'logout',               'End session'),
  ('auth:refresh-token',         'auth',         'refresh-token',        'Refresh JWT via cookie'),
  ('me:read',                    'me',           'read',                 'Read own profile'),
  -- User & Role mgmt (3)
  ('user:read-list',             'user',         'read-list',            'List all users'),
  ('user:role-assign',           'user',         'role-assign',          'Assign or change a user role'),
  ('user:activate-deactivate',   'user',         'activate-deactivate',  'Toggle user active status'),
  -- Equipment (7)
  ('equipment:read-list',        'equipment',    'read-list',            'List equipment'),
  ('equipment:read-detail',      'equipment',    'read-detail',          'View equipment detail'),
  ('equipment:create',           'equipment',    'create',               'Register new equipment'),
  ('equipment:update',           'equipment',    'update',               'Edit equipment'),
  ('equipment:verify',           'equipment',    'verify',               'PENDING_VERIFICATION → ACTIVE'),
  ('equipment:condemn',          'equipment',    'condemn',              'Flip to CONDEMNED'),
  ('equipment:delete',           'equipment',    'delete',               'Hard delete (Super Admin only)'),
  -- Job Requests (6)
  ('job_request:create',         'job_request',  'create',               'Create a job request'),
  ('job_request:read-own',       'job_request',  'read-own',             'List own job requests'),
  ('job_request:read-all',       'job_request',  'read-all',             'List all job requests'),
  ('job_request:approve',        'job_request',  'approve',              'Approve a job request'),
  ('job_request:reject',         'job_request',  'reject',               'Reject job request with reason'),
  ('job_request:assign-engineer','job_request',  'assign-engineer',      'Assign to a Lab Engineer'),
  -- Job Cards (8)
  ('job_card:read-list',         'job_card',     'read-list',            'List job cards'),
  ('job_card:read-detail',       'job_card',     'read-detail',          'View job card detail'),
  ('job_card:start-work',        'job_card',     'start-work',           'ASSIGNED → IN_PROGRESS'),
  ('job_card:update-tasks',      'job_card',     'update-tasks',         'Update tasks and observations'),
  ('job_card:complete',          'job_card',     'complete',             'IN_PROGRESS → COMPLETED'),
  ('job_card:verify-close',      'job_card',     'verify-close',         'COMPLETED → VERIFIED_CLOSED'),
  ('job_card:reopen',            'job_card',     'reopen',               'Reopen closed job card with reason'),
  ('job_card:generate-pdf',      'job_card',     'generate-pdf',         'Generate job card PDF on demand'),
  -- Dashboard & Inquiry (5)
  ('dashboard:view',             'dashboard',    'view',                 'View dashboard'),
  ('inquiry:search-vendors',     'inquiry',      'search-vendors',       'Search vendors'),
  ('inquiry:search-products',    'inquiry',      'search-products',      'Search products'),
  ('inquiry:search-job-cards',   'inquiry',      'search-job-cards',     'Search job cards'),
  ('inquiry:search-instruments', 'inquiry',      'search-instruments',   'Search instruments'),
  -- Master Data (Phase 2) (5)
  ('master:employees:manage',    'master',       'employees:manage',     'P2: CRUD on employees master'),
  ('master:vendors:manage',      'master',       'vendors:manage',       'P2: CRUD on vendors'),
  ('master:equipment-types:manage','master',     'equipment-types:manage','P2: CRUD on equipment types'),
  ('master:divisions:manage',    'master',       'divisions:manage',     'P2: CRUD on divisions/sections'),
  ('master:lookup-values:manage','master',       'lookup-values:manage', 'P2: CRUD on lookup values'),
  -- Audit & Export (2)
  ('audit_log:read',             'audit_log',    'read',                 'Read audit log (Super Admin)'),
  ('export:trigger',             'export',       'trigger',              'Trigger any export (PDF, future Excel)');

-- Total seeded: 40 permissions.


-- ----------------------------------------------------------------------
-- 1.4 — role_permissions (NEW) — M:N junction
-- ----------------------------------------------------------------------
CREATE TABLE `role_permissions` (
  `role_id`         TINYINT UNSIGNED  NOT NULL,
  `permission_id`   SMALLINT UNSIGNED NOT NULL,
  `granted_at`      DATETIME(6)       NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `granted_by`      VARCHAR(7)        NULL DEFAULT NULL
                    COMMENT 'employee_id of Super Admin who granted; or BOOTSTRAP',
  PRIMARY KEY (`role_id`, `permission_id`),
  CONSTRAINT `fk_rp_role`
    FOREIGN KEY (`role_id`)       REFERENCES `roles` (`role_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_rp_permission`
    FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`permission_id`) ON DELETE CASCADE,
  INDEX `idx_rp_perm` (`permission_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- ----------------------------------------------------------------------
-- 1.5 — user_roles (NEW) — exactly ONE role per user (BR-RBAC-02)
-- ----------------------------------------------------------------------
-- PK on user_id alone enforces the rule at schema level.
CREATE TABLE `user_roles` (
  `user_id`         BIGINT UNSIGNED   NOT NULL,
  `role_id`         TINYINT UNSIGNED  NOT NULL,
  `assigned_at`     DATETIME(6)       NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `assigned_by`     VARCHAR(7)        NULL DEFAULT NULL
                    COMMENT 'employee_id of Super Admin who assigned; or BOOTSTRAP',
  PRIMARY KEY (`user_id`),
  CONSTRAINT `fk_ur_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ur_role`
    FOREIGN KEY (`role_id`) REFERENCES `roles` (`role_id`),
  INDEX `idx_ur_role` (`role_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- ----------------------------------------------------------------------
-- 1.6 — refresh_tokens (NEW) — D17: 7-day refresh token storage
-- ----------------------------------------------------------------------
CREATE TABLE `refresh_tokens` (
  `token_id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`          BIGINT UNSIGNED NOT NULL,
  `token_hash`       VARCHAR(64)     NOT NULL
                     COMMENT 'SHA-256 hash of raw token (64 hex chars); raw token never stored',
  `issued_at`        DATETIME(6)     NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `expires_at`       DATETIME(6)     NOT NULL
                     COMMENT 'issued_at + 7 days',
  `revoked_at`       DATETIME(6)     NULL DEFAULT NULL,
  `revoked_reason`   ENUM(
                       'LOGOUT',
                       'ROTATED',
                       'ADMIN_REVOKE',
                       'PASSWORD_CHANGE',
                       'EXPIRY_CLEANUP'
                     ) NULL DEFAULT NULL,
  `user_agent`       VARCHAR(500)    NULL DEFAULT NULL,
  `ip_address`       VARCHAR(45)     NULL DEFAULT NULL,
  PRIMARY KEY (`token_id`),
  UNIQUE KEY `uk_rt_hash` (`token_hash`),
  CONSTRAINT `fk_rt_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  INDEX `idx_rt_user_expires` (`user_id`, `expires_at`),
  INDEX `idx_rt_expires`      (`expires_at`)
                     -- enables background sweeper: DELETE WHERE expires_at < NOW()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- ----------------------------------------------------------------------
-- 1.7 — login_audit (NEW) — BR-AUTH-06: every login attempt logged
-- ----------------------------------------------------------------------
-- Uses employee_id (not user_id) because failed-not-found logins have
-- no matching users row.
CREATE TABLE `login_audit` (
  `audit_id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `employee_id`      VARCHAR(7)      NOT NULL
                     COMMENT 'What the user typed; may not exist in cmms_emp_mst',
  `attempt_at`       DATETIME(6)     NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `outcome`          ENUM(
                       'SUCCESS',
                       'FAILED_BAD_PASSWORD',
                       'FAILED_USER_LOCKED',
                       'FAILED_USER_INACTIVE',
                       'FAILED_NOT_FOUND',
                       'FAILED_INVALID_FORMAT',
                       'LOGOUT',
                       'TOKEN_REFRESH'
                     ) NOT NULL,
  `ip_address`       VARCHAR(45)     NULL DEFAULT NULL,
  `user_agent`       VARCHAR(500)    NULL DEFAULT NULL,
  `notes`            VARCHAR(255)    NULL DEFAULT NULL,
  PRIMARY KEY (`audit_id`),
  INDEX `idx_la_emp_time`  (`employee_id`, `attempt_at`),
  INDEX `idx_la_time`      (`attempt_at`),
  INDEX `idx_la_outcome`   (`outcome`, `attempt_at`)
                     COMMENT 'Powers "failed logins last 24h" dashboards'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

### 7.5 Permission Grant Matrix — full mapping

Each `INSERT INTO role_permissions` row was derived directly from FINAL-DESC §6 (the ✓/✗ matrix). This is the **single source of truth** the runtime reads on every authenticated request.

```sql
-- ----------------------------------------------------------------------
-- 1.8 — role_permissions SEED (full matrix per FINAL-DESC §6)
-- ----------------------------------------------------------------------
-- Strategy:
--   Super Admin (role_id=1)   → ALL permissions
--   Other roles               → explicit grants per matrix
-- Granted_by = 'BOOTSTRAP' for all initial grants.

-- 1.8.a — SUPER_ADMIN gets every permission
INSERT INTO `role_permissions` (`role_id`, `permission_id`, `granted_by`)
SELECT 1, p.`permission_id`, 'BOOTSTRAP'
  FROM `permissions` p;

-- 1.8.b — LAB_IN_CHARGE permissions (role_id=2)
INSERT INTO `role_permissions` (`role_id`, `permission_id`, `granted_by`)
SELECT 2, p.`permission_id`, 'BOOTSTRAP'
  FROM `permissions` p
 WHERE p.`permission_code` IN (
   -- Auth & self
   'auth:login', 'auth:logout', 'auth:refresh-token', 'me:read',
   -- Equipment
   'equipment:read-list', 'equipment:read-detail',
   'equipment:create',    'equipment:update',
   'equipment:verify',    'equipment:condemn',
   -- Job Requests (full lifecycle except create-own only)
   'job_request:create', 'job_request:read-own', 'job_request:read-all',
   'job_request:approve','job_request:reject', 'job_request:assign-engineer',
   -- Job Cards (full lifecycle including verify-close + reopen)
   'job_card:read-list',  'job_card:read-detail',
   'job_card:start-work', 'job_card:update-tasks',
   'job_card:complete',   'job_card:verify-close',
   'job_card:reopen',     'job_card:generate-pdf',
   -- Dashboard & Inquiry
   'dashboard:view',
   'inquiry:search-vendors',     'inquiry:search-products',
   'inquiry:search-job-cards',   'inquiry:search-instruments',
   -- Export
   'export:trigger'
 );

-- 1.8.c — LAB_ENGINEER permissions (role_id=3)
INSERT INTO `role_permissions` (`role_id`, `permission_id`, `granted_by`)
SELECT 3, p.`permission_id`, 'BOOTSTRAP'
  FROM `permissions` p
 WHERE p.`permission_code` IN (
   'auth:login', 'auth:logout', 'auth:refresh-token', 'me:read',
   -- Equipment (read + create + update; NOT verify/condemn/delete)
   'equipment:read-list', 'equipment:read-detail',
   'equipment:create',    'equipment:update',
   -- Job Requests (read + create own)
   'job_request:create', 'job_request:read-own', 'job_request:read-all',
   -- Job Cards (execute, not verify-close)
   'job_card:read-list',  'job_card:read-detail',
   'job_card:start-work', 'job_card:update-tasks', 'job_card:complete',
   'job_card:generate-pdf',
   -- Dashboard & Inquiry
   'dashboard:view',
   'inquiry:search-vendors',     'inquiry:search-products',
   'inquiry:search-job-cards',   'inquiry:search-instruments',
   -- Export (engineer can export own job cards as PDF)
   'export:trigger'
 );

-- 1.8.d — NORMAL_USER permissions (role_id=4)
INSERT INTO `role_permissions` (`role_id`, `permission_id`, `granted_by`)
SELECT 4, p.`permission_id`, 'BOOTSTRAP'
  FROM `permissions` p
 WHERE p.`permission_code` IN (
   'auth:login', 'auth:logout', 'auth:refresh-token', 'me:read',
   -- Equipment (read + create only)
   'equipment:read-list', 'equipment:read-detail', 'equipment:create',
   -- Job Requests (create own + read own)
   'job_request:create', 'job_request:read-own',
   -- Dashboard
   'dashboard:view',
   -- Inquiry (limited)
   'inquiry:search-vendors',  'inquiry:search-products',
   'inquiry:search-instruments'
 );

-- 1.8.e — VIEW_ONLY permissions (role_id=5)
INSERT INTO `role_permissions` (`role_id`, `permission_id`, `granted_by`)
SELECT 5, p.`permission_id`, 'BOOTSTRAP'
  FROM `permissions` p
 WHERE p.`permission_code` IN (
   'auth:login', 'auth:logout', 'auth:refresh-token', 'me:read',
   -- Equipment (read only)
   'equipment:read-list', 'equipment:read-detail',
   -- Job Requests (read all, no create)
   'job_request:read-own', 'job_request:read-all',
   -- Job Cards (read only)
   'job_card:read-list', 'job_card:read-detail', 'job_card:generate-pdf',
   -- Dashboard
   'dashboard:view',
   -- Inquiry (all)
   'inquiry:search-vendors',     'inquiry:search-products',
   'inquiry:search-job-cards',   'inquiry:search-instruments'
 );
```

### 7.6 Bootstrap Seed — SA79900 and AC77777

```sql
-- ----------------------------------------------------------------------
-- 1.9 — BOOTSTRAP — Insert Super Admins
-- ----------------------------------------------------------------------
-- Reads env: SUPER_ADMIN_EMPLOYEE_IDS=SA79900,AC77777
-- Runs once on first deploy. Idempotent (uses IF NOT EXISTS semantics).

-- 1.9.a — Insert into cmms_emp_mst (legacy employee directory)
-- These are NEW employee records per Q2.
-- EMM_DEPT requires an existing SM_ID (FK); see Open Pre-Bootstrap Note below.

INSERT INTO `cmms_emp_mst` (
  `EMM_ID`, `EMM_NAME`, `EMM_DESIGNATION`, `EMM_DEPT`,
  `EMM_EMAIL`, `EMM_INACTIVE`,
  `EMM_CREATED_BY`, `EMM_CREATED_ON`,
  `EMM_UPDATED_BY`, `EMM_UPDATED_ON`
) VALUES
  ('SA79900', 'Super Admin Primary',   'System Administrator', /*EMM_DEPT*/ ?,
   'sa79900@org.local', 0,
   'BOOTSTRAP', CURRENT_TIMESTAMP(6),
   'BOOTSTRAP', CURRENT_TIMESTAMP(6)),
  ('AC77777', 'Super Admin Secondary', 'System Administrator', /*EMM_DEPT*/ ?,
   'ac77777@org.local', 0,
   'BOOTSTRAP', CURRENT_TIMESTAMP(6),
   'BOOTSTRAP', CURRENT_TIMESTAMP(6));

-- NOTE: EMM_DEPT is FK to cmms_section_mst(SM_ID) which has 293 legacy rows.
-- The bootstrap migration MUST resolve a valid SM_ID before running.
-- Three approaches:
--   (a) DS picks an existing SM_ID from cmms_section_mst (e.g., admin section)
--   (b) Insert a new SM_ID (e.g., SM_ID=9999 'ADMIN' / 'System Admin')
--   (c) Add an ALTER to make EMM_DEPT nullable for admins (avoid; breaks invariant)
-- Recommendation: (b) — insert a single 'ADMIN' section row in cmms_section_mst.
-- See Section 17 Bootstrap Seed Order step 2.


-- 1.9.b — Insert into new users table
-- password_hash = bcrypt(employee_id, rounds=12)
-- In SQL we cannot bcrypt directly; the migration runner computes the hashes
-- in Node.js (bcryptjs) and substitutes them in.

INSERT INTO `users` (
  `employee_id`, `password_hash`, `section_id`,
  `is_active`, `is_locked`,
  `password_hash_set_at`,
  `created_at`, `created_by`,
  `updated_at`, `updated_by`
) VALUES
  ('SA79900', /*bcrypt('SA79900')*/ '$2a$12$REPLACE_AT_RUNTIME', /*section_id*/ NULL,
   1, 0,
   CURRENT_TIMESTAMP(6),
   CURRENT_TIMESTAMP(6), 'BOOTSTRAP',
   CURRENT_TIMESTAMP(6), 'BOOTSTRAP'),
  ('AC77777', /*bcrypt('AC77777')*/ '$2a$12$REPLACE_AT_RUNTIME', /*section_id*/ NULL,
   1, 0,
   CURRENT_TIMESTAMP(6),
   CURRENT_TIMESTAMP(6), 'BOOTSTRAP',
   CURRENT_TIMESTAMP(6), 'BOOTSTRAP');


-- 1.9.c — Grant SUPER_ADMIN role to both
INSERT INTO `user_roles` (`user_id`, `role_id`, `assigned_at`, `assigned_by`)
SELECT u.`user_id`, 1 /* SUPER_ADMIN */, CURRENT_TIMESTAMP(6), 'BOOTSTRAP'
  FROM `users` u
 WHERE u.`employee_id` IN ('SA79900', 'AC77777');


-- 1.9.d — Write to audit_log (defined in Cluster 10)
INSERT INTO `audit_log`
  (`actor_employee_id`, `action`, `entity_type`, `entity_id`, `notes`)
VALUES
  ('BOOTSTRAP', 'EMPLOYEE_CREATE', 'cmms_emp_mst', 'SA79900', 'Bootstrap Super Admin seed'),
  ('BOOTSTRAP', 'EMPLOYEE_CREATE', 'cmms_emp_mst', 'AC77777', 'Bootstrap Super Admin seed'),
  ('BOOTSTRAP', 'USER_CREATE',     'users',        'SA79900', 'password=employee_id (bcrypt)'),
  ('BOOTSTRAP', 'USER_CREATE',     'users',        'AC77777', 'password=employee_id (bcrypt)'),
  ('BOOTSTRAP', 'ROLE_ASSIGN',     'user_roles',   'SA79900', 'role=SUPER_ADMIN'),
  ('BOOTSTRAP', 'ROLE_ASSIGN',     'user_roles',   'AC77777', 'role=SUPER_ADMIN');
```

### 7.7 Real-World Walkthroughs

**Walkthrough A: SA79900 logs in for the first time**

```
   Step 1   DS opens browser → /login
   Step 2   Enters employee_id: SA79900
            Enters password:    SA79900
   Step 3   Frontend zod schema validates regex ^[A-Z]{2}[0-9]{5}$ → OK
   Step 4   POST /api/v1/auth/login → { employee_id: 'SA79900', password: 'SA79900' }
   Step 5   Backend:
            ─► Same zod schema validates → OK
            ─► SELECT * FROM users WHERE employee_id='SA79900' AND is_active=1 AND is_locked=0
            ─► Row found. user_id=1.
            ─► bcrypt.compare('SA79900', row.password_hash) → TRUE
            ─► SELECT role + permissions:
                SELECT r.role_code, p.permission_code
                  FROM user_roles ur
                  JOIN roles r ON r.role_id=ur.role_id
                  JOIN role_permissions rp ON rp.role_id=r.role_id
                  JOIN permissions p ON p.permission_id=rp.permission_id
                 WHERE ur.user_id=1;
            ─► Returns: role=SUPER_ADMIN + ~40 permissions
   Step 6   Backend issues:
            ─► JWT (15 min, contains sub=SA79900, role=SUPER_ADMIN, perms=[...])
            ─► refresh_token (7 days, raw token in httpOnly cookie,
               sha256(raw) stored in refresh_tokens table)
   Step 7   Backend writes login_audit row: outcome=SUCCESS
   Step 8   Backend updates users.last_login_at + last_login_ip,
            resets failed_login_count=0
   Step 9   Frontend receives 200 + JWT, stores in memory,
            navigates to /dashboard
   Step 10  Sidebar renders only items whose permissions exist in the JWT.
            For SUPER_ADMIN this means: everything.
```

**Walkthrough B: SA79900 creates a Normal User**

```
   Step 1   SA79900 opens /admin/users → click "Add User"
   Step 2   Enters: employee_id=DS00001 (must already exist in cmms_emp_mst)
                    role=NORMAL_USER (dropdown of 5 roles)
                    section=T&ME (dropdown from sections table)
   Step 3   POST /api/v1/admin/users
   Step 4   authorize('user:role-assign') passes (SUPER_ADMIN has it)
   Step 5   Backend:
            ─► SELECT * FROM cmms_emp_mst WHERE EMM_ID='DS00001'
               → must exist (BR-AUTH-02: no self-registration)
            ─► INSERT INTO users(employee_id, password_hash, section_id, ...)
               VALUES ('DS00001', bcrypt('DS00001', 12), 2 /*T&ME*/, ...)
            ─► INSERT INTO user_roles(user_id, role_id, assigned_by)
               VALUES (?, 4 /*NORMAL_USER*/, 'SA79900')
            ─► INSERT INTO audit_log(...) with action='USER_CREATE'
   Step 6   Response 201 Created
   Step 7   DS00001 can now login with employee_id=DS00001 and password=DS00001
```

**Walkthrough C: SA79900 changes a Lab Engineer to Lab In-Charge**

```
   Step 1   SA79900 opens /admin/users/MK00045 → click "Change Role"
   Step 2   Select new role: LAB_IN_CHARGE
   Step 3   PATCH /api/v1/admin/users/MK00045/role  { role_code:'LAB_IN_CHARGE' }
   Step 4   authorize('user:role-assign') passes
   Step 5   Backend:
            ─► UPDATE user_roles
                  SET role_id=2 /*LAB_IN_CHARGE*/, assigned_at=NOW(), assigned_by='SA79900'
                WHERE user_id=(SELECT user_id FROM users WHERE employee_id='MK00045')
            ─► INSERT INTO audit_log with action='ROLE_CHANGE',
                  notes='role: LAB_ENGINEER → LAB_IN_CHARGE'
   Step 6   Per BR-RBAC-07: role change takes effect on MK00045's next login OR
            next token refresh. No forced logout. MK00045's current 15-min JWT
            still says LAB_ENGINEER; in ≤15 min the refresh hits and re-reads
            permissions; from that point the JWT says LAB_IN_CHARGE.
```

### 7.8 Auth Module — Files & Code Touchpoints

For DS to know which files in the backend layered structure each table feeds.

| Table                | Repository file                           | Service file                       | Controller file                          |
| -------------------- | ----------------------------------------- | ---------------------------------- | ---------------------------------------- |
| `users`            | `modules/users/users.repo.js`           | `modules/users/users.service.js` | `modules/users/users.controller.js`    |
| `roles`            | `modules/auth/roles.repo.js`            | `modules/auth/auth.service.js`   | `modules/auth/auth.controller.js`      |
| `permissions`      | `modules/auth/permissions.repo.js`      | `modules/auth/auth.service.js`   | — (read at app boot, cached)            |
| `role_permissions` | `modules/auth/role-permissions.repo.js` | `modules/auth/auth.service.js`   | `modules/admin/admin.controller.js`    |
| `user_roles`       | `modules/users/user-roles.repo.js`      | `modules/users/users.service.js` | `modules/admin/admin.controller.js`    |
| `refresh_tokens`   | `modules/auth/refresh-tokens.repo.js`   | `modules/auth/auth.service.js`   | `modules/auth/auth.controller.js`      |
| `login_audit`      | `modules/auth/login-audit.repo.js`      | `modules/auth/auth.service.js`   | — (write only, no read endpoint in MVP) |

---

## 8. CLUSTER 2 — ORGANISATION (NEW)

Per Q8, fresh org tables. The legacy `cmms_section_mst` (293 rows) and `cmms_emp_mst.EMM_DEPT` stay untouched. New tables sit alongside.

### 8.1 Why two tables (department + section), not just one

```
   ┌────────────────────────────────────────────────────────────────┐
   │                  ORG HIERARCHY (LOCKED per DS)                  │
   └────────────────────────────────────────────────────────────────┘

                       TIMCD  (Department)
                          │
              ┌───────────┴───────────┐
              │                       │
            T&ME                    F&PE
         (Section)               (Section)
       Test & Measurement   Fabrication & Production
       Equipment            Equipment
              │                       │
              ▼                       ▼
       Users assigned          Users assigned
       to T&ME work            to F&PE work
       on T&ME equipment       on F&PE equipment
```

Two tables (instead of one denormalised `org_units` table) because:

- **Type safety** at FK time: `users.section_id` → `sections.section_id` is unambiguous.
- **Easier filtering** for dashboards: "All T&ME equipment" = `WHERE section_id = (SELECT section_id FROM sections WHERE section_code='TME')`.
- **Future-proof**: When more sections appear (e.g., TIMCD adds 'CALIBRATION_LAB'), it's one INSERT, no restructuring.

### 8.2 DDL — Cluster 2

```sql
-- ════════════════════════════════════════════════════════════════════
-- CLUSTER 2: ORGANISATION (NEW)
-- Locked: Q8 (new tables for org structure)
-- ════════════════════════════════════════════════════════════════════

-- ----------------------------------------------------------------------
-- 2.1 — departments (NEW)
-- ----------------------------------------------------------------------
CREATE TABLE `departments` (
  `department_id`         SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `department_code`       VARCHAR(20)       NOT NULL
                          COMMENT 'Short upper-case code; e.g., TIMCD',
  `department_name`       VARCHAR(150)      NOT NULL
                          COMMENT 'Full name; e.g., "Test, Inspection, Maintenance, Calibration Division"',
  `department_description` VARCHAR(500)     NULL DEFAULT NULL,
  `is_active`             TINYINT(1)        NOT NULL DEFAULT 1,
  `created_at`            DATETIME(6)       NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by`            VARCHAR(7)        NULL DEFAULT NULL,
  `updated_at`            DATETIME(6)       NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
                                            ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by`            VARCHAR(7)        NULL DEFAULT NULL,
  PRIMARY KEY (`department_id`),
  UNIQUE KEY `uk_dept_code` (`department_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- SEED (locked TIMCD only for MVP)
INSERT INTO `departments` (`department_code`, `department_name`, `department_description`, `created_by`) VALUES
  ('TIMCD', 'Test/Inspection/Maintenance/Calibration Division',
   'Parent department housing both T&ME and F&PE sections', 'BOOTSTRAP');


-- ----------------------------------------------------------------------
-- 2.2 — sections (NEW)
-- ----------------------------------------------------------------------
CREATE TABLE `sections` (
  `section_id`        INT UNSIGNED      NOT NULL AUTO_INCREMENT,
  `department_id`     SMALLINT UNSIGNED NOT NULL,
  `section_code`      VARCHAR(20)       NOT NULL
                      COMMENT 'Short upper-case code; e.g., TME, FPE',
  `section_name`      VARCHAR(150)      NOT NULL
                      COMMENT 'Full name; e.g., "Test & Measurement Equipment"',
  `section_description` VARCHAR(500)    NULL DEFAULT NULL,
  `equipment_category` ENUM('TME', 'FPE') NOT NULL
                      COMMENT 'Locked equipment category: TME = Test & Measurement; FPE = Fabrication & Production',
  `head_employee_id`  VARCHAR(7)        NULL DEFAULT NULL
                      COMMENT 'Section head (Lab In-Charge typically). FK to cmms_emp_mst.EMM_ID',
  `is_active`         TINYINT(1)        NOT NULL DEFAULT 1,
  `created_at`        DATETIME(6)       NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by`        VARCHAR(7)        NULL DEFAULT NULL,
  `updated_at`        DATETIME(6)       NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
                                        ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by`        VARCHAR(7)        NULL DEFAULT NULL,
  PRIMARY KEY (`section_id`),
  UNIQUE KEY `uk_sect_code` (`section_code`),
  CONSTRAINT `fk_sections_department`
    FOREIGN KEY (`department_id`) REFERENCES `departments` (`department_id`),
  CONSTRAINT `fk_sections_head_emp`
    FOREIGN KEY (`head_employee_id`) REFERENCES `cmms_emp_mst` (`EMM_ID`),
  INDEX `idx_sect_dept` (`department_id`),
  INDEX `idx_sect_category` (`equipment_category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- SEED (locked T&ME and F&PE only for MVP)
INSERT INTO `sections`
  (`department_id`, `section_code`, `section_name`,
   `equipment_category`, `head_employee_id`, `created_by`)
VALUES
  ((SELECT department_id FROM departments WHERE department_code='TIMCD'),
   'TME', 'Test & Measurement Equipment',
   'TME', NULL, 'BOOTSTRAP'),
  ((SELECT department_id FROM departments WHERE department_code='TIMCD'),
   'FPE', 'Fabrication & Production Equipment',
   'FPE', NULL, 'BOOTSTRAP');


-- ----------------------------------------------------------------------
-- 2.3 — Wire users.section_id FK (deferred from Cluster 1)
-- ----------------------------------------------------------------------
-- Now that sections exists, we add the FK constraint on users.section_id.
ALTER TABLE `users`
  ADD CONSTRAINT `fk_users_section`
    FOREIGN KEY (`section_id`) REFERENCES `sections` (`section_id`);
```

### 8.3 Cluster 2 — Legacy Tables (KEEP, no MVP code reads)

| Legacy table             | Rows | Why kept                                                                                                |
| ------------------------ | ---- | ------------------------------------------------------------------------------------------------------- |
| `cmms_section_mst`     | 293  | FK target for `cmms_emp_mst.EMM_DEPT` + 12 other legacy tables. UNTOUCHED.                            |
| `cmms_designation_mst` | 40   | Designation lookup; may be useful in P2 master data UI.                                                 |
| `cmms_proj_mst`        | 182  | Project master; FK target for `cmms_jobrequest_project_dtl` and `cmms_jobcard_request_project_dtl`. |

### 8.4 Mapping — old `cmms_section_mst` → new `sections`

NOT a Phase 3 task. Phase 2 will provide a UI for Super Admins to either:

- (a) Map each of the 293 legacy SM_ID rows to a new `section_id`
- (b) Mark legacy sections as "archived only" and let new users use new sections

For MVP, **no mapping is required**. New users get `users.section_id` pointing at the new `sections` table; equipment newly registered gets its T&ME/F&PE classification via the same.

---

## 9. CLUSTER 3 — EQUIPMENT MASTER

Per Q1, `cmms_cont_mst` is fresh-designed. Per Q5, `equipment_status_history` is a new, separate table.

### 9.1 Architecture Diagram — Cluster 3

```
   ┌────────────────────────────────────────────────────────────────┐
   │                EQUIPMENT MASTER — DATA FLOW                     │
   └────────────────────────────────────────────────────────────────┘

       cmms_cont_mst (NEW, vendor master)
         CMM_CONT_ID  PK
         CMM_CONT_NAME, CMM_CONT_TYPE (MFR/VENDOR/BOTH)
              │
              │ FK from many places
              │
              ▼
       cmms_eqip_mst (LEGACY KEEP + ALTER)
         (EQM_TYPE, EQM_ID) composite PK
         5,704 existing rows
         + EQM_VERIFIED_BY/ON (NEW columns)
         + EQM_MVP_STATUS (NEW ENUM column, default PENDING_VERIFICATION)
              │
              │ status transitions logged here
              ▼
       equipment_status_history (NEW)
         from_status → to_status
         transitioned_by, transitioned_at, reason
         related_job_card (nullable)

       (Other related legacy tables — KEEP as-is:)
         cmms_eqip_mst_hist       519 rows  full snapshot history
         cmms_eqipinst_identification  2,286  sub-instruments
         cmms_ins_accuracy_info    1,501  accuracy/range/unit
         cmms_division_hist        3,676  division change history
         cmms_product_mst             32  product/instrument types
         cmms_fault_mst               30  fault catalogue
```

### 9.2 DDL — Cluster 3

```sql
-- ════════════════════════════════════════════════════════════════════
-- CLUSTER 3: EQUIPMENT MASTER
-- Locked: Q1 (new cmms_cont_mst), Q5 (separate equipment_status_history)
-- ════════════════════════════════════════════════════════════════════

-- ----------------------------------------------------------------------
-- 3.1 — cmms_cont_mst (NEW — per Q1) — vendor/manufacturer master
-- ----------------------------------------------------------------------
-- Named cmms_cont_mst (with cmms_ prefix) explicitly so existing legacy
-- FKs from cmms_eqip_mst.EQM_MFRID, cmms_amc_mst.AMC_VENDERID,
-- cmms_checklist_mst.CHKL_MAKE, cmms_inv_mst.INV_MCODE all work.
-- (See ADR-DB-06.)

CREATE TABLE `cmms_cont_mst` (
  `CMM_CONT_ID`         INT             NOT NULL AUTO_INCREMENT
                        COMMENT 'Surrogate PK; referenced by 4 legacy tables',
  `CMM_CONT_NAME`       VARCHAR(200)    NOT NULL
                        COMMENT 'Vendor / manufacturer name',
  `CMM_CONT_TYPE`       ENUM('MFR', 'VENDOR', 'BOTH', 'OEM') NOT NULL DEFAULT 'BOTH'
                        COMMENT 'Manufacturer / Vendor / Both / OEM',
  `CMM_CONT_CONTACT_PERSON` VARCHAR(150) NULL DEFAULT NULL,
  `CMM_CONT_EMAIL`      VARCHAR(150)    NULL DEFAULT NULL,
  `CMM_CONT_PHONE`      VARCHAR(50)     NULL DEFAULT NULL,
  `CMM_CONT_MOBILE`     VARCHAR(50)     NULL DEFAULT NULL,
  `CMM_CONT_ADDRESS`    VARCHAR(500)    NULL DEFAULT NULL,
  `CMM_CONT_CITY`       VARCHAR(100)    NULL DEFAULT NULL,
  `CMM_CONT_STATE`      VARCHAR(100)    NULL DEFAULT NULL,
  `CMM_CONT_COUNTRY`    VARCHAR(100)    NULL DEFAULT NULL,
  `CMM_CONT_ZIP`        VARCHAR(20)     NULL DEFAULT NULL,
  `CMM_CONT_WEBSITE`    VARCHAR(255)    NULL DEFAULT NULL,
  `CMM_CONT_GSTIN`      VARCHAR(20)     NULL DEFAULT NULL
                        COMMENT 'GST Identification Number (India)',
  `CMM_CONT_PAN`        VARCHAR(20)     NULL DEFAULT NULL,
  `CMM_CONT_NABL`       TINYINT(1)      NOT NULL DEFAULT 0
                        COMMENT 'NABL accredited (relevant for calibration vendors)',
  `CMM_CONT_NABL_CERT_NO` VARCHAR(50)   NULL DEFAULT NULL,
  `CMM_CONT_REMARKS`    VARCHAR(1000)   NULL DEFAULT NULL,
  `CMM_CONT_STATE_FLAG` TINYINT(1)      NOT NULL DEFAULT 1
                        COMMENT 'is_active flag — keeps existing column-naming pattern of cmms_* tables',
  `CMM_CONT_CREATED_BY` VARCHAR(7)      NOT NULL,
  `CMM_CONT_CREATED_ON` DATETIME(6)     NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `CMM_CONT_UPDATED_BY` VARCHAR(7)      NOT NULL,
  `CMM_CONT_UPDATED_ON` DATETIME(6)     NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
                                        ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`CMM_CONT_ID`),
  UNIQUE KEY `uk_cont_name` (`CMM_CONT_NAME`),
  INDEX `idx_cont_type`   (`CMM_CONT_TYPE`),
  INDEX `idx_cont_active` (`CMM_CONT_STATE_FLAG`),
  INDEX `idx_cont_name_search` (`CMM_CONT_NAME`(50))
                        COMMENT 'For inquiry:search-vendors'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- NOTE on data: cmms_cont_mst is empty at creation. The 5,704 rows in
-- cmms_eqip_mst that reference EQM_MFRID currently have orphaned FKs
-- (since the parent table didn't exist). The migration runner will:
--   1. Create cmms_cont_mst (this DDL)
--   2. Optionally seed with placeholder MFR rows derived from
--      DISTINCT EQM_MFG_MODEL_NAME in cmms_eqip_mst, so historical
--      FKs validate. See "Migration Data Requirements" in Section 18.
-- For MVP, vendors can be added via Super Admin CRUD (Phase 2 UI) or
-- phpMyAdmin direct entry in Week 2.


-- ----------------------------------------------------------------------
-- 3.2 — ALTER cmms_eqip_mst (legacy KEEP + new columns)
-- ----------------------------------------------------------------------
-- Add formal MVP status enum + verification metadata required by BR-EQP-09,
-- BR-EQP-10, D10. Add helpful indexes.

ALTER TABLE `cmms_eqip_mst`
  -- BR-EQP-09: verification audit trail
  ADD COLUMN `EQM_VERIFIED_BY`   VARCHAR(7)  NULL DEFAULT NULL
       COMMENT 'employee_id of Lab In-Charge / Super Admin who verified (PENDING → ACTIVE)' AFTER `EQM_CREATED_BY`,
  ADD COLUMN `EQM_VERIFIED_ON`   DATETIME(6) NULL DEFAULT NULL AFTER `EQM_VERIFIED_BY`,

  -- D10 / BR-EQP-10: formal MVP status (separate from legacy EQM_DIV_STATUS varchar)
  ADD COLUMN `EQM_MVP_STATUS` ENUM(
      'PENDING_VERIFICATION',
      'ACTIVE',
      'UNDER_CALIBRATION',
      'UNDER_REPAIR',
      'OUT_OF_TOLERANCE',
      'QUARANTINED',
      'CONDEMNED',
      'RETIRED'
    ) NOT NULL DEFAULT 'PENDING_VERIFICATION'
       COMMENT 'D10: new equipment defaults to PENDING_VERIFICATION' AFTER `EQM_DIV_STATUS`,
  ADD COLUMN `EQM_MVP_STATUS_AT` DATETIME(6) NULL DEFAULT NULL
       COMMENT 'When current MVP status was set' AFTER `EQM_MVP_STATUS`,

  -- Section linkage (NEW — points at new sections table; nullable for legacy 5,704)
  ADD COLUMN `EQM_SECTION_ID` INT UNSIGNED NULL DEFAULT NULL
       COMMENT 'FK to new sections.section_id; classifies T&ME vs F&PE' AFTER `EQM_MVP_STATUS_AT`,

  -- Indexes for MVP query patterns
  ADD INDEX `idx_eqip_mvp_status`  (`EQM_MVP_STATUS`),
  ADD INDEX `idx_eqip_cal_due`     (`EQM_CAL_DUE_DATE`),
  ADD INDEX `idx_eqip_div`         (`EQM_DIVID`),
  ADD INDEX `idx_eqip_section_new` (`EQM_SECTION_ID`),
  ADD INDEX `idx_eqip_mfr`         (`EQM_MFRID`)
       COMMENT 'Speeds inquiry:search-products joining cmms_cont_mst',

  -- FK to new sections (added after sections table exists)
  ADD CONSTRAINT `fk_eqip_section_new`
    FOREIGN KEY (`EQM_SECTION_ID`) REFERENCES `sections` (`section_id`);

-- Backfill: existing 5,704 rows get EQM_MVP_STATUS='ACTIVE' (they were
-- already in production use; PENDING_VERIFICATION only applies to NEW).
UPDATE `cmms_eqip_mst`
   SET `EQM_MVP_STATUS` = 'ACTIVE',
       `EQM_MVP_STATUS_AT` = COALESCE(`EQM_UPDATED_ON`, `EQM_CREATED_ON`, NOW(6))
 WHERE `EQM_MVP_STATUS` = 'PENDING_VERIFICATION';


-- ----------------------------------------------------------------------
-- 3.3 — equipment_status_history (NEW per Q5)
-- ----------------------------------------------------------------------
-- Records every state-machine transition on cmms_eqip_mst.EQM_MVP_STATUS.
-- Separate from cmms_division_hist (which records division/group changes).

CREATE TABLE `equipment_status_history` (
  `history_id`        BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `eqm_type`          VARCHAR(15)     NOT NULL,
  `eqm_id`            INT             NOT NULL,
  `from_status`       VARCHAR(30)     NULL DEFAULT NULL
                      COMMENT 'NULL on first row (initial PENDING_VERIFICATION)',
  `to_status`         VARCHAR(30)     NOT NULL,
  `transitioned_at`   DATETIME(6)     NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `transitioned_by`   VARCHAR(7)      NOT NULL
                      COMMENT 'employee_id of actor (Lab In-Charge / Super Admin)',
  `reason`            VARCHAR(500)    NULL DEFAULT NULL
                      COMMENT 'Mandatory for CONDEMN/QUARANTINE transitions',
  `related_job_card`  VARCHAR(9)      NULL DEFAULT NULL
                      COMMENT 'Set when transition triggered by a job card (e.g., UNDER_CAL on JC START)',
  PRIMARY KEY (`history_id`),
  CONSTRAINT `fk_esh_eqip`
    FOREIGN KEY (`eqm_type`, `eqm_id`)
    REFERENCES `cmms_eqip_mst` (`EQM_TYPE`, `EQM_ID`),
  CONSTRAINT `fk_esh_actor`
    FOREIGN KEY (`transitioned_by`)
    REFERENCES `cmms_emp_mst` (`EMM_ID`),
  CONSTRAINT `fk_esh_jc`
    FOREIGN KEY (`related_job_card`)
    REFERENCES `cmms_jobcard_mst` (`JM_SectionJobNo`),
  INDEX `idx_esh_eqip_time` (`eqm_type`, `eqm_id`, `transitioned_at` DESC),
  INDEX `idx_esh_time`      (`transitioned_at` DESC),
  INDEX `idx_esh_actor`     (`transitioned_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

### 9.3 Cluster 3 — Tables Summary

| Table                            | Bucket   | Rows                       | Purpose                                   |
| -------------------------------- | -------- | -------------------------- | ----------------------------------------- |
| `cmms_cont_mst`                | 🌱 NEW   | 0 → vendor master to seed | Vendor / mfr master, FK target for legacy |
| `cmms_eqip_mst`                | 🔧 ALTER | 5,704                      | Equipment master + new MVP_STATUS enum    |
| `equipment_status_history`     | 🌱 NEW   | 0                          | State machine log per equipment           |
| `cmms_eqip_mst_hist`           | ✅ KEEP  | 519                        | Full historical snapshots (legacy)        |
| `cmms_eqipinst_identification` | ✅ KEEP  | 2,286                      | Sub-instrument identification             |
| `cmms_ins_accuracy_info`       | ✅ KEEP  | 1,501                      | Accuracy/range/unit per instrument        |
| `cmms_division_hist`           | ✅ KEEP  | 3,676                      | Equipment division history (legacy)       |
| `cmms_product_mst`             | ✅ KEEP  | 32                         | Instrument types (TME/FPE/etc.)           |
| `cmms_fault_mst`               | ✅ KEEP  | 30                         | Fault category lookup                     |

---

## 10. CLUSTER 4 — JOB LIFECYCLE

Per Q6, `job_request_status_history` is new. Job card status history already exists (`cmms_jobcard_status_hist`, 22,214 rows) and stays.

### 10.1 Architecture Diagram — Job Lifecycle Flow

```
   USER (Normal/Eng) raises request                LAB IN-CHARGE
                  │                                       │
                  ▼                                       ▼
   ╔══════════════════════════════╗      ╔══════════════════════════════╗
   ║ cmms_jobrequest_mst          ║      ║ cmms_jobcard_mst             ║
   ║ ─ JR_JOBREQUESTNO (PK)        ║      ║ ─ JM_SectionJobNo (PK)       ║
   ║ + JR_MVP_STATUS (NEW)         ║      ║ + JM_MVP_STATUS (NEW)        ║
   ║   DRAFT/SUBMITTED/ASSIGNED/   ║      ║   ASSIGNED/IN_PROGRESS/      ║
   ║   IN_PROGRESS/COMPLETED/      ║      ║   COMPLETED/VERIFIED_CLOSED/ ║
   ║   VERIFIED_CLOSED/REJECTED/   ║      ║   REOPENED                   ║
   ║   REOPENED                    ║      ║ + JM_VERIFIED_BY/ON          ║
   ║ + JR_APPROVED_BY/ON           ║      ║ + JM_REOPENED_REASON         ║
   ║ + JR_REJECTED_BY/ON +REASON   ║      ║                              ║
   ║ + JR_PRIORITY                 ║      ║ 19,432 existing rows         ║
   ║ 21,485 existing rows          ║      ╚══════════════════════════════╝
   ╚══════════════════════════════╝                       │
                  │                                       │
                  ▼                                       ▼
   ┌──────────────────────────────┐      ┌──────────────────────────────┐
   │ job_request_status_history   │      │ cmms_jobcard_status_hist     │
   │ (NEW per Q6)                  │      │ (LEGACY KEEP — 22,214 rows)  │
   │ jr_no, from_status,           │      │ Already perfect for our use  │
   │ to_status, by, at, reason     │      │                              │
   └──────────────────────────────┘      └──────────────────────────────┘

   PLUS: 18 jobcard/jobrequest detail tables ALL KEEP as-is
         (~280,000 rows total — mature, rich, reusable)
```

### 10.2 DDL — Cluster 4

```sql
-- ════════════════════════════════════════════════════════════════════
-- CLUSTER 4: JOB LIFECYCLE
-- Locked: Q6 (separate job_request_status_history)
-- ════════════════════════════════════════════════════════════════════

-- ----------------------------------------------------------------------
-- 4.1 — ALTER cmms_jobrequest_mst (legacy KEEP + new columns)
-- ----------------------------------------------------------------------

ALTER TABLE `cmms_jobrequest_mst`
  ADD COLUMN `JR_MVP_STATUS` ENUM(
      'DRAFT', 'SUBMITTED', 'ASSIGNED',
      'IN_PROGRESS', 'COMPLETED', 'VERIFIED_CLOSED',
      'REJECTED', 'REOPENED'
    ) NOT NULL DEFAULT 'DRAFT'
       COMMENT 'BR-JR state machine; FINAL-DESC §8.1' AFTER `JR_REQUEST_TYPE`,
  ADD COLUMN `JR_MVP_STATUS_AT`    DATETIME(6) NULL DEFAULT NULL AFTER `JR_MVP_STATUS`,

  ADD COLUMN `JR_APPROVED_BY`      VARCHAR(7)  NULL DEFAULT NULL,
  ADD COLUMN `JR_APPROVED_ON`      DATETIME(6) NULL DEFAULT NULL,
  ADD COLUMN `JR_REJECTED_BY`      VARCHAR(7)  NULL DEFAULT NULL,
  ADD COLUMN `JR_REJECTED_ON`      DATETIME(6) NULL DEFAULT NULL,
  ADD COLUMN `JR_REJECTION_REASON` VARCHAR(500) NULL DEFAULT NULL
       COMMENT 'BR-JR-08: mandatory when rejecting',

  ADD COLUMN `JR_PRIORITY` ENUM('LOW','NORMAL','HIGH','URGENT')
       NOT NULL DEFAULT 'NORMAL'
       COMMENT 'BR-JR-07: high-priority repairs surface at top of LIC queue',

  ADD COLUMN `JR_ASSIGNED_ENGINEER` VARCHAR(7) NULL DEFAULT NULL
       COMMENT 'employee_id of Lab Engineer assigned by Lab In-Charge',

  ADD INDEX `idx_jr_status`        (`JR_MVP_STATUS`),
  ADD INDEX `idx_jr_priority`      (`JR_PRIORITY`, `JR_MVP_STATUS`),
  ADD INDEX `idx_jr_submittedby`   (`JR_SUBMITTEDBYID`),
  ADD INDEX `idx_jr_assigned_eng`  (`JR_ASSIGNED_ENGINEER`),
  ADD INDEX `idx_jr_division`      (`JR_DIVISION`);

-- Backfill: existing 21,485 rows
UPDATE `cmms_jobrequest_mst`
   SET `JR_MVP_STATUS` = CASE
         WHEN `JR_SECTIONJOB_NO` IS NOT NULL THEN 'ASSIGNED'
         ELSE 'SUBMITTED'
       END,
       `JR_MVP_STATUS_AT` = `JR_JOBREQUESTDATE`
 WHERE `JR_MVP_STATUS` = 'DRAFT';


-- ----------------------------------------------------------------------
-- 4.2 — ALTER cmms_jobcard_mst (legacy KEEP + new columns)
-- ----------------------------------------------------------------------

ALTER TABLE `cmms_jobcard_mst`
  ADD COLUMN `JM_MVP_STATUS` ENUM(
      'ASSIGNED', 'IN_PROGRESS', 'COMPLETED',
      'VERIFIED_CLOSED', 'REOPENED'
    ) NOT NULL DEFAULT 'ASSIGNED'
       COMMENT 'BR-JC state machine; FINAL-DESC §8' AFTER `JM_JobStatus`,
  ADD COLUMN `JM_VERIFIED_BY`      VARCHAR(7) NULL DEFAULT NULL,
  ADD COLUMN `JM_VERIFIED_ON`      DATETIME(6) NULL DEFAULT NULL,
  ADD COLUMN `JM_REOPENED_REASON`  VARCHAR(500) NULL DEFAULT NULL
       COMMENT 'BR-JC-05: mandatory when reopening',
  ADD INDEX `idx_jc_status`        (`JM_MVP_STATUS`),
  ADD INDEX `idx_jc_recd_date`     (`JM_JCRecdDate`);

-- Backfill: existing 19,432 jobcards. Map the old single-char JM_JobStatus
-- to the new enum where possible (data migration detail; see Section 18).
-- Default safe fallback: VERIFIED_CLOSED for any closed-looking record.


-- ----------------------------------------------------------------------
-- 4.3 — job_request_status_history (NEW per Q6)
-- ----------------------------------------------------------------------

CREATE TABLE `job_request_status_history` (
  `history_id`           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `jr_no`                INT             NOT NULL
                         COMMENT 'FK to cmms_jobrequest_mst.JR_JOBREQUESTNO',
  `from_status`          VARCHAR(30)     NULL DEFAULT NULL
                         COMMENT 'NULL on initial DRAFT row',
  `to_status`            VARCHAR(30)     NOT NULL,
  `transitioned_at`      DATETIME(6)     NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `transitioned_by`      VARCHAR(7)      NOT NULL,
  `reason`               VARCHAR(500)    NULL DEFAULT NULL
                         COMMENT 'Mandatory for REJECTED/REOPENED',
  PRIMARY KEY (`history_id`),
  CONSTRAINT `fk_jrsh_jr`
    FOREIGN KEY (`jr_no`) REFERENCES `cmms_jobrequest_mst` (`JR_JOBREQUESTNO`),
  CONSTRAINT `fk_jrsh_actor`
    FOREIGN KEY (`transitioned_by`) REFERENCES `cmms_emp_mst` (`EMM_ID`),
  INDEX `idx_jrsh_jr_time` (`jr_no`, `transitioned_at` DESC),
  INDEX `idx_jrsh_time`    (`transitioned_at` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

### 10.3 Cluster 4 — All Tables (22 active in MVP)

| Table                                  | Bucket   | Rows   | Purpose                            |
| -------------------------------------- | -------- | ------ | ---------------------------------- |
| `cmms_jobrequest_mst`                | 🔧 ALTER | 21,485 | Core JR + new MVP status enum      |
| `cmms_jobcard_mst`                   | 🔧 ALTER | 19,432 | Core JC + new MVP status enum      |
| `job_request_status_history`         | 🌱 NEW   | 0      | JR state machine log               |
| `cmms_jobcard_status_hist`           | ✅ KEEP  | 22,214 | JC state history (already perfect) |
| `cmms_jobcard_mst_history`           | ✅ KEEP  | 22,143 | Full JC snapshots                  |
| `cmms_jobrequest_item_dtl`           | ✅ KEEP  | 7,786  | JR line items                      |
| `cmms_jobrequest_project_dtl`        | ✅ KEEP  | 19,624 | JR ↔ project                      |
| `cmms_jobcard_attendedby_dtl`        | ✅ KEEP  | 27,890 | Engineer assignment to JC          |
| `cmms_jobcard_awaitinginfo`          | ✅ KEEP  | 7,261  | Awaiting info per JC               |
| `cmms_jobcard_cal_dtl`               | ✅ KEEP  | 9,065  | Cal details                        |
| `cmms_jobcard_cal_observations`      | ✅ KEEP  | 77,171 | Cal observations (largest!)        |
| `cmms_jobcard_cal_adjustments_dtl`   | ✅ KEEP  | 1,831  | Cal adjustments                    |
| `cmms_jobcard_contract_warranty_dtl` | ✅ KEEP  | 17,225 | Warranty info                      |
| `cmms_jobcard_eq_used`               | ✅ KEEP  | 38,316 | Equipment used in JC               |
| `cmms_jobcard_faulty_category`       | ✅ KEEP  | 8,605  | Fault category tags                |
| `cmms_jobcard_faulty_section`        | ✅ KEEP  | 8,131  | Fault section tags                 |
| `cmms_jobcard_inspection_info`       | ✅ KEEP  | 2,214  | Inspection info                    |
| `cmms_jobcard_repair_info`           | ✅ KEEP  | 8,118  | Repair info                        |
| `cmms_jobcard_request_info`          | ✅ KEEP  | 19,432 | JC request info                    |
| `cmms_jobcard_request_item_dtl`      | ✅ KEEP  | 11,064 | JC request items                   |
| `cmms_jobcard_request_project_dtl`   | ✅ KEEP  | 22,316 | JC ↔ project                      |
| `cmms_jobcard_spares_equip`          | ✅ KEEP  | 2,804  | Spares used in JC                  |
| `cmms_task_mst`                      | ✅ KEEP  | 1,489  | Task master (cal/PM)               |
| `cmms_checklist_mst`                 | 🔧 ALTER | 928    | Checklist master                   |
| `cmms_checklist_tasks`               | ✅ KEEP  | 7,536  | Checklist ↔ tasks                 |
| `cmms_checklist_hist`                | ✅ KEEP  | 811    | Checklist history                  |
| `cmms_checklist_tasks_hist`          | ✅ KEEP  | 8,450  | Checklist tasks history            |

---

## 11. CLUSTER 10 — AUDIT & LOGS

### 11.1 DDL — Cluster 10

```sql
-- ════════════════════════════════════════════════════════════════════
-- CLUSTER 10: AUDIT & LOGS
-- Locked: BR-AUD-01, BR-AUD-02, BR-AUD-03, D20
-- ════════════════════════════════════════════════════════════════════

-- ----------------------------------------------------------------------
-- 10.1 — audit_log (NEW) — every write-changing operation
-- ----------------------------------------------------------------------

CREATE TABLE `audit_log` (
  `audit_id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `actor_employee_id`   VARCHAR(7)      NOT NULL
                        COMMENT 'EMM_ID of acting user, or BOOTSTRAP/SYSTEM',
  `actor_role_code`     VARCHAR(30)     NULL DEFAULT NULL
                        COMMENT 'Snapshot at time of action (in case role later changes)',
  `action`              VARCHAR(60)     NOT NULL
                        COMMENT 'e.g., EQUIPMENT_CREATE, JOB_REQUEST_APPROVE, USER_DEACTIVATE',
  `entity_type`         VARCHAR(40)     NOT NULL
                        COMMENT 'e.g., equipment, job_request, job_card, user, role',
  `entity_id`           VARCHAR(50)     NOT NULL
                        COMMENT 'PK of affected entity (stringified for variable PK types)',
  `occurred_at`         DATETIME(6)     NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `ip_address`          VARCHAR(45)     NULL DEFAULT NULL,
  `user_agent`          VARCHAR(500)    NULL DEFAULT NULL,
  `request_id`          VARCHAR(40)     NULL DEFAULT NULL
                        COMMENT 'Correlates with pino-http requestId log field',
  `notes`               VARCHAR(500)    NULL DEFAULT NULL,
  PRIMARY KEY (`audit_id`),
  INDEX `idx_al_entity` (`entity_type`, `entity_id`, `occurred_at` DESC),
  INDEX `idx_al_actor`  (`actor_employee_id`, `occurred_at` DESC),
  INDEX `idx_al_action` (`action`, `occurred_at` DESC),
  INDEX `idx_al_time`   (`occurred_at` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- ----------------------------------------------------------------------
-- 10.2 — audit_log_changes (NEW) — before/after field diffs
-- ----------------------------------------------------------------------

CREATE TABLE `audit_log_changes` (
  `change_id`      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `audit_id`       BIGINT UNSIGNED NOT NULL,
  `field_name`     VARCHAR(80)     NOT NULL,
  `before_value`   TEXT            NULL DEFAULT NULL,
  `after_value`    TEXT            NULL DEFAULT NULL,
  PRIMARY KEY (`change_id`),
  CONSTRAINT `fk_alc_audit`
    FOREIGN KEY (`audit_id`) REFERENCES `audit_log` (`audit_id`) ON DELETE CASCADE,
  INDEX `idx_alc_audit` (`audit_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- ----------------------------------------------------------------------
-- 10.3 — export_audit (NEW) — PDF / future Excel exports
-- ----------------------------------------------------------------------

CREATE TABLE `export_audit` (
  `export_id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `actor_employee_id`  VARCHAR(7)      NOT NULL,
  `export_type`        ENUM(
                         'JOB_CARD_PDF',
                         'CAL_CERT_PDF',
                         'JOB_REQUEST_PDF',
                         'EXCEL_EQUIPMENT',
                         'EXCEL_JOB_CARDS'
                       ) NOT NULL,
  `record_ids`         TEXT            NOT NULL
                       COMMENT 'JSON array or CSV of PK(s) exported',
  `occurred_at`        DATETIME(6)     NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `ip_address`         VARCHAR(45)     NULL DEFAULT NULL,
  `byte_count`         INT UNSIGNED    NULL DEFAULT NULL
                       COMMENT 'Optional: PDF size for capacity tracking',
  PRIMARY KEY (`export_id`),
  INDEX `idx_ea_actor` (`actor_employee_id`, `occurred_at` DESC),
  INDEX `idx_ea_type`  (`export_type`, `occurred_at` DESC),
  INDEX `idx_ea_time`  (`occurred_at` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

### 11.2 What Gets Audited (decision rule)

```
   ┌─────────────────────────────────────────────────────────────┐
   │   AUDIT WHEN:                                               │
   │   ────────────                                              │
   │   ✓ Any write to a state-machine table (eqp, jr, jc)        │
   │   ✓ Any role change                                          │
   │   ✓ Any user create/activate/deactivate                      │
   │   ✓ Any equipment register, verify, condemn, delete          │
   │   ✓ Any JR approve/reject/assign                             │
   │   ✓ Any JC start/complete/verify/reopen                      │
   │   ✓ Any master-data mutation (Phase 2)                       │
   │   ✓ Any export (separate export_audit table)                 │
   │   ✓ Bootstrap actions                                        │
   │                                                             │
   │   DO NOT AUDIT:                                             │
   │   ────────────                                              │
   │   ✗ Read-only queries (too noisy)                            │
   │   ✗ Login attempts (handled by login_audit instead)          │
   │   ✗ Page navigation, sidebar clicks                          │
   │   ✗ Token refreshes (covered in login_audit)                 │
   └─────────────────────────────────────────────────────────────┘
```

---

## 12. CLUSTER 12 — LOOKUPS

### 12.1 DDL — Cluster 12

```sql
-- ════════════════════════════════════════════════════════════════════
-- CLUSTER 12: LOOKUPS
-- Locked: BR-MASTER-01, C3 (lookup edited via phpMyAdmin in MVP)
-- ════════════════════════════════════════════════════════════════════

-- ----------------------------------------------------------------------
-- 12.1 — ALTER cmms_parameter_master (legacy KEEP + new columns)
-- ----------------------------------------------------------------------
-- The existing table has 337 rows in shape (CategoryID, CategoryDescription,
-- SrID, Value). Surprisingly, it has NO primary key. We add one + audit.

ALTER TABLE `cmms_parameter_master`
  ADD COLUMN `is_active`     TINYINT(1)  NOT NULL DEFAULT 1,
  ADD COLUMN `display_order` SMALLINT    NOT NULL DEFAULT 0
       COMMENT 'For ordered dropdowns (e.g., status badges in correct order)',
  ADD COLUMN `created_at`    DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  ADD COLUMN `created_by`    VARCHAR(7)  NULL DEFAULT NULL,
  ADD COLUMN `updated_at`    DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
                                          ON UPDATE CURRENT_TIMESTAMP(6),
  ADD COLUMN `updated_by`    VARCHAR(7)  NULL DEFAULT NULL,
  ADD PRIMARY KEY (`CategoryID`, `SrID`),
  ADD INDEX `idx_pm_category_order` (`CategoryID`, `display_order`),
  ADD INDEX `idx_pm_active` (`is_active`);


-- ----------------------------------------------------------------------
-- 12.2 — Isolate (rename) the 3 legacy backup variants
-- ----------------------------------------------------------------------

RENAME TABLE
  `cmms_parameter_master_bkp`       TO `_legacy_parameter_master_bkp`,
  `cmms_parameter_master_jun2016`   TO `_legacy_parameter_master_jun2016`,
  `cmms_parameter_master_incharge`  TO `_legacy_parameter_master_incharge`;
```

### 12.2 MVP Lookup Values to Seed

Inserted into `cmms_parameter_master` during bootstrap:

```sql
-- ----------------------------------------------------------------------
-- 12.3 — SEED MVP lookup values
-- ----------------------------------------------------------------------

INSERT INTO `cmms_parameter_master`
  (`CategoryID`, `CategoryDescription`, `SrID`, `Value`,
   `is_active`, `display_order`, `created_by`)
VALUES
  -- CategoryID = 100 → JR MVP Status (display labels)
  (100, 'JobRequest MVP Status', 'DRAFT',           'Draft',            1, 10, 'BOOTSTRAP'),
  (100, 'JobRequest MVP Status', 'SUBMITTED',       'Submitted',        1, 20, 'BOOTSTRAP'),
  (100, 'JobRequest MVP Status', 'ASSIGNED',        'Assigned',         1, 30, 'BOOTSTRAP'),
  (100, 'JobRequest MVP Status', 'IN_PROGRESS',     'In Progress',      1, 40, 'BOOTSTRAP'),
  (100, 'JobRequest MVP Status', 'COMPLETED',       'Completed',        1, 50, 'BOOTSTRAP'),
  (100, 'JobRequest MVP Status', 'VERIFIED_CLOSED', 'Verified / Closed',1, 60, 'BOOTSTRAP'),
  (100, 'JobRequest MVP Status', 'REJECTED',        'Rejected',         1, 70, 'BOOTSTRAP'),
  (100, 'JobRequest MVP Status', 'REOPENED',        'Reopened',         1, 80, 'BOOTSTRAP'),

  -- CategoryID = 101 → Equipment MVP Status
  (101, 'Equipment MVP Status', 'PENDING_VERIFICATION', 'Pending Verification', 1, 10, 'BOOTSTRAP'),
  (101, 'Equipment MVP Status', 'ACTIVE',               'Active',               1, 20, 'BOOTSTRAP'),
  (101, 'Equipment MVP Status', 'UNDER_CALIBRATION',    'Under Calibration',    1, 30, 'BOOTSTRAP'),
  (101, 'Equipment MVP Status', 'UNDER_REPAIR',         'Under Repair',         1, 40, 'BOOTSTRAP'),
  (101, 'Equipment MVP Status', 'OUT_OF_TOLERANCE',     'Out of Tolerance',     1, 50, 'BOOTSTRAP'),
  (101, 'Equipment MVP Status', 'QUARANTINED',          'Quarantined',          1, 60, 'BOOTSTRAP'),
  (101, 'Equipment MVP Status', 'CONDEMNED',            'Condemned',            1, 70, 'BOOTSTRAP'),
  (101, 'Equipment MVP Status', 'RETIRED',              'Retired',              1, 80, 'BOOTSTRAP'),

  -- CategoryID = 102 → Calibration Status badges (display + color)
  (102, 'Calibration Status', 'VALID',            'Valid',            1, 10, 'BOOTSTRAP'),
  (102, 'Calibration Status', 'DUE_SOON',         'Due Soon',         1, 20, 'BOOTSTRAP'),
  (102, 'Calibration Status', 'OVERDUE',          'Overdue',          1, 30, 'BOOTSTRAP'),
  (102, 'Calibration Status', 'OUT_OF_TOLERANCE', 'Out of Tolerance', 1, 40, 'BOOTSTRAP'),
  (102, 'Calibration Status', 'NOT_REQUIRED',     'Not Required',     1, 50, 'BOOTSTRAP'),

  -- CategoryID = 103 → JR Priority
  (103, 'JobRequest Priority', 'LOW',    'Low',     1, 10, 'BOOTSTRAP'),
  (103, 'JobRequest Priority', 'NORMAL', 'Normal',  1, 20, 'BOOTSTRAP'),
  (103, 'JobRequest Priority', 'HIGH',   'High',    1, 30, 'BOOTSTRAP'),
  (103, 'JobRequest Priority', 'URGENT', 'Urgent',  1, 40, 'BOOTSTRAP'),

  -- CategoryID = 104 → Equipment Category
  (104, 'Equipment Category', 'TME', 'Test & Measurement (T&ME)',         1, 10, 'BOOTSTRAP'),
  (104, 'Equipment Category', 'FPE', 'Fabrication & Production (F&PE)',  1, 20, 'BOOTSTRAP'),

  -- CategoryID = 105 → Job Request Types
  (105, 'JobRequest Type', 'CALIBRATION',  'Calibration',  1, 10, 'BOOTSTRAP'),
  (105, 'JobRequest Type', 'REPAIR',       'Repair',       1, 20, 'BOOTSTRAP'),
  (105, 'JobRequest Type', 'REGISTRATION', 'Registration', 1, 30, 'BOOTSTRAP');
```

### 12.3 Cluster 12 — Table Summary

| Table                     | Bucket   | Rows               | Purpose                   |
| ------------------------- | -------- | ------------------ | ------------------------- |
| `cmms_parameter_master` | 🔧 ALTER | 337 + 28 new = 365 | THE lookup table          |
| `cmms_documentno_mst`   | ✅ KEEP  | 151                | Document number sequences |
| `cmms_product_mst`      | ✅ KEEP  | 32                 | Instrument types          |
| `cmms_fault_mst`        | ✅ KEEP  | 30                 | Fault catalogue           |
| `cmms_task_mst`         | ✅ KEEP  | 1,489              | Task master               |
| `cmms_designation_mst`  | ✅ KEEP  | 40                 | Designations              |

---

## 13. P2 CLUSTERS — SKETCH ONLY

Per FINAL-DESC §17.2, these are Phase 2 deferred. We sketch the table shapes; we do **NOT** finalise DDL.

| Cluster          | Existing tables (KEEP, no MVP code reads)                                                    | NEW for P2 (sketch)                                                                                           |
| ---------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| 5 Calibration    | `cmms_jobcard_cal_*`, `cmms_ins_accuracy_info`                                           | `calibration_certificates`, `cal_standards`, `cal_traceability_chain`, `cal_environmental_conditions` |
| 6 Maintenance    | `cmms_amc_mst` (0 rows), `cmms_device_spares_mst`                                        | `pm_plans`, `pm_records`, `breakdown_events`                                                            |
| 7 Scheduling     | `cmms_schedule_mst`, `cmms_schedule_eqip_dtl`                                            | `schedule_events`, `schedule_recurrence_rules`                                                            |
| 8 Procurement    | `cmms_po_mst`, `cmms_pur_mst`, `cmms_pur_dtl`, `cmms_inv_mst`, `cmms_lineitem_mst` | `vendor_categories`, `stock_movements`, `purchase_indents`                                              |
| 9 Documents      | `cmms_eqip_detail_spec` (3 rows, BLOB)                                                     | `documents`, `document_versions`, `signatures` (when file storage arrives)                              |
| 11 Notifications | (none)                                                                                       | `notifications`, `notification_preferences`, `notification_log`                                         |
| 13 Reporting     | (none)                                                                                       | `saved_reports`, `report_runs`, `scheduled_report_jobs`                                                 |

---

## 14. MASTER TABLE INVENTORY (all 79 tables after Phase 3)

Legend: ✅ KEEP · 🔧 ALTER · 🗄️ ISOLATE (renamed `_legacy_*`) · 🌱 NEW

| #  | Table                                  | Cluster            | Bucket       | Rows                           |
| -- | -------------------------------------- | ------------------ | ------------ | ------------------------------ |
| 1  | `users`                              | 1 Identity         | 🌱 NEW       | 0 → 2 seeded                  |
| 2  | `roles`                              | 1 Identity         | 🌱 NEW       | 0 → 5 seeded                  |
| 3  | `permissions`                        | 1 Identity         | 🌱 NEW       | 0 → 40 seeded                 |
| 4  | `role_permissions`                   | 1 Identity         | 🌱 NEW       | 0 → ~110 seeded               |
| 5  | `user_roles`                         | 1 Identity         | 🌱 NEW       | 0 → 2 seeded                  |
| 6  | `refresh_tokens`                     | 1 Identity         | 🌱 NEW       | 0                              |
| 7  | `login_audit`                        | 1 Identity         | 🌱 NEW       | 0                              |
| 8  | `cmms_emp_mst`                       | 1 Identity         | 🔧 ALTER     | 57 → 59 (+2 super admins)     |
| 9  | `departments`                        | 2 Organisation     | 🌱 NEW       | 0 → 1 seeded (TIMCD)          |
| 10 | `sections`                           | 2 Organisation     | 🌱 NEW       | 0 → 2 seeded (T&ME, F&PE)     |
| 11 | `cmms_section_mst`                   | 2 Organisation     | ✅ KEEP      | 293                            |
| 12 | `cmms_designation_mst`               | 2 Organisation     | ✅ KEEP      | 40                             |
| 13 | `cmms_proj_mst`                      | 2 Organisation     | ✅ KEEP      | 182                            |
| 14 | `cmms_cont_mst`                      | 3 Equipment        | 🌱 NEW       | 0 (seed in Week 2 / on demand) |
| 15 | `cmms_eqip_mst`                      | 3 Equipment        | 🔧 ALTER     | 5,704                          |
| 16 | `equipment_status_history`           | 3 Equipment        | 🌱 NEW       | 0                              |
| 17 | `cmms_eqip_mst_hist`                 | 3 Equipment        | ✅ KEEP      | 519                            |
| 18 | `cmms_eqipinst_identification`       | 3 Equipment        | ✅ KEEP      | 2,286                          |
| 19 | `cmms_ins_accuracy_info`             | 3 Equipment        | ✅ KEEP      | 1,501                          |
| 20 | `cmms_division_hist`                 | 3 Equipment        | ✅ KEEP      | 3,676                          |
| 21 | `cmms_product_mst`                   | 3/12 Eq/Lookup     | ✅ KEEP      | 32                             |
| 22 | `cmms_fault_mst`                     | 3/12 Eq/Lookup     | ✅ KEEP      | 30                             |
| 23 | `cmms_jobrequest_mst`                | 4 Job              | 🔧 ALTER     | 21,485                         |
| 24 | `cmms_jobcard_mst`                   | 4 Job              | 🔧 ALTER     | 19,432                         |
| 25 | `job_request_status_history`         | 4 Job              | 🌱 NEW       | 0                              |
| 26 | `cmms_jobcard_status_hist`           | 4/10 Job/Audit     | ✅ KEEP      | 22,214                         |
| 27 | `cmms_jobcard_mst_history`           | 4/10 Job/Audit     | ✅ KEEP      | 22,143                         |
| 28 | `cmms_jobrequest_item_dtl`           | 4 Job              | ✅ KEEP      | 7,786                          |
| 29 | `cmms_jobrequest_project_dtl`        | 4 Job              | ✅ KEEP      | 19,624                         |
| 30 | `cmms_jobcard_attendedby_dtl`        | 4 Job              | ✅ KEEP      | 27,890                         |
| 31 | `cmms_jobcard_awaitinginfo`          | 4 Job              | ✅ KEEP      | 7,261                          |
| 32 | `cmms_jobcard_cal_dtl`               | 4 Job              | ✅ KEEP      | 9,065                          |
| 33 | `cmms_jobcard_cal_observations`      | 4 Job              | ✅ KEEP      | 77,171                         |
| 34 | `cmms_jobcard_cal_adjustments_dtl`   | 4 Job              | ✅ KEEP      | 1,831                          |
| 35 | `cmms_jobcard_contract_warranty_dtl` | 4 Job              | ✅ KEEP      | 17,225                         |
| 36 | `cmms_jobcard_eq_used`               | 4 Job              | ✅ KEEP      | 38,316                         |
| 37 | `cmms_jobcard_faulty_category`       | 4 Job              | ✅ KEEP      | 8,605                          |
| 38 | `cmms_jobcard_faulty_section`        | 4 Job              | ✅ KEEP      | 8,131                          |
| 39 | `cmms_jobcard_inspection_info`       | 4 Job              | ✅ KEEP      | 2,214                          |
| 40 | `cmms_jobcard_repair_info`           | 4 Job              | ✅ KEEP      | 8,118                          |
| 41 | `cmms_jobcard_request_info`          | 4 Job              | ✅ KEEP      | 19,432                         |
| 42 | `cmms_jobcard_request_item_dtl`      | 4 Job              | ✅ KEEP      | 11,064                         |
| 43 | `cmms_jobcard_request_project_dtl`   | 4 Job              | ✅ KEEP      | 22,316                         |
| 44 | `cmms_jobcard_spares_equip`          | 4 Job              | ✅ KEEP      | 2,804                          |
| 45 | `cmms_task_mst`                      | 4 Job              | ✅ KEEP      | 1,489                          |
| 46 | `cmms_checklist_mst`                 | 4 Job              | 🔧 ALTER     | 928                            |
| 47 | `cmms_checklist_tasks`               | 4 Job              | ✅ KEEP      | 7,536                          |
| 48 | `cmms_checklist_hist`                | 4 Job              | ✅ KEEP      | 811                            |
| 49 | `cmms_checklist_tasks_hist`          | 4 Job              | ✅ KEEP      | 8,450                          |
| 50 | `cmms_amc_mst`                       | 6 Maintenance      | ✅ KEEP (P2) | 0                              |
| 51 | `cmms_device_spares_mst`             | 6/8 Maint/Procur   | ✅ KEEP (P2) | 67                             |
| 52 | `cmms_schedule_mst`                  | 7 Schedule         | ✅ KEEP (P2) | 6                              |
| 53 | `cmms_schedule_eqip_dtl`             | 7 Schedule         | ✅ KEEP (P2) | 316                            |
| 54 | `cmms_po_mst`                        | 8 Procurement      | ✅ KEEP (P2) | 115                            |
| 55 | `cmms_pur_mst`                       | 8 Procurement      | ✅ KEEP (P2) | 0                              |
| 56 | `cmms_pur_dtl`                       | 8 Procurement      | ✅ KEEP (P2) | 0                              |
| 57 | `cmms_inv_mst`                       | 8 Procurement      | ✅ KEEP (P2) | 42                             |
| 58 | `cmms_lineitem_mst`                  | 8 Procurement      | ✅ KEEP (P2) | 24                             |
| 59 | `audit_log`                          | 10 Audit           | 🌱 NEW       | 0 → ~6 seeded                 |
| 60 | `audit_log_changes`                  | 10 Audit           | 🌱 NEW       | 0                              |
| 61 | `export_audit`                       | 10 Audit           | 🌱 NEW       | 0                              |
| 62 | `cmms_parameter_master`              | 12 Lookups         | 🔧 ALTER     | 337 + 28 = 365                 |
| 63 | `cmms_documentno_mst`                | 12 Lookups         | ✅ KEEP      | 151                            |
| 64 | `cmms_eqip_detail_spec`              | 9 Documents        | ✅ KEEP (P2) | 3                              |
| 65 | `cmms_cal_jobcard_feedback_spec`     | 4/9                | 🗄️ ISOLATE | 0 → rename `_legacy_*`      |
| 66 | `cmms_jobcard_insp_maint_dtl`        | 4 Job              | 🗄️ ISOLATE | 0 → rename `_legacy_*`      |
| 67 | `cmms_accessright_mst`               | 1 (LEGACY RBAC)    | 🗄️ ISOLATE | 3,221 → rename `_legacy_*`  |
| 68 | `cmms_module_mst`                    | 1 (LEGACY menu)    | 🗄️ ISOLATE | 163 → rename `_legacy_*`    |
| 69 | `cmms_role_mst`                      | 1 (LEGACY roles)   | 🗄️ ISOLATE | 23 → rename `_legacy_*`     |
| 70 | `cmms_section_user_mst`              | 1/2 (LEGACY)       | 🗄️ ISOLATE | 294 → rename `_legacy_*`    |
| 71 | `cmms_userrole_mst`                  | 1 (PLAINTEXT PWDs) | 🗄️ ISOLATE | 565 → rename `_legacy_*`    |
| 72 | `cf001`                              | Orphan             | 🗄️ ISOLATE | 6 → rename `_legacy_*`      |
| 73 | `cf002`                              | Orphan             | 🗄️ ISOLATE | 553 → rename `_legacy_*`    |
| 74 | `cf003`                              | Orphan             | 🗄️ ISOLATE | 570 → rename `_legacy_*`    |
| 75 | `cf004`                              | Orphan             | 🗄️ ISOLATE | 3,449 → rename `_legacy_*`  |
| 76 | `chklistvendor`                      | Orphan             | 🗄️ ISOLATE | 238 → rename `_legacy_*`    |
| 77 | `cmms_parameter_master_bkp`          | Orphan             | 🗄️ ISOLATE | 4 → rename `_legacy_*`      |
| 78 | `cmms_parameter_master_jun2016`      | Orphan             | 🗄️ ISOLATE | 233 → rename `_legacy_*`    |
| 79 | `cmms_parameter_master_incharge`     | Orphan             | 🗄️ ISOLATE | 9 → rename `_legacy_*`      |

**Final totals:**

| Bucket                                | Count        |
| ------------------------------------- | ------------ |
| 🌱 NEW (active MVP)                   | 15           |
| 🔧 ALTER (active MVP)                 | 6            |
| ✅ KEEP (active MVP)                  | 32           |
| **Total active MVP runtime**    | **53** |
| 🗄️ ISOLATE (legacy, renamed)        | 26           |
| **GRAND TOTAL (after Phase 3)** | **79** |

---

## 15. COMPLETE ERD (TEXTUAL) — MVP-CRITICAL CLUSTERS

The full entity-relationship picture for the 53 active MVP tables. Read top-to-bottom for the natural data flow: auth → org → equipment → job lifecycle → audit.

```
   ┌────────────────────────────────────────────────────────────────────────────┐
   │              CMCMIS_SIMPLIFIED — MVP ENTITY-RELATIONSHIP DIAGRAM            │
   └────────────────────────────────────────────────────────────────────────────┘

   ═══════════════════════════════════════════════════════════════════════════════
   IDENTITY & ACCESS  (Cluster 1)
   ═══════════════════════════════════════════════════════════════════════════════

   ┌──────────────────────┐
   │   departments        │ (NEW)
   │ ────────────────     │
   │ PK department_id     │
   │    department_code   │ ← TIMCD
   └────────┬─────────────┘
            │ 1
            │
            │ N
            ▼
   ┌──────────────────────┐                ┌──────────────────────┐
   │   sections           │ (NEW)          │  cmms_emp_mst        │ (LEGACY KEEP)
   │ ────────────────     │                │ ────────────────     │
   │ PK section_id        │                │ PK EMM_ID  VARCHAR(7)│ ← SA79900, AC77777
   │ FK department_id     │                │    EMM_NAME          │
   │    section_code      │ ← TME, FPE     │    EMM_DESIGNATION   │
   │    equipment_category│   ENUM(TME,FPE)│    EMM_DEPT  →legacy │
   │    head_employee_id  │ ───────────►   │    EMM_EMAIL         │
   └────────┬─────────────┘                │    EMM_INACTIVE      │
            │                              └────────┬─────────────┘
            │                                       │
            │                                       │ 1
            │                                       │
            │                                       │ 0..1
            │  ┌────────────────────────────────────┘
            │  │
            │  ▼
   ┌──────────┴───────────────────────────┐
   │   users  (NEW)                        │
   │ ─────────────────────────────────     │
   │ PK user_id                            │
   │ UQ employee_id  → cmms_emp_mst.EMM_ID │
   │    password_hash  VARCHAR(60) bcrypt  │
   │ FK section_id    → sections           │
   │    is_active, is_locked               │
   │    failed_login_count                 │
   │    last_login_at, last_login_ip       │
   └──────┬──────────────┬─────────────────┘
          │              │              │
       1:1│           1:N│           1:N│
          ▼              ▼              ▼
   ┌──────────────┐ ┌──────────────┐ ┌────────────────┐
   │ user_roles   │ │ refresh_     │ │ login_audit    │ (NEW)
   │ PK user_id   │ │   tokens     │ │ employee_id    │
   │ FK role_id   │ │ token_hash   │ │ attempt_at     │
   │ assigned_by  │ │ expires_at   │ │ outcome ENUM   │
   │ assigned_at  │ │ revoked_at   │ │ ip, user_agent │
   └──────┬───────┘ └──────────────┘ └────────────────┘
          │
       M:1│
          ▼
   ┌──────────────┐
   │ roles  (NEW) │ ← 5 system rows: SUPER_ADMIN, LAB_IN_CHARGE,
   │ PK role_id   │   LAB_ENGINEER, NORMAL_USER, VIEW_ONLY
   │    role_code │
   └──────┬───────┘
          │
       M:N│ via role_permissions
          ▼
   ┌─────────────────────┐         ┌──────────────────┐
   │ role_permissions    │  M:1    │ permissions(NEW) │
   │ PK (role_id,        │ ──────► │ PK permission_id │
   │     permission_id)  │         │    permission_code│
   │    granted_at, _by  │         │    resource      │
   └─────────────────────┘         │    action        │
                                   └──────────────────┘
                                   (~40 seed rows)

   ═══════════════════════════════════════════════════════════════════════════════
   EQUIPMENT MASTER  (Cluster 3)
   ═══════════════════════════════════════════════════════════════════════════════

   ┌────────────────────────┐                 ┌─────────────────────────┐
   │  cmms_cont_mst  (NEW)  │                 │   sections  (NEW above) │
   │ ──────────────────     │                 └────────────┬────────────┘
   │ PK CMM_CONT_ID         │                              │
   │    CMM_CONT_NAME       │                              │ (via EQM_SECTION_ID)
   │    CMM_CONT_TYPE       │ ←┐                           │
   │    GSTIN, PAN, NABL    │  │ FK from many tables        │
   └────────────────────────┘  │                            │
                               │                            │
                       FK on   │                            │
                   EQM_MFRID   │                            ▼
   ┌────────────────────────────┴──────────────────────────────────────┐
   │  cmms_eqip_mst  (LEGACY + 🔧 ALTER)                                │
   │ ──────────────────────────────────────────────                     │
   │ PK (EQM_TYPE, EQM_ID)        composite, varchar+int                │
   │ FK EQM_MFRID → cmms_cont_mst                                        │
   │ FK EQM_DIVID → cmms_section_mst (legacy)                            │
   │ FK EQM_SECTION_ID → sections (NEW — clean MVP linkage)              │
   │    EQM_NAME, EQM_MFG_MODEL_NAME, EQM_SRNO                           │
   │    EQM_PMCHKLSTNO → cmms_checklist_mst                              │
   │    EQM_CALCHKLSTNO → cmms_checklist_mst                             │
   │    EQM_INST_TYPE → cmms_product_mst                                 │
   │  + EQM_VERIFIED_BY/ON  (NEW)                                        │
   │  + EQM_MVP_STATUS ENUM (NEW, default PENDING_VERIFICATION)          │
   │  + EQM_MVP_STATUS_AT  (NEW)                                         │
   │                                                                     │
   │ 5,704 rows existing                                                 │
   └────────────────┬────────────────────────────────────────────────────┘
                    │
                    │ 1
                    │
                    │ N        N        N        N        N
                    ▼          ▼        ▼        ▼        ▼
        ┌───────────────────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────────────┐
        │ equipment_status_ │ │div_  │ │eqip_ │ │ins_  │ │eqip_mst_hist │
        │ history (NEW)     │ │hist  │ │inst_ │ │acc.  │ │ (legacy)     │
        │ from→to status    │ │legacy│ │ident.│ │info  │ │              │
        │ transitioned_by   │ │      │ │      │ │      │ │              │
        │ reason            │ └──────┘ └──────┘ └──────┘ └──────────────┘
        │ related_job_card  │
        └───────────────────┘

   ═══════════════════════════════════════════════════════════════════════════════
   JOB LIFECYCLE  (Cluster 4)  — the biggest, richest cluster
   ═══════════════════════════════════════════════════════════════════════════════

   USER raises request                       LAB IN-CHARGE approves/rejects/assigns
              │                                              │
              ▼                                              ▼
   ┌────────────────────────────────────┐
   │  cmms_jobrequest_mst (🔧 ALTER)    │
   │ ─────────────────────────────      │
   │ PK JR_JOBREQUESTNO                 │
   │ FK JR_EQM_TYPE,JR_EQM_ID → eqip   │
   │ FK JR_DIVISION → cmms_section_mst │
   │ FK JR_SECTIONJOB_NO → jobcard      │
   │  + JR_MVP_STATUS ENUM (NEW)        │
   │  + JR_APPROVED_BY/ON (NEW)         │
   │  + JR_REJECTED_BY/ON/REASON (NEW)  │
   │  + JR_PRIORITY ENUM (NEW)          │
   │  + JR_ASSIGNED_ENGINEER (NEW)      │
   │                                    │
   │  21,485 rows                       │
   └──────┬──────────────┬──────────────┘
          │              │
          │ 1            │ 1
          ▼              ▼
   ┌────────────────┐ ┌──────────────────────────┐
   │ jobrequest_    │ │ job_request_status_      │  (NEW)
   │ item_dtl       │ │ history                  │
   │ (legacy keep)  │ │ from_status→to_status    │
   └────────────────┘ │ transitioned_by/at       │
                      │ reason                   │
                      └──────────────────────────┘

   When LIC assigns → a job card is created:
              │
              ▼
   ┌────────────────────────────────────┐
   │  cmms_jobcard_mst  (🔧 ALTER)      │
   │ ─────────────────────────────      │
   │ PK JM_SectionJobNo  VARCHAR(9)     │
   │ FK JM_EQM_TYPE,JM_EQM_ID → eqip   │
   │  + JM_MVP_STATUS ENUM (NEW)        │
   │  + JM_VERIFIED_BY/ON (NEW)         │
   │  + JM_REOPENED_REASON (NEW)        │
   │                                    │
   │  19,432 rows                       │
   └────┬─────┬─────┬─────┬─────┬───────┘
        │     │     │     │     │
        │ 1   │ 1   │ 1   │ 1   │ 1   ...18 child tables, all KEEP:
        ▼     ▼     ▼     ▼     ▼
       attendedby  awaitinginfo  cal_dtl    cal_observations
       eq_used     repair_info   request_info  request_item_dtl
       request_project_dtl       spares_equip  inspection_info
       contract_warranty_dtl     cal_adjustments_dtl
       faulty_category           faulty_section
       jobcard_status_hist  ← already perfect for state history
       jobcard_mst_history  ← full snapshot per change

   ═══════════════════════════════════════════════════════════════════════════════
   AUDIT & LOGS  (Cluster 10)
   ═══════════════════════════════════════════════════════════════════════════════

   ┌──────────────────────┐         ┌───────────────────────┐
   │   audit_log (NEW)    │  1 : N  │ audit_log_changes (NEW)│
   │ ──────────────────   │ ──────► │ field, before, after  │
   │ PK audit_id          │         └───────────────────────┘
   │ actor_employee_id    │
   │ action, entity_type, │
   │ entity_id, ip, ua    │         ┌───────────────────────┐
   │ occurred_at          │         │ export_audit  (NEW)   │
   └──────────────────────┘         │ PDF / Excel exports   │
                                    └───────────────────────┘

   ═══════════════════════════════════════════════════════════════════════════════
   LOOKUPS  (Cluster 12)
   ═══════════════════════════════════════════════════════════════════════════════

   ┌──────────────────────────┐   ┌──────────────────────┐   ┌──────────────┐
   │ cmms_parameter_master    │   │ cmms_documentno_mst  │   │ cmms_product │
   │ (🔧 ALTER + audit cols)  │   │ doc # sequences      │   │ _mst (32)    │
   │ 337+28 = 365 rows        │   └──────────────────────┘   └──────────────┘
   │ key-value lookup table   │
   └──────────────────────────┘   ┌──────────────────────┐   ┌──────────────┐
                                  │ cmms_fault_mst (30)  │   │ cmms_task_mst│
                                  └──────────────────────┘   │ (1,489)      │
                                                             └──────────────┘
```

---

## 16. STATE MACHINES — AUTH, EQUIPMENT, JOB REQUEST, JOB CARD

State diagrams for every locked workflow. These are the **source of truth** for what transitions are legal and which role/permission triggers them.

### 16.1 Authentication State Machine

```
   ┌──────────────────────────────────────────────────────────────────┐
   │  AUTH STATE MACHINE — per session                                │
   └──────────────────────────────────────────────────────────────────┘

       (start)
          │
          ▼
   ┌─────────────────┐
   │ UNAUTHENTICATED │  ← all requests except /auth/login → 401
   └────────┬────────┘
            │ POST /auth/login {employee_id, password}
            │ valid + bcrypt.compare TRUE
            ▼
   ┌─────────────────┐                ┌──────────────────────────────┐
   │  AUTHENTICATED  │ ◄──────────────│ TOKEN REFRESH (every ≤15min) │
   │  (JWT alive)    │                │ POST /auth/refresh           │
   └────────┬────────┘                │ uses refresh_token cookie    │
            │                          └──────────────────────────────┘
            │ POST /auth/logout
            │ OR JWT expires + no refresh
            ▼
   ┌─────────────────┐
   │  TERMINATED     │  ← refresh_token revoked, all subsequent calls 401
   └─────────────────┘

   FAILURE BRANCHES (each writes to login_audit):
   ─────────────────────────────────────────────
   bad password             → FAILED_BAD_PASSWORD
   user not found           → FAILED_NOT_FOUND
   user.is_locked = TRUE    → FAILED_USER_LOCKED
   user.is_active = FALSE   → FAILED_USER_INACTIVE
   password regex fail      → FAILED_INVALID_FORMAT
                              (rejected before bcrypt; saves CPU)

   LOCKOUT RULE:
   ─────────────
   On each FAILED_BAD_PASSWORD:
     UPDATE users SET failed_login_count = failed_login_count + 1
     IF failed_login_count >= 5 → SET is_locked = TRUE
   On SUCCESS:
     UPDATE users SET failed_login_count = 0, last_login_at = NOW(),
                       last_login_ip = ?
   Unlock: only Super Admin can flip is_locked back to FALSE.
```

### 16.2 Equipment State Machine

```
   ┌──────────────────────────────────────────────────────────────────┐
   │  EQUIPMENT MVP_STATUS — locked transitions                       │
   │  Column: cmms_eqip_mst.EQM_MVP_STATUS                            │
   │  History: equipment_status_history                               │
   └──────────────────────────────────────────────────────────────────┘

                          ┌──────────────────────────┐
                          │  PENDING_VERIFICATION    │ ← D10 default for NEW
                          │  (registered by user,    │
                          │   awaiting LIC verify)   │
                          └────────────┬─────────────┘
                                       │ equipment:verify
                                       │ (Lab In-Charge or Super Admin)
                                       ▼
                          ┌──────────────────────────┐
              ┌──────────►│        ACTIVE             │◄──────────┐
              │           │  (in operational use)     │           │
              │           └────────────┬─────────────┘            │
              │                        │                          │
              │      JC start (cal) ───┤                          │
              │                        ▼                          │
              │           ┌──────────────────────────┐            │
              │           │   UNDER_CALIBRATION       │            │
              │           └────────────┬─────────────┘            │
              │            JC complete │ JC verify-close          │
              │            (PASS)      │                          │
              │                        └──────────────────────────┤
              │                                                    │
              │      JC start (repair) ──┐                         │
              │                          ▼                         │
              │           ┌──────────────────────────┐             │
              │           │      UNDER_REPAIR         │             │
              │           └────────────┬─────────────┘             │
              │            repair done │ verify-close              │
              │                        └─────────────────────►─────┤
              │                                                    │
              │           ┌──────────────────────────┐             │
              ├──────────►│    OUT_OF_TOLERANCE       │             │
              │           │ (cal failed limits)       │ ── re-cal ─┘
              │           └────────────┬─────────────┘    PASS
              │                        │
              │                        │ LIC decides condemn or recall
              │                        ▼
              │           ┌──────────────────────────┐
              ├──────────►│      QUARANTINED          │
              │           │ (suspect, do-not-use tag) │
              │           └────────────┬─────────────┘
              │                        │ LIC reviews → either restore
              │      ┌─────────────────┘
              │      │                 OR condemn
              │      ▼                 ▼
              │   (back to ACTIVE)    ┌──────────────────────────┐
              │                       │       CONDEMNED           │ ← terminal
              │                       │ (unusable, eqp:condemn)   │
              │                       └────────────┬─────────────┘
              │                                    │  Super Admin formal retire
              │                                    ▼
              │                        ┌──────────────────────────┐
              │                        │        RETIRED            │ ← terminal-final
              │                        │ (record kept, not active) │
              │                        └──────────────────────────┘

   PERMISSION → TRANSITION MAP:
   ─────────────────────────────────
   equipment:create   → NULL → PENDING_VERIFICATION
   equipment:verify   → PENDING_VERIFICATION → ACTIVE
   equipment:condemn  → ACTIVE/QUARANTINED/OUT_OF_TOLERANCE → CONDEMNED
   equipment:delete   → any → RETIRED (Super Admin only)
   job_card:start     → ACTIVE → UNDER_CAL or UNDER_REPAIR
   job_card:verify-close (PASS)→ UNDER_CAL/REPAIR → ACTIVE
   job_card:verify-close (FAIL)→ UNDER_CAL → OUT_OF_TOLERANCE
```

### 16.3 Job Request State Machine

```
   ┌──────────────────────────────────────────────────────────────────┐
   │  JOB REQUEST MVP_STATUS — locked transitions                     │
   │  Column: cmms_jobrequest_mst.JR_MVP_STATUS                       │
   │  History: job_request_status_history (NEW)                       │
   └──────────────────────────────────────────────────────────────────┘

                                   (start)
                                      │ user creates draft
                                      ▼
                          ┌──────────────────────────┐
                          │         DRAFT             │ ← user can edit
                          │   (job_request:create)    │
                          └────────────┬─────────────┘
                                       │ user submits
                                       ▼
                          ┌──────────────────────────┐
              ┌──────────►│       SUBMITTED           │
              │           │  (waiting LIC review)     │
              │           └─────┬──────────────────┬─┘
              │                 │                  │
              │  jr:reject ─────┘                  └──── jr:approve + jr:assign-eng
              │     ▼                                       ▼
              │  ┌──────────────────────────┐    ┌──────────────────────────┐
              │  │       REJECTED            │    │       ASSIGNED            │
              │  │  (terminal w/ reason)     │    │ (engineer assigned;       │
              │  │  REASON mandatory         │    │  jobcard auto-created)    │
              │  └──────────────────────────┘    └────────────┬─────────────┘
              │                                                │ JC starts
              │                                                ▼
              │                                   ┌──────────────────────────┐
              │                                   │      IN_PROGRESS          │
              │                                   │ (work being done)         │
              │                                   └────────────┬─────────────┘
              │                                                │ JC completes
              │                                                ▼
              │                                   ┌──────────────────────────┐
              │                                   │       COMPLETED           │
              │                                   │ (awaiting LIC verify)     │
              │                                   └────────────┬─────────────┘
              │                                                │ jr:verify-close
              │                                                ▼
              │                                   ┌──────────────────────────┐
              │                                   │     VERIFIED_CLOSED       │ ← terminal
              │                                   │  (signed off by LIC)      │
              │                                   └────────────┬─────────────┘
              │                                                │ jr:reopen (rare)
              │                                                │ REASON mandatory
              └────────────────────────────────────────────────┘
                                                  ↑
                                                  │
                                              REOPENED
                                              (cycles back into IN_PROGRESS)
```

### 16.4 Job Card State Machine

```
   ┌──────────────────────────────────────────────────────────────────┐
   │  JOB CARD MVP_STATUS — locked transitions                        │
   │  Column: cmms_jobcard_mst.JM_MVP_STATUS                          │
   │  History: cmms_jobcard_status_hist (LEGACY KEEP — already good)  │
   └──────────────────────────────────────────────────────────────────┘

                          ┌──────────────────────────┐
                          │       ASSIGNED            │ ← created when LIC
                          │  (engineer is assignee)   │   approves JR
                          └────────────┬─────────────┘
                                       │ job_card:start-work
                                       │ (Lab Engineer)
                                       ▼
                          ┌──────────────────────────┐
                          │      IN_PROGRESS          │ ← updates tasks /
                          │ (work being recorded)     │   observations
                          └────────────┬─────────────┘
                                       │ job_card:complete
                                       │ (Lab Engineer)
                                       ▼
                          ┌──────────────────────────┐
                          │       COMPLETED           │ ← awaiting LIC review
                          │  (engineer signed off)    │
                          └────────────┬─────────────┘
                                       │ job_card:verify-close
                                       │ (Lab In-Charge)
                                       ▼
                          ┌──────────────────────────┐       ┌──────────────────┐
              ┌──────────►│    VERIFIED_CLOSED        │──────►│ (final, terminal)│
              │           │  (sign-off complete)      │       └──────────────────┘
              │           └────────────┬─────────────┘
              │                        │
              │                        │ job_card:reopen
              │                        │ REASON mandatory (LIC only)
              │                        │
              │                        ▼
              │           ┌──────────────────────────┐
              └───────────│        REOPENED           │
                          │  (work resumes)            │
                          └──────────────────────────┘

   PERMISSION → TRANSITION MAP:
   ──────────────────────────────
   (auto on JR approve) → NULL → ASSIGNED
   job_card:start-work  → ASSIGNED → IN_PROGRESS
   job_card:complete    → IN_PROGRESS → COMPLETED
   job_card:verify-close→ COMPLETED → VERIFIED_CLOSED
   job_card:reopen      → VERIFIED_CLOSED → REOPENED
                          (REOPENED then naturally → IN_PROGRESS via update-tasks)
```

---

## 17. BOOTSTRAP SEED ORDER — 10-STEP DETERMINISTIC RUN

The exact sequence the migration runner executes on first deploy. Each step is **idempotent** (re-running won't duplicate rows). Order matters because of FK dependencies.

```

   ┌──────────────────────────────────────────────────────────────────┐
   │              BOOTSTRAP SEED — 10-STEP RUN                        │
   └──────────────────────────────────────────────────────────────────┘

   STEP 1.  Create new tables (in FK-safe order)
   ─────────────────────────────────────────────
   • departments
   • sections                  (FK → departments)
   • cmms_cont_mst             (no FK; standalone vendor master)
   • permissions               (no FK; standalone)
   • roles                     (no FK; standalone)
   • role_permissions          (FK → roles, permissions)
   • users                     (FK → cmms_emp_mst — legacy must exist)
   • user_roles                (FK → users, roles)
   • refresh_tokens            (FK → users)
   • login_audit               (no FK; uses employee_id loose)
   • equipment_status_history  (FK → cmms_eqip_mst, cmms_emp_mst, cmms_jobcard_mst)
   • job_request_status_history(FK → cmms_jobrequest_mst, cmms_emp_mst)
   • audit_log                 (no FK; loose actor_employee_id)
   • audit_log_changes         (FK → audit_log)
   • export_audit              (no FK)

   STEP 2.  ALTERs on existing legacy tables
   ─────────────────────────────────────────
   • cmms_emp_mst          → ADD INDEX idx_emm_active
   • cmms_eqip_mst         → ADD EQM_VERIFIED_BY/ON, EQM_MVP_STATUS,
                              EQM_MVP_STATUS_AT, EQM_SECTION_ID + FKs
   • cmms_jobrequest_mst   → ADD JR_MVP_STATUS, JR_APPROVED_*, JR_REJECTED_*,
                              JR_PRIORITY, JR_ASSIGNED_ENGINEER
   • cmms_jobcard_mst      → ADD JM_MVP_STATUS, JM_VERIFIED_BY/ON, JM_REOPENED_REASON
   • cmms_parameter_master → ADD PK + is_active + display_order + audit cols
   • cmms_checklist_mst    → ADD audit cols
   • users                 → ADD CONSTRAINT fk_users_section (deferred from Step 1)

   STEP 3.  Pre-bootstrap: ensure cmms_emp_mst can accept Super Admin INSERTs
   ─────────────────────────────────────────────────────────────────────────
   • cmms_emp_mst.EMM_DEPT is NOT NULL with FK to cmms_section_mst(SM_ID).
   • For SA79900/AC77777 we need a valid SM_ID.
   • Choose one approach (DS decides — see Migration Data Requirements §18):
       (a) INSERT a new "ADMIN" section into cmms_section_mst, e.g.,
           INSERT INTO cmms_section_mst(SM_ID, SM_SHORTNAME, SM_NAME, ...)
           VALUES (9999, 'ADMIN', 'System Admin', ...)
       (b) Reuse an existing SM_ID that DS designates.
   • Whatever approach: store the chosen SM_ID as env var BOOTSTRAP_ADMIN_SM_ID
     so step 4 picks it up deterministically.

   STEP 4.  Seed Super Admin employees
   ───────────────────────────────────
   • INSERT 2 rows into cmms_emp_mst:
       SA79900 — EMM_DEPT = $BOOTSTRAP_ADMIN_SM_ID
       AC77777 — EMM_DEPT = $BOOTSTRAP_ADMIN_SM_ID
   • Both EMM_INACTIVE = 0, created_by = 'BOOTSTRAP'

   STEP 5.  Seed roles (5 rows)
   ────────────────────────────
   • INSERT roles (role_id 1..5) — SUPER_ADMIN through VIEW_ONLY

   STEP 6.  Seed permissions (~40 rows)
   ────────────────────────────────────
   • INSERT all permission_code values from §7.4 catalogue

   STEP 7.  Seed role_permissions (the GRANT matrix)
   ─────────────────────────────────────────────────
   • SUPER_ADMIN gets every row in permissions (SELECT-INSERT)
   • LAB_IN_CHARGE, LAB_ENGINEER, NORMAL_USER, VIEW_ONLY — explicit lists per §7.5

   STEP 8.  Seed Super Admin users + user_roles
   ─────────────────────────────────────────────
   • In Node migration runner, compute bcrypt('SA79900', 12) and bcrypt('AC77777', 12)
   • INSERT 2 rows into users (password_hash = computed value above)
   • INSERT 2 rows into user_roles (both → role_id=1 SUPER_ADMIN)

   STEP 9.  Seed departments + sections
   ────────────────────────────────────
   • INSERT departments: TIMCD
   • INSERT sections: T&ME (under TIMCD), F&PE (under TIMCD)

   STEP 10. Seed lookups + initial audit_log entries
   ──────────────────────────────────────────────────
   • INSERT 28 lookup rows into cmms_parameter_master per §12.3
   • INSERT bootstrap entries into audit_log:
       BOOTSTRAP / EMPLOYEE_CREATE / cmms_emp_mst / SA79900
       BOOTSTRAP / EMPLOYEE_CREATE / cmms_emp_mst / AC77777
       BOOTSTRAP / USER_CREATE     / users        / SA79900
       BOOTSTRAP / USER_CREATE     / users        / AC77777
       BOOTSTRAP / ROLE_ASSIGN     / user_roles   / SA79900 (notes=SUPER_ADMIN)
       BOOTSTRAP / ROLE_ASSIGN     / user_roles   / AC77777 (notes=SUPER_ADMIN)

   ═══════════════════════════════════════════════════════════════════
   POST-BOOTSTRAP STATE — verify before declaring success:
   ═══════════════════════════════════════════════════════════════════
   ✓ SELECT COUNT(*) FROM roles                     = 5
   ✓ SELECT COUNT(*) FROM permissions               = 40
   ✓ SELECT COUNT(*) FROM role_permissions          = ~110 (matrix total)
   ✓ SELECT COUNT(*) FROM users                     = 2
   ✓ SELECT COUNT(*) FROM user_roles                = 2
   ✓ SELECT COUNT(*) FROM departments               = 1 (TIMCD)
   ✓ SELECT COUNT(*) FROM sections                  = 2 (T&ME, F&PE)
   ✓ SELECT COUNT(*) FROM cmms_emp_mst              = 57 + 2 = 59
   ✓ SELECT COUNT(*) FROM cmms_parameter_master     = 337 + 28 = 365
   ✓ SELECT COUNT(*) FROM audit_log                 ≥ 6
   ✓ bcrypt.compare('SA79900', users.password_hash) = TRUE for SA79900 row
   ✓ bcrypt.compare('AC77777', users.password_hash) = TRUE for AC77777 row
```

### 17.1 Migration Runner — File Naming Convention

```
   migrations/
   ├── 001__create_new_tables.sql               (Step 1)
   ├── 002__alter_legacy_tables.sql             (Step 2)
   ├── 003__pre_bootstrap_admin_section.sql     (Step 3)
   ├── 004__seed_super_admin_employees.sql      (Step 4)
   ├── 005__seed_roles.sql                      (Step 5)
   ├── 006__seed_permissions.sql                (Step 6)
   ├── 007__seed_role_permissions.sql           (Step 7)
   ├── 008__seed_super_admin_users.js           (Step 8 — JS because bcrypt)
   ├── 009__seed_org_departments_sections.sql   (Step 9)
   ├── 010__seed_lookups_and_audit.sql          (Step 10)
   └── 099__isolate_legacy_unused.sql           (rename to _legacy_* — run last)
```

---

## 18. MIGRATION DATA REQUIREMENTS — WHAT DS MUST PROVIDE

> **This is the most important practical section.** It lists every piece of data DS has to either provide, decide, or generate before the bootstrap can run cleanly on a real environment.

Each item below is tagged:

- 🔴 **BLOCKING** — bootstrap cannot proceed without this
- 🟡 **REQUIRED-BEFORE-WEEK-2** — works for dev but must be resolved before real users come on board
- 🟢 **NICE-TO-HAVE** — improves data quality but not blocking

### 18.1 Data DS Must Provide — Tabular Summary

| #   | Severity                  | What's needed                                                                                                                                                                                       | Where it goes                                                               | Default if not provided                                                                                               |
| --- | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| M1  | 🔴 BLOCKING               | A valid `SM_ID` for the 2 Super Admin employees (FK constraint on `cmms_emp_mst.EMM_DEPT`)                                                                                                      | `cmms_section_mst` — either reuse existing or insert one new "ADMIN" row | Default: INSERT a new row `(SM_ID=9999, SM_SHORTNAME='ADMIN', SM_NAME='System Admin')`                              |
| M2  | 🔴 BLOCKING               | Full name + designation + email for SA79900 and AC77777                                                                                                                                             | `cmms_emp_mst.EMM_NAME`, `EMM_DESIGNATION`, `EMM_EMAIL`               | Placeholder: 'Super Admin Primary'/'Secondary', 'System Administrator',`sa79900@org.local` / `ac77777@org.local`  |
| M3  | 🟡 REQUIRED-BEFORE-WEEK-2 | At least one vendor row in new `cmms_cont_mst` so the 5,704 `cmms_eqip_mst` rows with `EQM_MFRID` have valid FK targets                                                                       | `cmms_cont_mst`                                                           | Run a `DISTINCT EQM_MFG_MODEL_NAME` derivation from `cmms_eqip_mst` and seed placeholder vendor rows (see §18.3) |
| M4  | 🟡 REQUIRED-BEFORE-WEEK-2 | Mapping from existing `cmms_eqip_mst.EQM_MFRID` values to new `CMM_CONT_ID` values, if you want existing equipment to point at real vendor records                                              | A migration script using a vendor-name lookup                               | See §18.3 placeholder strategy                                                                                       |
| M5  | 🟡 REQUIRED-BEFORE-WEEK-2 | A mapping rule from legacy `cmms_section_mst.SM_ID` (293 rows) to new `sections.section_id` (2 rows: T&ME, F&PE) — needed only if you want legacy users/equipment to surface in the new MVP UI | Migration script + manual lookup                                            | If unmapped, legacy data simply doesn't appear in new section-filtered views. Acceptable for MVP.                     |
| M6  | 🟡 REQUIRED-BEFORE-WEEK-2 | Decision: for each of the 57 existing `cmms_emp_mst` employees, do we create a corresponding `users` row OR wait for Super Admin to onboard them one by one via UI?                             | `users` table                                                             | Default:**Do not auto-create**. Super Admin onboards on demand. Faster bootstrap, cleaner audit.                |
| M7  | 🟡 REQUIRED-BEFORE-WEEK-2 | Backfill rule for the 19,432 `cmms_jobcard_mst` rows when populating new `JM_MVP_STATUS` column                                                                                                 | Backfill UPDATE script                                                      | Default: All existing JCs →`VERIFIED_CLOSED` (assume historical jobs are closed).                                  |
| M8  | 🟡 REQUIRED-BEFORE-WEEK-2 | Backfill rule for the 21,485 `cmms_jobrequest_mst` rows when populating new `JR_MVP_STATUS` column                                                                                              | Backfill UPDATE script                                                      | Default: If `JR_SECTIONJOB_NO IS NOT NULL` → `ASSIGNED`; else → `SUBMITTED`                                   |
| M9  | 🟢 NICE-TO-HAVE           | Head employee_id for T&ME and F&PE sections                                                                                                                                                         | `sections.head_employee_id`                                               | NULL on bootstrap; set later by Super Admin                                                                           |
| M10 | 🟢 NICE-TO-HAVE           | The full `cmms_role_mst` 23-row dump if you ever want to display "this user used to be role X under the legacy system" in a history view                                                          | Archived `_legacy_role_mst`                                               | Already isolated; no MVP impact                                                                                       |
| M11 | 🟢 NICE-TO-HAVE           | bcrypt cost-factor preference (10 dev / 12 prod is the default; you can override via env `BCRYPT_ROUNDS`)                                                                                         | Migration runner env var                                                    | 12 in prod, 10 in dev/test                                                                                            |
| M12 | 🟢 NICE-TO-HAVE           | Session timeout preference (default JWT 15min + refresh 7 days per D17)                                                                                                                             | Auth service config                                                         | Locked defaults                                                                                                       |

### 18.2 Section-by-section walkthrough of what you need

#### 18.2.a — Super Admin bootstrap (M1, M2) 🔴

```
   QUESTION:  cmms_emp_mst.EMM_DEPT is NOT NULL int FK to cmms_section_mst(SM_ID).
              SA79900 and AC77777 are new employees — what SM_ID for their EMM_DEPT?

   YOUR OPTIONS:
   ─────────────
   Option A:  Look in your existing 293 cmms_section_mst rows for an
              "Admin" / "TIMCD" / "Head Office" section. Send me its SM_ID
              and I'll use it.
              SELECT SM_ID, SM_SHORTNAME, SM_NAME FROM cmms_section_mst
               WHERE SM_SHORTNAME LIKE '%ADMIN%' OR SM_NAME LIKE '%ADMIN%';

   Option B:  Insert a brand-new "ADMIN" row into cmms_section_mst before
              the SA79900/AC77777 inserts. Suggested values:
              INSERT INTO cmms_section_mst
                (SM_ID, SM_SHORTNAME, SM_NAME, SM_HEAD_NAME, SM_STATE,
                 SM_CREATED_BY, SM_CREATED_ON, SM_UPDATED_BY, SM_UPDATED_ON)
              VALUES (9999, 'ADMIN', 'System Administration', NULL, 1,
                 'BOOTSTRAP', NOW(6), 'BOOTSTRAP', NOW(6));

   MY RECOMMENDATION:  Option B. Single new row, clearly labelled, doesn't
                       muddy the meaning of an existing section.

   QUESTION:  What name/designation/email do you want for SA79900 and AC77777?

   MY DEFAULTS (acceptable for MVP):
       SA79900 → 'Super Admin Primary'   / 'System Administrator' / sa79900@org.local
       AC77777 → 'Super Admin Secondary' / 'System Administrator' / ac77777@org.local
```

#### 18.2.b — Vendor master seed (M3, M4) 🟡

```
   PROBLEM:   cmms_eqip_mst has 5,704 rows with EQM_MFRID values pointing at
              cmms_cont_mst — but cmms_cont_mst was missing from your DB.
              Now we've CREATED cmms_cont_mst but it's empty.
              The FK constraints on the 5,704 rows are technically orphaned
              (the constraint is "deferred" since cmms_cont_mst row 0 didn't exist).

   STRATEGY:  Derive a placeholder vendor list from existing equipment data.

   SQL TO RUN (gives you a list to bulk-INSERT into cmms_cont_mst):

     SELECT DISTINCT
        EQM_MFRID                                              AS proposed_CMM_CONT_ID,
        COALESCE(EQM_MFG_MODEL_NAME, CONCAT('Vendor #', EQM_MFRID))
                                                               AS proposed_CMM_CONT_NAME,
        'MFR'                                                  AS proposed_CMM_CONT_TYPE
       FROM cmms_eqip_mst
      WHERE EQM_MFRID IS NOT NULL
      ORDER BY EQM_MFRID;

   Then for each distinct EQM_MFRID:
     INSERT INTO cmms_cont_mst (CMM_CONT_ID, CMM_CONT_NAME, CMM_CONT_TYPE,
                                 CMM_CONT_STATE_FLAG, CMM_CONT_CREATED_BY,
                                 CMM_CONT_UPDATED_BY)
     VALUES (?, ?, 'MFR', 1, 'BOOTSTRAP', 'BOOTSTRAP');

   CRITICAL: Use the SAME EQM_MFRID values as CMM_CONT_ID, so existing FKs
             on cmms_eqip_mst, cmms_amc_mst, cmms_checklist_mst, cmms_inv_mst
             all resolve correctly. This is one-time only — going forward
             new vendors get AUTO_INCREMENT IDs.

   AFTER THE SEED, run a verification:
     SELECT e.EQM_TYPE, e.EQM_ID, e.EQM_MFRID
       FROM cmms_eqip_mst e
       LEFT JOIN cmms_cont_mst c ON c.CMM_CONT_ID = e.EQM_MFRID
      WHERE c.CMM_CONT_ID IS NULL
        AND e.EQM_MFRID IS NOT NULL;
     -- Should return 0 rows. Any rows here = orphan FK; must fix before
     -- enabling foreign_key_checks in MVP code paths.
```

#### 18.2.c — Section mapping (M5) 🟡

```
   PROBLEM:  Legacy cmms_section_mst has 293 sections. New `sections` table
             has 2 (T&ME, F&PE). For new MVP code paths, equipment and users
             use the new `section_id` column. But what about LEGACY equipment
             (5,704 rows) and LEGACY assignments (294 rows in cmms_section_user_mst)?

   FOR MVP:  No mapping required. New code paths use new `sections`.
             Legacy data continues to use legacy `cmms_section_mst`. They
             coexist by design (ADR-DB-05).

   IF YOU WANT LEGACY EQUIPMENT IN NEW UI (Phase 2 task):
   ───────────────────────────────────────────────────────
   1. DS provides a CSV mapping: legacy_SM_ID → new section_code (TME or FPE)
   2. We run an UPDATE: SET cmms_eqip_mst.EQM_SECTION_ID = (lookup new ID)
   3. Verification: COUNT rows where EQM_SECTION_ID IS NULL after mapping

   This is NOT a Phase 3 task.
```

#### 18.2.d — Existing employees → users decision (M6) 🟡

```
   QUESTION:  cmms_emp_mst has 57 existing employees. Should we automatically
              create a `users` row for each one at bootstrap?

   IF YES (auto-create all 57):
   ───────────────────────────
   Pros:  Day-1 ready; all employees can immediately login.
   Cons:  Every employee gets a SUPER_ADMIN-assigned default role of
          VIEW_ONLY (since we don't know their real role); Super Admin
          must change each one. Net work is the same.

   IF NO (create on demand) — RECOMMENDED:
   ────────────────────────────────────────
   Pros:  Clean audit trail (every USER_CREATE is a deliberate event);
          Super Admin assigns the right role immediately at creation;
          smaller bootstrap surface area.
   Cons:  Phased rollout — employees come on board one at a time.

   MY RECOMMENDATION:  NO. Create on demand via Super Admin UI in Week 2.
                       Only SA79900 and AC77777 exist in `users` post-bootstrap.
```

#### 18.2.e — Job lifecycle backfills (M7, M8) 🟡

```
   PROBLEM:  We're adding JM_MVP_STATUS (5 values) and JR_MVP_STATUS (8 values)
             enum columns to tables with 19,432 / 21,485 existing rows. Default
             values must be sensible.

   JOB CARD BACKFILL (M7):
   ─────────────────────────
   ALL existing job cards → assume terminal: VERIFIED_CLOSED
   Rationale: historical records are unlikely to be reopened or restarted.

   SQL:
     UPDATE cmms_jobcard_mst
        SET JM_MVP_STATUS = 'VERIFIED_CLOSED'
      WHERE JM_MVP_STATUS = 'ASSIGNED';
        -- (ASSIGNED was the schema default at ALTER time)

   IF YOU WANT MORE GRANULAR BACKFILL:
   You could parse the legacy JM_JobStatus char(2) column:
     'CL' → VERIFIED_CLOSED
     'CO' → COMPLETED
     'IP' → IN_PROGRESS
     'AS' → ASSIGNED
   But these legacy codes aren't enforced consistently. The flat
   VERIFIED_CLOSED backfill is safer.

   JOB REQUEST BACKFILL (M8):
   ──────────────────────────────
   Already specified in §10.2 DDL:
     UPDATE cmms_jobrequest_mst
        SET JR_MVP_STATUS = CASE
              WHEN JR_SECTIONJOB_NO IS NOT NULL THEN 'ASSIGNED'
              ELSE 'SUBMITTED'
            END
      WHERE JR_MVP_STATUS = 'DRAFT';

   This bucket is more accurate because the legacy data DOES carry the
   JR_SECTIONJOB_NO link — meaningful signal.
```

### 18.3 Migration Data Cheat-Sheet (one-page summary)

```
   ┌────────────────────────────────────────────────────────────────────┐
   │  TO RUN BOOTSTRAP, DS NEEDS TO DECIDE / PROVIDE:                   │
   ├────────────────────────────────────────────────────────────────────┤
   │                                                                    │
   │  🔴 BLOCKING (cannot proceed without):                              │
   │  ────────────────────────────────────                               │
   │  M1. SM_ID for SA79900/AC77777 EMM_DEPT                            │
   │      → Suggestion: insert new "ADMIN" section (SM_ID=9999)         │
   │                                                                    │
   │  M2. Name/designation/email for SA79900 and AC77777                │
   │      → Suggestion: 'Super Admin Primary/Secondary', sa/ac@org.local│
   │                                                                    │
   │  🟡 BEFORE-WEEK-2 (resolve before real users come on board):       │
   │  ────────────────────────────────────────────────────────────       │
   │  M3. Seed cmms_cont_mst with vendor rows                           │
   │      → Script: DISTINCT EQM_MFRID,EQM_MFG_MODEL_NAME from eqip_mst │
   │                                                                    │
   │  M4. Mapping legacy MFRID → new CMM_CONT_ID                        │
   │      → Reuse the same IDs (recommended)                            │
   │                                                                    │
   │  M5. Section mapping (legacy 293 SM_IDs → new T&ME/F&PE)           │
   │      → Skip for MVP; address in Phase 2                            │
   │                                                                    │
   │  M6. Auto-create users for 57 legacy employees?                    │
   │      → NO (recommended). Create on demand via Super Admin UI.      │
   │                                                                    │
   │  M7. Job card backfill rule                                        │
   │      → ALL legacy → VERIFIED_CLOSED                                │
   │                                                                    │
   │  M8. Job request backfill rule                                     │
   │      → IF has JR_SECTIONJOB_NO → ASSIGNED, else SUBMITTED          │
   │                                                                    │
   │  🟢 NICE-TO-HAVE:                                                   │
   │  ───────────────                                                   │
   │  M9. Head employee_id for T&ME, F&PE                               │
   │  M10. Legacy 23-role dump (for historical viewer P2)               │
   │  M11. bcrypt cost factor (12 prod / 10 dev default)                │
   │  M12. JWT/refresh durations (15min / 7d default)                   │
   └────────────────────────────────────────────────────────────────────┘
```

### 18.4 What's NOT needed for migration

> Stated explicitly so you don't waste time on these:

- ❌ NO migration from `cmms_userrole_mst` (565 rows). Per Q3.
- ❌ NO mapping table between 23 legacy roles → 5 new roles. Per Q4.
- ❌ NO password reset emails (no rotation; lifetime password). Per Q7.
- ❌ NO `password_history` table population (table doesn't exist). Per Q7.
- ❌ NO data migration for `cmms_accessright_mst`, `cmms_module_mst`. Both fully replaced by `permissions` + `role_permissions`.
- ❌ NO data migration for `cmms_section_user_mst`. Replaced by `user_roles`.

---

## 19. INDEX STRATEGY & QUERY PATTERNS

The indexes I designed serve specific MVP query patterns. This section documents the "why" so you (and future maintainers) don't drop them by mistake.

### 19.1 Authentication Hot Path Indexes

| Index                                             | Powers what query                                      | Why critical                                      |
| ------------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------- |
| `users.uk_users_employee_id` (UNIQUE)           | `SELECT … WHERE employee_id = ?` (every login)      | Primary login lookup. UNIQUE = O(1) hash lookup.  |
| `users.idx_users_active (is_active, is_locked)` | "Loginable users" filter                               | Composite; both flags checked together at login   |
| `roles.uk_roles_code` (UNIQUE)                  | role_code → role_id resolution                        | Permission cache priming                          |
| `role_permissions PK (role_id, permission_id)`  | Permission set load                                    | Composite PK is the lookup, no extra index needed |
| `refresh_tokens.uk_rt_hash` (UNIQUE)            | Token validation at refresh                            | UNIQUE prevents duplicate token IDs; O(1) verify  |
| `refresh_tokens.idx_rt_expires`                 | Background sweeper `DELETE WHERE expires_at < NOW()` | Lets cleanup job scan only expired rows           |
| `login_audit.idx_la_emp_time`                   | "Failed logins by SA79900 last hour"                   | Lockout decision; ordered by time desc            |
| `login_audit.idx_la_outcome`                    | Security dashboard ("all FAILED_BAD_PASSWORD today")   | Powers ops alerts                                 |

### 19.2 Equipment & Job Hot Path Indexes

| Index                                           | Powers what query                                   |
| ----------------------------------------------- | --------------------------------------------------- |
| `cmms_eqip_mst.idx_eqip_mvp_status`           | Dashboard counters by status                        |
| `cmms_eqip_mst.idx_eqip_cal_due`              | "What's due in next 30 days" calibration view       |
| `cmms_eqip_mst.idx_eqip_section_new`          | Section-filtered equipment list (T&ME / F&PE pages) |
| `cmms_jobrequest_mst.idx_jr_status`           | "My pending JRs" / "Awaiting approval queue"        |
| `cmms_jobrequest_mst.idx_jr_priority`         | Lab In-Charge "what's urgent first" queue           |
| `cmms_jobrequest_mst.idx_jr_assigned_eng`     | Engineer dashboard ("MY job cards")                 |
| `cmms_jobcard_mst.idx_jc_status`              | JC list filters                                     |
| `equipment_status_history.idx_esh_eqip_time`  | "Timeline of equipment X" view                      |
| `job_request_status_history.idx_jrsh_jr_time` | "Timeline of JR X" view                             |

### 19.3 Audit Query Patterns

| Index                       | Powers what query                                      |
| --------------------------- | ------------------------------------------------------ |
| `audit_log.idx_al_entity` | "Audit trail for equipment X" (entity_type, entity_id) |
| `audit_log.idx_al_actor`  | "Everything SA79900 did this month"                    |
| `audit_log.idx_al_action` | "All EQUIPMENT_VERIFY actions last week"               |
| `audit_log.idx_al_time`   | Time-range dashboards                                  |

### 19.4 Query Pattern Examples (real queries the MVP will run)

**Login flow:**

```sql
-- (1) Find user + verify is_active/is_locked
SELECT u.user_id, u.password_hash, u.is_active, u.is_locked, u.failed_login_count
  FROM users u
 WHERE u.employee_id = ?;
-- Uses uk_users_employee_id (UNIQUE) → 1 row, O(1)

-- (2) Load role + permissions for JWT payload (one round trip)
SELECT r.role_code, p.permission_code
  FROM user_roles ur
  JOIN roles r          ON r.role_id = ur.role_id
  JOIN role_permissions rp ON rp.role_id = r.role_id
  JOIN permissions p    ON p.permission_id = rp.permission_id
 WHERE ur.user_id = ?;
-- Uses user_roles PK → 1 role row; then role_permissions PK (range scan ~30 rows)
-- Hot path; budgeted ≤ 20ms.

-- (3) Update last_login + reset failed_count (single statement)
UPDATE users
   SET last_login_at = NOW(6), last_login_ip = ?, failed_login_count = 0
 WHERE user_id = ?;
```

**Dashboard "pending verification" count:**

```sql
SELECT COUNT(*) FROM cmms_eqip_mst
 WHERE EQM_MVP_STATUS = 'PENDING_VERIFICATION';
-- Uses idx_eqip_mvp_status → 1 partition scan
```

**Lab In-Charge approval queue:**

```sql
SELECT JR_JOBREQUESTNO, JR_PRIORITY, JR_SUBMITTEDBYID, JR_JOBREQUESTDATE
  FROM cmms_jobrequest_mst
 WHERE JR_MVP_STATUS = 'SUBMITTED'
 ORDER BY FIELD(JR_PRIORITY, 'URGENT','HIGH','NORMAL','LOW'), JR_JOBREQUESTDATE ASC
 LIMIT 50;
-- Uses idx_jr_priority composite (priority, status)
```

**Equipment timeline:**

```sql
SELECT from_status, to_status, transitioned_at, transitioned_by, reason
  FROM equipment_status_history
 WHERE eqm_type = ? AND eqm_id = ?
 ORDER BY transitioned_at DESC
 LIMIT 50;
-- Uses idx_esh_eqip_time composite (type, id, time DESC)
```

### 19.5 Things deliberately NOT indexed (and why)

- **`audit_log.notes`** — full-text search not in MVP scope.
- **`cmms_jobcard_cal_observations.JobcardNumber`** — already in PK; no separate index needed.
- **All BLOB columns** — never useful for filtering.
- **Per-row created_by/updated_by audit columns** — too low cardinality on existing data.

---

## 20. PHASE 3 DAY 3 PLAN

What remains to take this design from "locked document" to "running MVP".

```





   ┌──────────────────────────────────────────────────────────────┐
   │  PHASE 3 — DAY 3 AGENDA                                       │
   ├──────────────────────────────────────────────────────────────┤
   │                                                              │
   │  1. DS reviews this v2.0 document, signs off (or flags        │
   │     REVISION-CANDIDATE for any item).                         │
   │                                                              │
   │  2. DS provides answers to §18 Migration Data Requirements:   │
   │     - M1: SM_ID for super-admin EMM_DEPT (or use default 9999)│
   │     - M2: Display names for SA79900, AC77777 (or default)     │
   │     - M6: Auto-create 57 users or no? (recommend NO)          │
   │                                                              │
   │  3. I (Claude) write the 11 migration files                   │
   │     001..010 + 099, exactly as described in §17.1.            │
   │                                                              │
   │  4. I write the migration runner (node script, idempotent).   │
   │                                                              │
   │  5. DS provisions a local dev MySQL with the existing 64-table│
   │     dump loaded, runs the migrations, verifies §17 checklist. │
   │                                                              │
   │  6. We test the full bootstrap path:                          │
   │     - SA79900 logs in with password 'SA79900' → JWT issued    │
   │     - SA79900 creates a test user (e.g. 'DS00001')            │
   │     - DS00001 logs in with password 'DS00001' → JWT issued    │
   │     - DS00001 cannot access /admin/users (403)                │
   │                                                              │
   │  7. Lock the seed scripts as v2.0 "RUNTIME READY".            │
   │                                                              │
   │  8. Move to Phase 4 — first feature module wired end-to-end.  │
   │                                                              │
   └──────────────────────────────────────────────────────────────┘
```

### 20.1 Acceptance Criteria — when is Phase 3 "done"?

✅ This document signed off by DS (v2.0 locked).
✅ §18 Migration Data items M1, M2, M6, M7 decided.
✅ All 11 migration files written, lint-clean, hash-verified.
✅ Migration runner executes successfully on dev MySQL.
✅ Post-bootstrap §17 verification checklist passes 100%.
✅ Manual login test for SA79900 + AC77777 succeeds.
✅ Manual login test for a created NORMAL_USER succeeds.
✅ Permission denial test for NORMAL_USER on admin endpoint returns 403.
✅ One audit_log row written per business-state-changing action.

---

## 21. FINAL SUMMARY — THE LOCKED v2.0 PICTURE

```
┌──────────────────────────────────────────────────────────────────────────┐
│         CMCMIS_SIMPLIFIED — FINAL DATABASE DESIGN v2.0 LOCKED            │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   TWO-UNIVERSE STRATEGY                                                  │
│   ─────────────────────                                                  │
│   Legacy cmms_* tables          coexist with     New snake_case tables   │
│   • untouched data integrity                     • clean modern schema   │
│   • read-mostly                                  • read/write hot path    │
│   • 26 isolated as _legacy_*                     • 15 new active tables  │
│                                                                          │
│   AUTH STACK — COMPLETELY FRESH                                          │
│   ──────────────────────────────                                         │
│   8 new tables: users, roles, permissions, role_permissions,             │
│                 user_roles, refresh_tokens, login_audit                  │
│   5 roles (locked):  SUPER_ADMIN, LAB_IN_CHARGE, LAB_ENGINEER,           │
│                       NORMAL_USER, VIEW_ONLY                             │
│   ~40 permissions (resource:action)                                      │
│   Password: 7 chars, ^[A-Z]{2}[0-9]{5}$, bcrypt cost 12, lifetime        │
│   Initial = employee_id                                                  │
│                                                                          │
│   ORG STRUCTURE — NEW (per Q8)                                           │
│   ─────────────────────────────                                          │
│   departments (TIMCD)                                                    │
│       └─ sections (T&ME, F&PE) with equipment_category ENUM              │
│                                                                          │
│   STATUS HISTORY — SEPARATE TABLES (per Q5, Q6)                          │
│   ─────────────────────────────────────                                  │
│   equipment_status_history          (NEW)                                │
│   job_request_status_history        (NEW)                                │
│   cmms_jobcard_status_hist          (LEGACY KEEP)                        │
│                                                                          │
│   AUDIT — FRESH STACK                                                    │
│   ──────────────────────                                                 │
│   audit_log, audit_log_changes, export_audit (3 new)                     │
│   Synchronous writes, covers every state-changing operation              │
│                                                                          │
│   BOOTSTRAP — SA79900 + AC77777                                          │
│   ─────────────────────────────                                          │
│   Seeded into cmms_emp_mst + users + user_roles (SUPER_ADMIN)            │
│   Password bcrypt('SA79900') for SA79900, bcrypt('AC77777') for AC77777  │
│                                                                          │
├──────────────────────────────────────────────────────────────────────────┤
│   TOTALS                                                                 │
│   ──────                                                                 │
│   53 active MVP tables (15 new + 6 altered + 32 kept)                    │
│   26 legacy tables isolated as _legacy_*                                 │
│   79 grand total tables in DB                                            │
│   ~390,000 rows of historical data — fully preserved                     │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘

   PHASE 3 STATUS:  ✅ DESIGN LOCKED v2.0
                    ▶  Awaiting DS sign-off + §18 migration data answers
                    ▶  Then proceeding to migration file generation
```

---

**END OF FINAL DATABASE DESIGN v2.0 — LOCKED**

*Subordinate to FINAL-DESC-CMCMIS v1.0. Any conflict → FINAL-DESC wins. Any requested change requires explicit v2.1 revision with DS sign-off.*
