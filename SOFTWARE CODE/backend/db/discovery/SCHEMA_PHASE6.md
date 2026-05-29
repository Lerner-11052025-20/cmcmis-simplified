# SCHEMA_PHASE6.md — Canonical ↔ Legacy DB Column Map

**Phase 6 Slice 1 — Job Requests + Job Cards (list + create) module.**
This document is the **source of truth** for how the canonical domain model in
`src/modules/jobRequests/*` and `src/modules/jobCards/*` maps to the real
column names on disk. Every repo function uses `SELECT real_col AS canonical_col`
so services, controllers, and the frontend speak **only** canonical names.

> **Two non-negotiable rules**
> 1. Service / controller / FE code **NEVER** uses `JR_*` / `JM_*` / `EMM_*` /
>    `EQM_*` column names. Those are repo-private.
> 2. Migrations are **ADD-only**. We never DROP, never MODIFY columns to be
>    smaller, never CHANGE NULL ↔ NOT NULL on existing columns.

---

## 1. Decisions register (locked, 2026-05-18)

| ID | Topic | Decision | Why |
|----|-------|----------|-----|
| P6-D1 | Priority enum mismatch | **Map in repo layer**: DB stays `('LOW','NORMAL','HIGH','URGENT')`; canonical `MEDIUM` ↔ DB `NORMAL`; legacy `URGENT` → display `HIGH`. | Zero destructive ALTER. Legacy rows readable. Default `NORMAL` already matches "no-pref" semantics. |
| P6-D2 | Accessories storage | **New child table** `job_request_accessories` (FK → JR_JOBREQUESTNO) | Future-proofs per-accessory queries (e.g. "every JR that used probe X"). Slice 1 reads JSON-shaped output by aggregation in repo. |
| P6-D3 | `request_code` generation | **On-the-fly** as `JR-{YEAR(JR_JOBREQUESTDATE)}-{JR_JOBREQUESTNO}`. No new column. | PK is already unique within year. Saves an ALTER + a write of derived data. |
| P6-D4 | Job Card `card_code` | **On-the-fly** as `JC-{YEAR(JM_JCRecdDate)}-{JM_JobCardNO}`. | Same reasoning as P6-D3. Legacy `JM_SectionJobNo` (e.g. `"01/24/001"`) is preserved but not shown on the new MVP screens. |
| P6-D5 | `job_category`, `job_type` | **ADD two ENUM columns** (`JR_JOB_CATEGORY`, `JR_JOB_TYPE`). Free-form `JR_REQUEST_TYPE` / `JR_REQUESTFOR` are untouched (legacy data preserved). | Strict enums let the FE filter dropdown be deterministic. |
| P6-D6 | T&C compliance | **ADD `JR_TNC_ACCEPTED_AT` + `JR_TNC_VERSION`**. NULL on DRAFT, NOT NULL once SUBMITTED (enforced by service, not DB). | BR-AUD-01 traceability — auditor must be able to prove "user X accepted T&Cs v1 at time Y". |
| P6-D7 | `submitted_by` identity | **Use `JR_SUBMITTEDBYID` VARCHAR(7)** as the canonical FK key (employee_id, not user_id). Snapshot `JR_SUBMITTEDBYNAME`, `JR_DESIGNATION`, `Email` for display. | Mirrors the `audit_log.actor_employee_id` pattern already in use. Avoids JOIN-on-every-list. BR-JR-06: server reads `req.user.employeeId`. |
| P6-D8 | `created_at`/`updated_at` on JR | **Already present implicitly** via `JR_JOBREQUESTDATE` (a single timestamp). **ADD `JR_CREATED_AT`, `JR_UPDATED_AT`** for index-friendly list sorting (legacy `JR_JOBREQUESTDATE` is DATETIME without (6) precision and was sometimes NULL in legacy rows). | Stable ordering for keyset pagination. |
| P6-D9 | `CANCELLED` status | **Skip for slice 1** — not used by any UI in slice 1. Will ALTER ENUM in a future slice when the cancel flow ships. | YAGNI; ALTER ENUM has a brief table lock cost. |
| P6-D10 | `submitted_at` | **Alias `JR_MVP_STATUS_AT`** when status is `SUBMITTED` (already set by Phase 3 backfill). For new requests, repo also sets it explicitly on the transition write. | Single timestamp captures both creation and the SUBMITTED transition. |
| P6-D11 | `division` lookup table | **`cmms_section_mst`** (legacy). The /lookups/divisions endpoint queries it; FE form binds to `SM_ID`. The `sections` table (new) is **not** the right source — it only holds the 2 TIMCD T&ME/F&PE entries, not the dozens of legacy divisions. | The screen's Division dropdown shows ~50 entries (MEG, EMG, MF, …) which live in `cmms_section_mst`, not the new 2-row `sections` table. |

