# SCHEMA_PHASE9.md — Job Card Detail + Lifecycle + Closure

**Phase 9** — JC detail page (13 tabs) · engineer workflow (start-work → update → complete) · LIC/SA closure (verify-close · reopen) · Task Checklist · Documents · JR loose-ends (edit/cancel DRAFT). Code-only delivery.

> **Authority chain.** `FINAL-DESC-CMCMIS v1.0` > `FINAL_DB_DESIGN v2.0` > `SCHEMA_PHASE6.md` > `SCHEMA_PHASE7.md` > `SCHEMA_PHASE7_SLICE2.md` > **this file**.
> **Rule.** `ADD-only` migrations. Never `DROP`, never `RENAME`, never widen-to-`NOT NULL` on populated legacy columns.

---

## 0. Step-0 Introspection — Ground Truth (run 2026-05-19 10:52 UTC)

| Fact | Value | Implication |
|------|------|-------------|
| `cmms_jobcard_mst` row count | **19 432 legacy + 4 MVP** | Legacy rows pre-date the MVP lifecycle (all `VERIFIED_CLOSED`); only the 4 MVP rows will exercise Phase 9 transitions. Detail page must gracefully handle "legacy JC with all-null Phase 9 columns" as a read-only view. |
| Phase 9 column delta needed | **53 new columns** on `cmms_jobcard_mst`, **0 already exist** | Real, big additive migration. All NULLable. |
| Proposed child tables | **6 new** (`jc_maintenance_details`, `jc_spares_used`, `jc_task_checklist`, `jc_documents`, `jc_observations_readings`, `task_library`) | All snake_case (matches NEW-table doctrine). |
| `JM_MVP_STATUS` enum values | `ASSIGNED, IN_PROGRESS, COMPLETED, VERIFIED_CLOSED, REOPENED` | All needed Phase 9 states already in enum — no ALTER MODIFY needed for JC lifecycle. ✓ |
| `JR_MVP_STATUS` enum values | `DRAFT, SUBMITTED, ASSIGNED, IN_PROGRESS, COMPLETED, VERIFIED_CLOSED, REJECTED, REOPENED` | **No `CANCELLED`** → see D-9.11 below. |
| Phase 9 permission grants | **ALL 6 already seeded and granted** to the right roles (P3 mig 006/007) | Zero new perm rows needed. |
| Current DRAFT JRs (for PART D smoke) | 2 (JR-24238, JR-24240) | Enough seed data to smoke edit/cancel. |
| Existing JC indexes | `idx_jc_engineer_status`, `idx_jc_parent_jr`, `idx_jc_due_date`, `idx_jc_list_default`, `idx_jc_status_verified`, `idx_jc_status_ended`, `idx_jc_status`, `idx_jc_recd_date` | Good coverage; only `idx_jc_completion` is new. |
| `multer` (file uploads) | **NOT INSTALLED** in `BE/node_modules` | Must `npm install multer` before Documents sub-module can start. |

**Full raw output:** `db/discovery/introspect_phase9_2026-05-19-10-52.out`

---

## 1. Decisions Register (P9-D1 … P9-D14 · LOCKED)

