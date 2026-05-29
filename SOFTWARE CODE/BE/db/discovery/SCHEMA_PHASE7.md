# SCHEMA_PHASE7.md — Canonical ↔ Legacy DB Column Map

**Phase 7 Slice 1 — Admin module (User & Role Mgmt + Employees Master Data).**
This is the canonical mapping for `adminUsers` and `employees` modules.
Every repo function uses `SELECT real_col AS canonical_col` so services /
controllers / FE speak ONLY canonical names.

> **Rule**: ADD-only migrations. Never DROP, never RENAME, never MODIFY-NULL.

---

## 1. Decisions register (locked, 2026-05-18)

| ID | Topic | Decision | Why |
|----|-------|----------|-----|
| P7-D1 | Role storage | **Keep `user_roles` junction** (Phase 3 design); do NOT denormalise into `users.role` | Single source of truth; Phase 3 seed depends on it; existing JWT issue flow already joins. |
| P7-D2 | Token versioning | **ADD `users.token_version INT UNSIGNED NOT NULL DEFAULT 1`** | Real-time revocation strategy D-7.2; atomic `token_version = token_version + 1` on every role/status change. |
| P7-D3 | Deactivation provenance | **ADD `deactivated_at`, `deactivated_by_user_id`, `deactivation_reason` on `users`** | Audit-grade: who deactivated whom and why. Reason required (Q-3 locked). |
| P7-D4 | `employees` = `cmms_emp_mst` | **Repo aliases**; canonical `employees` maps 1:1 to legacy `cmms_emp_mst`. NO new table. | Phase 3 already adopted cmms_emp_mst as the master. Duplicating it would invite drift. |
| P7-D5 | Employee active flag | **Alias `is_active = (1 - EMM_INACTIVE)`** on read; write `EMM_INACTIVE = (active ? 0 : 1)` on update | Existing EMM_INACTIVE is inverse-flag legacy. No ALTER. |
| P7-D6 | Employee creator/updater | **Use `EMM_CREATED_BY` / `EMM_UPDATED_BY`** (employee_id varchar(7)) — mirrors `audit_log.actor_employee_id` | Same pattern as Phase 6. No ALTER. Service reads `req.user.employeeId`. |
| P7-D7 | Employee soft-delete | **Set `EMM_INACTIVE = 1`** (per Q-8). Add `deactivated_at` column for audit timestamp. | Hard delete would cascade-break legacy FKs to job requests / equipment. |
| P7-D8 | `divisions` = `cmms_section_mst` | **Repo aliases** — same as Phase 6 lookups module | 168 legacy divisions already proven as lookup source. |
| P7-D9 | Permission split | **ADD permission codes `user:activate`, `user:deactivate`, `user:force-logout`**; keep legacy `user:activate-deactivate` for back-compat | Per-action audit + granular permission gates. |
| P7-D10 | LRU cache | **5000 entries / 30 s TTL / in-process Map** — no Redis | Q-6 locked; ~10× headroom over SAC's ~500 users. |
| P7-D11 | Initial password (new account) | **System-generates 12-char random**, shown ONCE to SA at creation time | Q-1 locked. Lowest leak risk for slice 1. |
| P7-D12 | Force-logout button | **YES** — `POST /admin/users/:id/force-logout` bumps `token_version` only | Q-5 locked. Useful for credential-compromise response. |

---

## 2. Canonical → real-column map — `users` (Phase 3 sealed + Phase 7 additive)

| Canonical name | Type | Real column | Notes |
|---|---|---|---|
| `id` | BIGINT | `user_id` | PK auto-inc |
| `employee_id` | VARCHAR(7) | `employee_id` | FK to `cmms_emp_mst.EMM_ID` |
| `password_hash` | VARCHAR(60) | `password_hash` | bcrypt |
| `is_active` | TINYINT(1) | `is_active` | ✓ direct |
| `is_locked` | TINYINT(1) | `is_locked` | Auto-set on failed-login threshold |
| `failed_login_count` | SMALLINT | `failed_login_count` | ✓ direct |
| `last_login_at` | DATETIME(6) | `last_login_at` | ✓ direct (Phase 3) |
| `last_login_ip` | VARCHAR(45) | `last_login_ip` | ✓ direct |
| `password_hash_set_at` | DATETIME(6) | `password_hash_set_at` | ✓ direct |
| `section_id` | INT | `section_id` | FK to NEW `sections` table (TIMCD-only) — not used by adminUsers list |
| **`token_version`** (P7-D2) | INT UNSIGNED | **NEW** `token_version` DEFAULT 1 | Bumped on role / status / force-logout |
| **`deactivated_at`** (P7-D3) | DATETIME(6) | **NEW** `deactivated_at` NULL | Set on deactivate |
| **`deactivated_by_user_id`** (P7-D3) | BIGINT UNSIGNED | **NEW** `deactivated_by_user_id` NULL | The acting SA |
| **`deactivation_reason`** (P7-D3) | VARCHAR(500) | **NEW** `deactivation_reason` NULL | Required ≥ 5 chars (Q-3) |
| `created_at` | DATETIME(6) | `created_at` | ✓ direct |
| `created_by` | VARCHAR(20) | `created_by` | employee_id of SA who created |
| `updated_at` | DATETIME(6) | `updated_at` | ON UPDATE CURRENT_TIMESTAMP |
| `updated_by` | VARCHAR(20) | `updated_by` | employee_id of last modifier |
| `role` (canonical) | ENUM | **JOIN** `user_roles.role_id` → `roles.role_code` | Computed via JOIN — see §4 |

---

## 3. Canonical → real-column map — `employees` (= `cmms_emp_mst`)