---

## 2. Canonical → real-column map — `job_requests` (legacy `cmms_jobrequest_mst`)

| # | Canonical name | Type | Real column | Notes |
|---|---|---|---|---|
| 1 | `id` | BIGINT | `JR_JOBREQUESTNO` INT (PK, manual seq) | repo aliases; `nextJrNo()` uses `SELECT MAX(JR_JOBREQUESTNO)+1 FOR UPDATE` inside the create txn |
| 2 | `request_code` | VARCHAR(20) | **generated** `CONCAT('JR-', YEAR(JR_JOBREQUESTDATE), '-', LPAD(JR_JOBREQUESTNO, 4, '0'))` | See P6-D3 |
| 3 | `job_category` | ENUM('TME','FPE') | **NEW** `JR_JOB_CATEGORY` ENUM(...) NULL | See P6-D5 |
| 4 | `job_type` | ENUM('CALIBRATION','REPAIR','REGISTRATION') | **NEW** `JR_JOB_TYPE` ENUM(...) NULL | See P6-D5 |
| 5 | `equipment_id` | BIGINT | `JR_EQM_ID` INT (with `JR_EQM_TYPE` composite) | FK to `cmms_eqip_mst (EQM_TYPE,EQM_ID)` |
| 6 | `equipment_name` | VARCHAR(200) | `JR_EQM_NAME` VARCHAR(200) | ✓ |
| 7 | `make` | VARCHAR(120) | `JR_EQM_MFR_NAME` VARCHAR(100) | name snapshot; FK `JR_EQM_MFRID` |
| 8 | `model_no` | VARCHAR(120) | `JR_EQM_MODELNO` VARCHAR(100) | width mismatch — repo truncates input to 100 |
| 9 | `serial_no` | VARCHAR(120) | `JR_EQM_SRNO` VARCHAR(100) | width mismatch — repo truncates input to 100 |
| 10 | `equipment_type` | VARCHAR(60) | `JR_EQM_TYPE` VARCHAR(15) **(part of composite FK)** | width mismatch — repo truncates input to 15 |
| 11 | `options_description` | TEXT | `JR_EQM_OPTNDESC` VARCHAR(200) | width-limited; repo truncates |
| 12 | `accessories` | JSON | **NEW table `job_request_accessories`** | repo `loadAccessories(jrNo)` returns JSON array |
| 13 | `submitted_by_user_id` (canonical) | BIGINT | actually **`JR_SUBMITTEDBYID`** VARCHAR(7) (employee_id) | See P6-D7. Canonical name is misleading — repo aliases as `submitted_by_employee_id`. |
| 14 | `submitted_by_name` | VARCHAR(120) | `JR_SUBMITTEDBYNAME` VARCHAR(100) | ✓ |
| 15 | `submitted_by_designation` | VARCHAR(120) | `JR_DESIGNATION` VARCHAR(100) | ✓ |
| 16 | `submitted_by_emp_id` | VARCHAR(20) | same as `JR_SUBMITTEDBYID` | aliased copy |
| 17 | `submitted_by_email` | VARCHAR(160) | `Email` VARCHAR(300) | yes, the legacy column is literally named `Email` (mixed case) |
| 18 | `lab_phone` | VARCHAR(40) | `JR_PHOENLAB` VARCHAR(100) | yes, spelled `PHOENLAB` in legacy |
| 19 | `room_phone` | VARCHAR(40) | `JR_PHONEROOM` VARCHAR(100) | ✓ |
| 20 | `division_id` | SMALLINT | `JR_DIVISION` INT → `cmms_section_mst.SM_ID` | ✓ |
| 21 | `division_code` | VARCHAR(20) | **JOIN** `cmms_section_mst.SM_SHORTNAME` | denormalised in list payload via JOIN, not stored on JR |
| 22 | `subsystem` | VARCHAR(120) | `JR_SUBSYSTEM` VARCHAR(100) | ✓ |
| 23 | `project_name` | VARCHAR(160) | `JR_PROJECTID` VARCHAR(100) | misnamed in legacy ("ID" but stores name) |
| 24 | `complaint_description` | TEXT | `JR_COMPLAINTANDSYMPTOMS` VARCHAR(400) | width-limited; repo truncates input to 400, service rejects > 4000 chars |
| 25 | `remarks` | TEXT | `JR_REMARKS` VARCHAR(500) | width-limited |
| 26 | `equipment_sent_after_repair` | TINYINT(1) | `JR_AFTERREPAIRS` TINYINT(1) | ✓ |
| 27 | `priority` | ENUM('LOW','MEDIUM','HIGH') | `JR_PRIORITY` ENUM('LOW','NORMAL','HIGH','URGENT') | See P6-D1. Repo maps MEDIUM↔NORMAL, URGENT→HIGH on display |
| 28 | `status` | (see canonical spec) | `JR_MVP_STATUS` ENUM(...) | matches canonical except missing `CANCELLED`. See P6-D9 |
| 29 | `tnc_accepted_at` | DATETIME(6) | **NEW** `JR_TNC_ACCEPTED_AT` DATETIME(6) NULL | NULL until SUBMITTED. Service writes it on submit |
| 30 | `tnc_version` | VARCHAR(10) | **NEW** `JR_TNC_VERSION` VARCHAR(10) NULL DEFAULT 'v1' | ✓ |
| 31 | `created_at` | DATETIME(6) | **NEW** `JR_CREATED_AT` DATETIME(6) DEFAULT NOW(6) | See P6-D8 |
| 32 | `updated_at` | DATETIME(6) | **NEW** `JR_UPDATED_AT` DATETIME(6) DEFAULT NOW(6) ON UPDATE NOW(6) | ✓ |
| 33 | `submitted_at` | DATETIME(6) | `JR_MVP_STATUS_AT` DATETIME(6) | See P6-D10. Set on the DRAFT→SUBMITTED transition |