| ID | Topic | Decision | Why |
|----|-------|----------|-----|
| **D-9.1** | One page, 13 tabs (carries forward from prompt) | Single React component renders ALL tabs; conditional on status + perms. URL = `/job-cards/:id?tab=…` for deep-link. | Engineer mental model = "this is my card". |
| **D-9.2** | Save-draft + auto-save (carries forward) | All data tabs `PATCH /job-cards/:id` with a `tab` discriminator. Auto-save every 30 s when status=IN_PROGRESS AND user dirty AND active. Manual `Save as Draft` + `Save Changes` buttons both hit same endpoint; visual distinction only. | Engineers fill long forms over hours. |
| **D-9.3** | 5 child tables for multi-row data (carries forward) | `jc_maintenance_details`, `jc_spares_used`, `jc_task_checklist`, `jc_documents`, `jc_observations_readings`. Hard-delete on row removal (Q-5). | Per-row audit + future independent search. |
| **D-9.4** | 4 pre-completion gates (carries forward) | All tasks done · all observations recorded · cal-cert generated (calibration only) · all required docs uploaded. Plus completion_summary (≥20 chars), actual_completion_date, total_hours_spent ≥0. | Audit-grade closure. |
| **D-9.5** | Closure form full contract (carries forward) | Quality Review + Customer Acknowledgment + Final Notes. Customer "received in satisfactory condition" checkbox is REQUIRED (Q-9). | Hard rule per Q-9. |
| **D-9.6** | Reopen preserves data, resets completion+closure (carries forward) | Reopen clears completion + (if from VERIFIED_CLOSED) closure fields. Data tabs untouched. `reopen_count` incremented. | Audit trail preserved. |
| **D-9.7** | Task library is reference data, pre-filtered by workflow_type category (Q-4) | `task_library` table seeded with ~50 std tasks across 3 categories. Engineer dropdown pre-filters by JC's workflow category. "Show all" toggle available. Custom tasks never promoted to library (no spam path). | Q-4 + spam-prevention. |
| **D-9.8** | Documents on local disk via multer | `storage/job-cards/<jc_id>/<file>`. 10 MB/file, 50 files/JC max. Allow-list mimetypes. Soft-delete (`deleted_at`). | S3 migration is Slice 2; local disk works for SAC scale. |
| **D-9.9** | Refetch interval 15 s on detail, optimistic only for task toggles | More aggressive than list (30 s) because engineer is active. | Live data without SSE. |
| **D-9.10** | **NEW · Column naming on `cmms_jobcard_mst`** | New Phase 9 columns use **canonical snake_case** (e.g. `plug_in_accessories`, `completion_summary`), NOT `JM_*` prefix. Documented as a deliberate **deviation** from P6-D1 ("legacy ALTER columns match UPPER_PREFIX style"). | (1) DS's prompt §7 specifies snake_case; (2) 53 columns of UPPER_SNAKE would be visually noisy and harder to spell across BE+FE; (3) the new columns are MVP-only concepts (not extensions to legacy fields), so the "match legacy style" rule doesn't naturally apply; (4) keeps repo aliasing simple — no canonical↔legacy mapping for these columns. Phase 7 Slice 2's `JM_*` precedent is overridden ONLY for Phase 9; Slice 2 columns stay as-is (no rename). |
| **D-9.11** | **NEW · `CANCELLED` is a logical-only JR state** | `JR_MVP_STATUS` enum does NOT contain `CANCELLED`. Cancel writes `JR_CANCELLED_AT DATETIME NOT NULL`, `JR_CANCELLED_BY VARCHAR(7) NOT NULL`, `JR_CANCEL_REASON VARCHAR(500) NULL` (added in Phase 9 migration). The DB status stays `DRAFT`, but the **list endpoint excludes rows where `JR_CANCELLED_AT IS NOT NULL`** unless `?include_cancelled=true` is passed. State machine adds `DRAFT → CANCELLED (logical)` transition: writes the timestamp + actor + history row, no enum change. | Same doctrine as Phase 7 Slice 2's APPROVED — avoid ENUM MODIFY on a populated column. |
| **D-9.12** | **NEW · Actor columns use `employee_id VARCHAR(7)`, not `user_id BIGINT`** | Despite prompt naming them `marked_complete_by_user_id` etc., the actual columns will be `marked_complete_by_employee_id VARCHAR(7)`. Mirrors `JR_APPROVED_BY`, `JR_REJECTED_BY`, `JM_ASSIGNED_ENGINEER`, `audit_log.actor_employee_id`. | Consistency across the schema (per [[cmcmis-phase7-slice2-delivered]] D-7.2.9). One identity shape for all `*_by_*` columns avoids "which one is right". |
| **D-9.13** | **NEW · Reopen of JR (loose end from §0 audit) is OUT OF SCOPE this phase** | Phase 9 prompt mentions JR cancel + edit but not JR reopen from REJECTED. Confirmed: REJECTED is terminal per Phase 7 Slice 2 Q-3. Phase 9 closes only the JR `DRAFT` loose ends, not REJECTED reopen. | Avoid scope creep. |
| **D-9.14** | **NEW · Legacy 19,432 VERIFIED_CLOSED JCs are read-only on detail page** | If a JC's row pre-dates Phase 9 (heuristic: `JM_PARENT_JR_NO IS NULL` AND `status='VERIFIED_CLOSED'` AND `JM_ASSIGNED_ENGINEER IS NULL`), the detail page renders a one-line banner "Legacy Job Card — read-only view" and HIDES every action button. No reopen, no edit, no upload. | The 53 new Phase 9 columns will be NULL on legacy rows. Allowing transitions on them would corrupt the legacy data and break old reports. |