| Canonical name | Type | Real column | Notes |
|---|---|---|---|
| `id` (synthetic) | VARCHAR(7) | `EMM_ID` | PK — same as `employee_id` |
| `employee_id` | VARCHAR(7) | `EMM_ID` | ✓ FK target |
| `full_name` | VARCHAR(100) | `EMM_NAME` | |
| `designation` | VARCHAR(200) | `EMM_DESIGNATION` | |
| `designation_date` | DATETIME | `EMM_DESIGDATE` | nullable |
| `division_id` | INT | `EMM_DEPT` | FK to `cmms_section_mst.SM_ID` |
| `date_of_birth` | DATETIME | `EMM_DOB` | nullable |
| `date_of_joining` | DATETIME | `EMM_DOJ` | nullable |
| `blood_group` | VARCHAR(50) | `EMM_BLOODGRP` | nullable |
| `address` | VARCHAR(200) | `EMM_ADD` | nullable |
| `city` | VARCHAR(100) | `EMM_CITY` | nullable |
| `state` | VARCHAR(100) | `EMM_STATE` | nullable |
| `zip` | VARCHAR(100) | `EMM_ZIP` | nullable |
| `lab_phone` | VARCHAR(100) | `EMM_PH1` | nullable |
| `room_phone` | VARCHAR(100) | `EMM_PH2` | nullable |
| `email` | VARCHAR(100) | `EMM_EMAIL` | nullable |
| `mobile` | VARCHAR(100) | `EMM_MOBILE` | nullable |
| `remarks` | VARCHAR(500) | `EMM_REMARKS` | nullable |
| **`is_active`** (P7-D5) | TINYINT(1) | **alias** `(1 - EMM_INACTIVE)` | Inverse of legacy flag; no ALTER |
| `created_by_employee_id` | VARCHAR(7) | `EMM_CREATED_BY` | NOT NULL legacy contract |
| `created_at` | DATETIME(6) | `EMM_CREATED_ON` | NOT NULL legacy contract |
| `updated_by_employee_id` | VARCHAR(7) | `EMM_UPDATED_BY` | NOT NULL legacy contract |
| `updated_at` | DATETIME(6) | `EMM_UPDATED_ON` | NOT NULL legacy contract |
| **`deactivated_at`** | DATETIME(6) | **NEW** `EMM_DEACTIVATED_AT` NULL | Set on soft-delete |

---

## 4. Role resolution — the JOIN chain

```
SELECT u.user_id, ..., r.role_code AS role
  FROM users u
  LEFT JOIN user_roles ur ON ur.user_id = u.user_id
  LEFT JOIN roles      r  ON r.role_id  = ur.role_id
  WHERE ...
```

**Role change** (transactional):
```
1. SELECT old role: u.user_id, ur.role_id, r.role_code
2. SELECT target role_id from roles WHERE role_code = ?
3. UPDATE user_roles SET role_id = ? WHERE user_id = ?
4. UPDATE users SET token_version = token_version + 1,
                    updated_at    = NOW(6),
                    updated_by    = ?
              WHERE user_id = ?
5. INSERT INTO user_role_history (...)
6. INSERT INTO audit_log         (...)
COMMIT
```

---

## 5. NEW table — `user_role_history`

```sql
CREATE TABLE IF NOT EXISTS user_role_history (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id         BIGINT UNSIGNED NOT NULL,
  from_role       VARCHAR(30)     NULL,
  to_role         VARCHAR(30)     NOT NULL,
  from_active     TINYINT(1)      NULL,
  to_active       TINYINT(1)      NOT NULL,
  action          ENUM('CHANGE_ROLE','ACTIVATE','DEACTIVATE','CREATE','FORCE_LOGOUT') NOT NULL,
  reason          VARCHAR(500)    NULL,
  actor_user_id   BIGINT UNSIGNED NOT NULL,
  created_at      DATETIME(6)     NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  CONSTRAINT fk_urh_user  FOREIGN KEY (user_id)       REFERENCES users(user_id),
  CONSTRAINT fk_urh_actor FOREIGN KEY (actor_user_id) REFERENCES users(user_id),
  KEY idx_urh_user (user_id, created_at)
);
```

---

## 6. New permissions seeded by migration 113

| Code | Already seeded? | Action |
|---|---|---|
| `user:read-list` | YES (Phase 3 mig 006) | — |
| `user:role-assign` | YES (Phase 3 mig 006) | — |
| `user:activate-deactivate` | YES (Phase 3 mig 006) | Kept for back-compat |
| `user:activate` | NO | **INSERT IGNORE** + grant to SUPER_ADMIN |
| `user:deactivate` | NO | **INSERT IGNORE** + grant to SUPER_ADMIN |
| `user:force-logout` | NO | **INSERT IGNORE** + grant to SUPER_ADMIN |
| `master:employees:manage` | YES (Phase 3 mig 006) | — |

---

## 7. The five invariants (enforced at `adminUsers.stateMachine.js`)

| ID | Rule | Error code |
|----|------|------------|
| I-1 | Cannot demote the LAST active SUPER_ADMIN | `LAST_SUPER_ADMIN` (409) |
| I-2 | Cannot deactivate the LAST active SUPER_ADMIN | `LAST_SUPER_ADMIN` (409) |
| I-3 | Cannot change YOUR OWN role | `SELF_MODIFICATION_FORBIDDEN` (409) |
| I-4 | Cannot deactivate YOURSELF | `SELF_DEACTIVATE_FORBIDDEN` (409) |
| I-5 | Cannot soft-delete an employee with an ACTIVE user account | `EMPLOYEE_HAS_ACTIVE_USER` (409) |

---

*Authored 2026-05-18 for Deep Sorathiya (DS). Locked at start of Phase 7 Slice 1.*