---

## 3. Canonical → real-column map — `job_cards` (legacy `cmms_jobcard_mst`)

Read-only in slice 1. Only the list query touches this table.

| # | Canonical | Type | Real column | Notes |
|---|---|---|---|---|
| 1 | `id` | BIGINT | `JM_JobCardNO` INT | NOT the PK — `JM_SectionJobNo` is the legacy PK |
| 2 | `card_code` | VARCHAR(20) | **generated** `CONCAT('JC-', YEAR(JM_JCRecdDate), '-', LPAD(JM_JobCardNO, 4, '0'))` | See P6-D4 |
| 3 | `job_request_id` | BIGINT | **derived via FK chain** `cmms_jobrequest_mst.JR_JOBREQUESTNO WHERE JR_SECTIONJOB_NO = JM_SectionJobNo` | repo LEFT JOIN |
| 4 | `job_request_code` | VARCHAR(20) | same derivation, formatted with `JR-{year}-{no}` | denormalised in list payload |
| 5 | `equipment_id` | BIGINT | `JM_EQM_ID` (with `JM_EQM_TYPE` composite) | ✓ |
| 6 | `equipment_name` | VARCHAR(200) | **JOIN** `cmms_eqip_mst.EQM_NAME` | repo LEFT JOIN |
| 7 | `job_type` | ENUM | derived from `JR_JOB_TYPE` via JR JOIN; fallback to `JM_JOBTYPE` tinyint legacy mapping | ✓ |
| 8 | `assigned_engineer_id` | BIGINT | `JR_ASSIGNED_ENGINEER` VARCHAR(7) on the parent JR row | Phase-3 column on JR, not JM |
| 9 | `assigned_engineer_name` | VARCHAR(120) | **JOIN** `cmms_emp_mst.EMM_NAME` keyed on JR_ASSIGNED_ENGINEER | ✓ |
| 10 | `status` | ENUM | `JM_MVP_STATUS` | ✓ matches canonical (5 values) |
| 11 | `start_date` | DATE | `JM_JobStartDate` DATETIME(6) | truncated to DATE on read |
| 12 | `due_date` | DATE | `JM_PlannedComletedDate` DATETIME(6) | yes, "Comleted" — legacy typo |
| 13 | `completed_at` | DATETIME(6) | `JM_JobEndDate` DATETIME(6) | ✓ |
| 14 | `created_at` | DATETIME(6) | `JM_CREATED_ON` DATETIME(6) | ✓ |
| 15 | `updated_at` | DATETIME(6) | `JM_UPDATED_ON` DATETIME(6) | ✓ |

---