---

## 2. Migration plan (idempotent, INFORMATION_SCHEMA-guarded)

| File # | Purpose | Risk |
|--------|---------|------|
| **300** | `300__phase9_jc_columns.sql` — ADD 53 NULLable cols on `cmms_jobcard_mst` (snake_case per D-9.10) | None — all NULL, no constraint changes |
| **301** | `301__phase9_jc_child_tables.sql` — CREATE 5 new `jc_*` tables (D-9.3) | None — new tables |
| **302** | `302__phase9_task_library.sql` — CREATE `task_library` + seed ~50 standard tasks (D-9.7) | None |
| **303** | `303__phase9_jr_cancel_columns.sql` — ADD `JR_CANCELLED_AT`, `JR_CANCELLED_BY`, `JR_CANCEL_REASON` on `cmms_jobrequest_mst` (D-9.11) | None — all NULL |
| **304** | `304__phase9_indexes.sql` — `idx_jc_completion`, child-table indexes | None |

> **Phase numbering note**: Phase 8 used 120-122. Phase 7 Slice 1 used 110-113. Phase 7 Slice 2 used 200-201. Phase 9 jumps to 300+ to leave clean numeric room for any S2-hotfix between Slice 2 and Phase 9.

---

## 3. JC — Canonical ↔ Real-Column Map (Phase 9 write surface)

> **Naming convention this phase:** new columns are canonical snake_case (D-9.10). Existing legacy `JM_*` columns are left in place; the repo continues aliasing `JM_*` → canonical on read.