## 4. NEW table — `job_request_accessories`

```sql
CREATE TABLE job_request_accessories (
  acc_id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  jr_no            INT             NOT NULL,
  accessory_type   VARCHAR(60)     NOT NULL,
  accessory_name   VARCHAR(120)    NOT NULL,
  serial_no        VARCHAR(120)    NULL DEFAULT NULL,
  position         SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  created_at       DATETIME(6)     NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (acc_id),
  CONSTRAINT fk_jra_jr FOREIGN KEY (jr_no)
    REFERENCES cmms_jobrequest_mst (JR_JOBREQUESTNO),
  INDEX idx_jra_jr_pos (jr_no, position)
);
```

**Repo contract**:
- `loadAccessories(jrNo)` → returns `[{ type, name, serial_no, position }]` ordered by `position ASC`.
- `replaceAccessories(conn, jrNo, accessories[])` — TRUNCATE+INSERT inside the create-JR transaction; safe because nothing else writes here.

---

## 5. Permissions used by this module (all already seeded in Phase 3 migration 006/007)

| Permission code | Roles holding it |
|---|---|
| `job_request:create` | SUPER_ADMIN, LAB_IN_CHARGE, LAB_ENGINEER, NORMAL_USER |
| `job_request:read-own` | SUPER_ADMIN, LAB_IN_CHARGE, LAB_ENGINEER, NORMAL_USER, VIEW_ONLY |
| `job_request:read-all` | SUPER_ADMIN, LAB_IN_CHARGE, LAB_ENGINEER, VIEW_ONLY |
| `job_request:approve` | SUPER_ADMIN, LAB_IN_CHARGE |
| `job_request:reject` | SUPER_ADMIN, LAB_IN_CHARGE |
| `job_request:assign-engineer` | SUPER_ADMIN, LAB_IN_CHARGE |
| `job_card:read-list` | SUPER_ADMIN, LAB_IN_CHARGE, LAB_ENGINEER, VIEW_ONLY |
| `job_card:read-detail` | SUPER_ADMIN, LAB_IN_CHARGE, LAB_ENGINEER, VIEW_ONLY |

**Row-level scope (BR-VIS-01)**:
- Holders of `job_request:read-all` see every row.
- Holders of only `job_request:read-own` see rows where `JR_SUBMITTEDBYID = req.user.employeeId`.

---

## 6. Indexes added for Phase 6

See `100__phase6_jr_indexes.sql`. Covering indexes for:
- `(JR_MVP_STATUS, JR_CREATED_AT DESC, JR_JOBREQUESTNO)` — default list sort
- `(JR_SUBMITTEDBYID, JR_CREATED_AT DESC)` — read-own scope
- `(JR_DIVISION, JR_CREATED_AT DESC)` — division filter
- `(JR_PRIORITY, JR_MVP_STATUS, JR_CREATED_AT DESC)` — priority filter
- `(JM_MVP_STATUS, JM_CREATED_ON DESC, JM_JobCardNO)` — JC default sort
- `(JR_ASSIGNED_ENGINEER, JM_MVP_STATUS)` — engineer-scoped JC list

Existing legacy indexes (`idx_jr_status`, `idx_jr_priority`, `idx_jr_assigned_eng`, `idx_jc_status`) are kept; the new ones overlap intentionally so EXPLAIN picks the narrower one per query.

---

## 7. Tables touched by Phase 6 (all SHOW CREATE TABLE-verified)

| Table | Purpose | Phase 6 changes |
|---|---|---|
| `cmms_jobrequest_mst` | Job Requests master | **ADD 7 columns** (job_category, job_type, tnc_accepted_at, tnc_version, created_at, updated_at, mvp_status_at exists) |
| `cmms_jobcard_mst` | Job Cards master | **NONE** — read-only this slice |
| `job_request_accessories` | NEW child table | **CREATE TABLE** |
| `job_request_status_history` | JR state transitions | **NONE** — already created in Phase 3 mig 001 |
| `cmms_emp_mst` | Employees (FK target) | **NONE** — read-only |
| `cmms_eqip_mst` | Equipment (FK target) | **NONE** — read-only |
| `cmms_section_mst` | Divisions lookup | **NONE** — read-only |
| `audit_log` | Generic audit log | **NONE** — write-only via Phase 3 schema |
| `users` | Identity | **NONE** — read-only |

---

*Authored 2026-05-18 for Deep Sorathiya (DS). Locked at start of Phase 6 Slice 1.*