| Tab | Canonical name | Type | NULL? | Notes |
|-----|---------------|------|------|-------|
| Plug-In/Acc. | `plug_in_accessories` | TEXT | YES | Single textarea. |
| Submitted&Recv | `equipment_submitted_date` | DATETIME(6) | YES | Engineer-entered. |
|  | `submitted_by` | VARCHAR(255) | YES | Free-text name. |
|  | `equipment_received_date_actual` | DATETIME(6) | YES | Distinct from `JM_JCRecdDate` (LIC's planned date). |
|  | `received_by` | VARCHAR(255) | YES | Free-text. |
| JC Details | `instrument_received_date` | DATE | YES | UI date input. |
|  | `job_complete_planned_date` | DATE | YES | (Distinct from `JM_PlannedComletedDate` legacy.) |
|  | `job_type` | ENUM('IN_HOUSE','VENDOR') | YES | New enum. |
|  | `repair_type` | ENUM('BREAK_DOWN','WARRANTY','PM','NEED_BASED') | YES |  |
|  | `job_request_remarks` | TEXT | YES |  |
| Equipments Used | `equipments_used` | TEXT | YES | Single textarea. |
| Awaiting Info | `awaiting_for` | VARCHAR(255) | YES |  |
|  | `awaiting_status` | ENUM('AWAITING_FOR_SPARES','AWAITING_FOR_VENDOR','AWAITING_FOR_CUSTOMER','AWAITING_FOR_INFO','NONE') | YES | DEFAULT 'NONE'. |
|  | `supplier_name` | VARCHAR(255) | YES |  |
|  | `awaiting_from_date` | DATE | YES |  |
|  | `awaiting_clear_date` | DATE | YES |  |
|  | `attended_by` | VARCHAR(255) | YES |  |
| Procurement | `indent_no` | VARCHAR(100) | YES |  |
|  | `indent_date` | DATE | YES |  |
|  | `mirv_no` | VARCHAR(100) | YES |  |
|  | `mirv_date` | DATE | YES |  |
|  | `po_no` | VARCHAR(100) | YES |  |
|  | `po_date` | DATE | YES |  |
|  | `procurement_cost` | DECIMAL(12,2) | YES |  |
| Contract/Warr. | `vendor_supplier_name` | VARCHAR(255) | YES |  |
|  | `intimation_sent_on` | DATE | YES |  |
|  | `sent_to_vendor_date` | DATE | YES |  |
|  | `received_from_vendor_date` | DATE | YES |  |
|  | `gate_pass_no` | VARCHAR(100) | YES |  |
|  | `gate_pass_issued_date` | DATE | YES |  |
|  | `cost_of_component` | DECIMAL(12,2) | YES |  |
|  | `labour_charges` | DECIMAL(12,2) | YES |  |
|  | `invoice_no` | VARCHAR(100) | YES |  |
|  | `invoice_recd_on` | DATE | YES |  |
| Observations | `observations_text` | TEXT | YES |  |
|  | `job_status_display` | ENUM('AWAITING_FOR_VENDOR','AWAITING_FOR_SPARES','IN_PROGRESS_NORMAL','HOLD','RESUMED') | YES | DEFAULT 'IN_PROGRESS_NORMAL'. **Separate from system status** (Q-8). |
| Completion | `completion_summary` | TEXT | YES | Min 20 chars at mark-complete. |
|  | `actual_completion_date` | DATE | YES |  |
|  | `total_hours_spent` | DECIMAL(6,2) | YES | Manual entry (Q-6). |
|  | **`marked_complete_by_employee_id`** | VARCHAR(7) | YES | D-9.12. |
|  | `marked_complete_at` | DATETIME(6) | YES |  |
| Closure | `reviewed_by` | VARCHAR(255) | YES | Free-text reviewer name. |
|  | `review_date` | DATE | YES |  |
|  | `review_comments` | TEXT | YES |  |
|  | `equipment_received_by_customer` | VARCHAR(255) | YES |  |
|  | `customer_received_date` | DATE | YES |  |
|  | `customer_acknowledged` | TINYINT(1) | NO | DEFAULT 0. Required = 1 at verify-close (Q-9). |
|  | `final_closure_notes` | TEXT | YES |  |
|  | **`verified_closed_by_employee_id`** | VARCHAR(7) | YES | D-9.12. |
|  | `verified_closed_at` | DATETIME(6) | YES |  |
| Reopen | `last_reopened_at` | DATETIME(6) | YES |  |
|  | **`last_reopened_by_employee_id`** | VARCHAR(7) | YES | D-9.12. |
|  | `reopen_count` | INT UNSIGNED | NO | DEFAULT 0. |

> The 19 432 legacy rows have all 53 columns NULL after migration → exercised by D-9.14 read-only banner.

---

## 4. Child tables (Phase 9 DDL · full)

### 4.1 `jc_maintenance_details`
```sql
CREATE TABLE IF NOT EXISTS jc_maintenance_details (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  jc_section_no   VARCHAR(9)      NOT NULL,            -- FK to cmms_jobcard_mst.JM_SectionJobNo
  sr_no           SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  defect_description  TEXT  NOT NULL,
  observation         TEXT  NULL,
  action_taken        TEXT  NULL,
  remarks             TEXT  NULL,
  created_at      DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at      DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  KEY idx_jcm_jc (jc_section_no, sr_no),
  CONSTRAINT fk_jcm_jc FOREIGN KEY (jc_section_no) REFERENCES cmms_jobcard_mst(JM_SectionJobNo)
);
```

### 4.2 `jc_spares_used`
```sql
CREATE TABLE IF NOT EXISTS jc_spares_used (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  jc_section_no   VARCHAR(9)      NOT NULL,
  sr_no           SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  spare_type      VARCHAR(120)    NULL,
  source          ENUM('CASH_PURCHASE','VENDOR','STOCK','WARRANTY','OTHER') NOT NULL DEFAULT 'CASH_PURCHASE',
  part_no         VARCHAR(120)    NULL,
  part_description TEXT           NULL,
  quantity        DECIMAL(10,2)   NULL,
  cost            DECIMAL(12,2)   NULL,
  created_at      DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at      DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  KEY idx_jcs_jc (jc_section_no, sr_no),
  CONSTRAINT fk_jcs_jc FOREIGN KEY (jc_section_no) REFERENCES cmms_jobcard_mst(JM_SectionJobNo)
);
```

### 4.3 `jc_task_checklist`
```sql
CREATE TABLE IF NOT EXISTS jc_task_checklist (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  jc_section_no   VARCHAR(9)      NOT NULL,
  task_id         BIGINT UNSIGNED NULL,               -- FK to task_library.id (NULL if custom)
  task_text       VARCHAR(500)    NOT NULL,           -- snapshot at add time
  is_custom       TINYINT(1)      NOT NULL DEFAULT 0,
  is_completed    TINYINT(1)      NOT NULL DEFAULT 0,
  completed_by_employee_id VARCHAR(7) NULL,
  completed_at    DATETIME(6)     NULL,
  order_index     SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  created_at      DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  KEY idx_jct_jc (jc_section_no, order_index),
  KEY idx_jct_jc_done (jc_section_no, is_completed),
  CONSTRAINT fk_jct_jc FOREIGN KEY (jc_section_no) REFERENCES cmms_jobcard_mst(JM_SectionJobNo)
);
```

### 4.4 `jc_documents`
```sql
CREATE TABLE IF NOT EXISTS jc_documents (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  jc_section_no   VARCHAR(9)      NOT NULL,
  filename        VARCHAR(255)    NOT NULL,           -- original client filename
  storage_filename VARCHAR(255)   NOT NULL,           -- on-disk name (uuid + ext)
  mimetype        VARCHAR(100)    NOT NULL,
  size_bytes      INT UNSIGNED    NOT NULL,
  storage_path    VARCHAR(500)    NOT NULL,           -- absolute path under storage/
  doc_type        ENUM('CALIBRATION_CERT','INSPECTION_REPORT','PHOTO_BEFORE','PHOTO_AFTER','VENDOR_INVOICE','REQUIRED','OTHER') NOT NULL DEFAULT 'OTHER',
  uploaded_by_employee_id VARCHAR(7) NOT NULL,
  uploaded_at     DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  deleted_at      DATETIME(6) NULL,                   -- soft-delete
  deleted_by_employee_id VARCHAR(7) NULL,
  KEY idx_jcd_jc (jc_section_no, doc_type),
  KEY idx_jcd_active (jc_section_no, deleted_at),
  CONSTRAINT fk_jcd_jc FOREIGN KEY (jc_section_no) REFERENCES cmms_jobcard_mst(JM_SectionJobNo)
);
```

### 4.5 `jc_observations_readings`
```sql
CREATE TABLE IF NOT EXISTS jc_observations_readings (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  jc_section_no   VARCHAR(9)      NOT NULL,
  parameter       VARCHAR(255)    NOT NULL,           -- e.g. "Frequency accuracy @ 1 GHz"
  value           VARCHAR(255)    NOT NULL,           -- e.g. "±0.5 ppm"
  unit            VARCHAR(30)     NULL,
  reading_type    ENUM('PRE_CAL','POST_CAL','INSPECTION','OTHER') NOT NULL DEFAULT 'OTHER',
  notes           TEXT            NULL,
  recorded_by_employee_id VARCHAR(7) NOT NULL,
  recorded_at     DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  KEY idx_jcr_jc (jc_section_no, recorded_at DESC),
  CONSTRAINT fk_jcr_jc FOREIGN KEY (jc_section_no) REFERENCES cmms_jobcard_mst(JM_SectionJobNo)
);
```

### 4.6 `task_library` (reference)
```sql
CREATE TABLE IF NOT EXISTS task_library (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  category        ENUM('CALIBRATION','INSPECTION','MAINTENANCE') NOT NULL,
  task_text       VARCHAR(500)    NOT NULL,
  display_order   SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  is_active       TINYINT(1)      NOT NULL DEFAULT 1,
  created_at      DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  KEY idx_tlib_cat (category, is_active, display_order)
);
```

> Migration 302 seeds ~15 tasks per category (45 total) drawn from the spec's example task names (image 15).

---

## 5. JR cancel — column additions

```sql
ALTER TABLE cmms_jobrequest_mst
  ADD COLUMN JR_CANCELLED_AT DATETIME(6) NULL,
  ADD COLUMN JR_CANCELLED_BY VARCHAR(7) NULL,
  ADD COLUMN JR_CANCEL_REASON VARCHAR(500) NULL;

CREATE INDEX idx_jr_cancelled ON cmms_jobrequest_mst (JR_CANCELLED_AT);
```

`listJobRequests` repo gets `AND (jr.JR_CANCELLED_AT IS NULL OR ? = 1)` predicate gated by `params.include_cancelled`.

---

## 6. JC State machine (NEW `jobCards.stateMachine.js`)

```
ASSIGNED ─[start-work]──> IN_PROGRESS ─[mark-complete]──> COMPLETED ─[verify-close]──> VERIFIED_CLOSED
                              ↑                              │                              │
                              ├──── reopen (LIC/SA) ─────────┘                              │
                              └──── reopen (LIC/SA) ─────────────────────────────────────────┘
```

| (from, action) | to | perm | additional gates |
|----------------|----|------|------------------|
| `ASSIGNED, start-work` | `IN_PROGRESS` | `job_card:start-work` | own engineer OR LIC/SA |
| `IN_PROGRESS, save` (no transition) | `IN_PROGRESS` | `job_card:update-tasks` | own engineer OR LIC/SA |
| `IN_PROGRESS, mark-complete` | `COMPLETED` | `job_card:complete` | own engineer OR LIC/SA · 4 pre-completion gates · completion_summary ≥20 chars |
| `COMPLETED, verify-close` | `VERIFIED_CLOSED` | `job_card:verify-close` | LIC/SA only · full closure form |
| `COMPLETED, reopen` | `IN_PROGRESS` | `job_card:reopen` | LIC/SA only · reason ≥20 chars |
| `VERIFIED_CLOSED, reopen` | `IN_PROGRESS` | `job_card:reopen` | LIC/SA only · reason ≥20 chars · also clears closure fields |

Every transition writes ONE `audit_log` row + ONE `job_request_status_history`-style row in `job_card_status_history` (NEW table — see §7).

---

## 7. NEW table — `job_card_status_history`

Mirrors `job_request_status_history` exactly (Phase 6 pattern).

```sql
CREATE TABLE IF NOT EXISTS job_card_status_history (
  history_id      BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  jc_section_no   VARCHAR(9)      NOT NULL,
  from_status     VARCHAR(30)     NULL,
  to_status       VARCHAR(30)     NOT NULL,
  transitioned_at DATETIME(6)     NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  transitioned_by VARCHAR(7)      NOT NULL,
  reason          VARCHAR(1000)   NULL,
  KEY idx_jcsh_jc (jc_section_no, transitioned_at),
  CONSTRAINT fk_jcsh_jc FOREIGN KEY (jc_section_no) REFERENCES cmms_jobcard_mst(JM_SectionJobNo),
  CONSTRAINT fk_jcsh_actor FOREIGN KEY (transitioned_by) REFERENCES cmms_emp_mst(EMM_ID)
);
```

---

## 8. Audit-action vocabulary

| Action code | When | Entity |
|-------------|------|--------|
| `JR_EDIT_DRAFT` | JR PATCH body merged into DRAFT row | `job_request` |
| `JR_CANCEL` | JR DRAFT → cancelled | `job_request` |
| `JC_START_WORK` | ASSIGNED → IN_PROGRESS | `job_card` |
| `JC_SAVE` (skipped) | Save Draft / Save Changes — no audit row (D-9.2) | — |
| `JC_MARK_COMPLETE` | IN_PROGRESS → COMPLETED | `job_card` |
| `JC_VERIFY_CLOSE` | COMPLETED → VERIFIED_CLOSED | `job_card` |
| `JC_REOPEN` | COMPLETED/VERIFIED_CLOSED → IN_PROGRESS | `job_card` |
| `JC_DOC_UPLOAD` | Document upload | `job_card` |
| `JC_DOC_DELETE` | Document soft-delete | `job_card` |
| `JC_TASK_ADD` (skipped — too noisy) | — | — |

---

## 9. RBAC enforcement matrix (defence in depth)

| Layer | Gate |
|-------|------|
| **FE** | Action buttons hidden when `!hasPermission(perm)` OR `!isOwnOrLIC` OR `!isCorrectStatus` |
| **Route middleware** | `authenticate` + `authorize(perm)` |
| **Row-level scope** | `rowLevelScope('job_card')` sets `req.scope.ownerEmployeeId` for LAB_ENGINEER role |
| **Service** | Re-checks ownership (`jc.assigned_engineer_employee_id === actor.employeeId OR actor.role IN [LIC, SA]`) inside the transaction |
| **State machine** | Final guard — rejects (state, action) pair AND missing perm |

Off-assignment engineer reading a JC → 200 with read-only flag set (D-9.14 / spec §4); writing → 403.

---

## 10. Smoke matrix (A1 … A28)

Inherits from prompt §10. Locked. Smoke runner = `BE/db/discovery/smoke_phase9.js` (native fetch like Slice 2).

---

## 11. NPM dependencies to add

- **`multer`** (^1.4.5-lts.1) — runtime, for file uploads.
- **`uuid`** (^9.0.0) — runtime, for storage_filename generation.
- **(no FE deps needed — react-hook-form + zod already in)**

---

*Authored 2026-05-19 for DS. Locked at start of Phase 9.*
