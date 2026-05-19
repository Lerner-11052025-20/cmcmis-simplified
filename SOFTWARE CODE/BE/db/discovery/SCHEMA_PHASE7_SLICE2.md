# SCHEMA_PHASE7_SLICE2.md — Conversion + Reject + Detail

**Phase 7 Slice 2** — Job Request Detail page, **/conversion** workflow (Approve + Assign + auto-create Job Card in one atomic transaction), and Reject with mandatory reason. Code-only delivery (no docx this slice).

> **Authority chain.** `FINAL-DESC-CMCMIS v1.0` > `FINAL_DB_DESIGN v2.0` >
> `SCHEMA_PHASE6.md` > **this file**. Where this file disagrees with a higher document, the higher document wins.
> **Rule.** `ADD-only` migrations. Never `DROP`, never `RENAME`, never widen-to-`NOT NULL` on a populated legacy column.

---

## 0. Step-0 Introspection — Ground Truth (run 2026-05-19 09:08 UTC)

| Fact | Value | Implication |
|------|------|-------------|
| `cmms_jobrequest_mst` row count | **21,491** | Legacy data dominates — every new column must be `NULL`able. |
| `cmms_jobcard_mst` row count | **19,432** | Same constraint applies; no destructive backfills. |
| `JR_MVP_STATUS` enum values | `DRAFT, SUBMITTED, ASSIGNED, IN_PROGRESS, COMPLETED, VERIFIED_CLOSED, REJECTED, REOPENED` | **`APPROVED` is NOT in the enum** → kept as a transient logical state in `status_history` only (D-7.2.6). |
| `JR_APPROVED_BY/ON`, `JR_REJECTED_BY/ON`, `JR_REJECTION_REASON` | **Already present** (Phase 3 ALTER) | Zero ALTERs on `cmms_jobrequest_mst` this slice. |
| `JR_ASSIGNED_ENGINEER varchar(7)` | Already present | Reused as-is. |
| `JR_SECTIONJOB_NO varchar(9)` → FK to `cmms_jobcard_mst.JM_SectionJobNo` | Already present | Acts as `linked_job_card_id`. No new column needed. |
| `cmms_jobcard_mst.JM_MVP_STATUS` enum | `ASSIGNED, IN_PROGRESS, COMPLETED, VERIFIED_CLOSED, REOPENED` (default `ASSIGNED`) | Perfect for our INSERT — new row defaults to `ASSIGNED`. |
| `cmms_jobcard_mst.JM_SectionJobNo` | **varchar(9), PK**, samples like `"62026043"` | Sequence generator must fit `varchar(9)`. See **D-7.2.5**. |
| `job_request_status_history` shape | `to_status varchar(30)` (NOT enum) | Can record `APPROVED` even though JR enum cannot. |
| `audit_log` shape | `action varchar(60)`, `notes varchar(500)` | Two-row write per Convert (JR + JC) fits cleanly. |
| Permissions already granted to LIC + SA | `job_request:approve`, `job_request:reject`, `job_request:assign-engineer` | **No new permission seeding required.** |
| LAB_ENGINEER users in DB | **1** (`TE00225 · RAVINDRA K VASAVE`) | DS may need to seed more via Admin module before smoke A5 is meaningful with multiple options. Single engineer is sufficient for happy-path A5. |
| Existing JR indexes | `idx_jr_status`, `idx_jr_jobtype_created`, `idx_jr_priority_status_created`, `idx_jr_list_default`, `idx_jr_owner_created`, `idx_jr_assigned_eng`, `idx_jr_division_created` | Conversion tab counters (`WHERE status=SUBMITTED AND job_type=?`) covered by `idx_jr_jobtype_created` + status filter. Sufficient. |
| Existing JC indexes | `idx_jc_status`, `idx_jc_list_default`, `idx_jc_due_date`, `idx_jc_status_verified`, `idx_jc_status_ended` | **Missing**: `(assigned_engineer, status)` for the workload-count subquery. Will add `idx_jc_engineer_status`. |

**Full raw output:** `db/discovery/introspect_phase7_slice2_2026-05-19-09-08.out`

---

## 1. Decisions Register (P7-S2-D1 … P7-S2-D12 · all LOCKED)

| ID | Topic | Decision | Why |
|----|-------|----------|-----|
| **D-7.2.1** | Convert atomicity | **ONE button → ONE transaction → TWO logical transitions (approve + assign) + ONE JC INSERT**. Failure of any step rolls back all. | UX: LIC clicks once. Audit: clean "approved+assigned at T". Recovery: never see an APPROVED-orphan with no JC. |
| **D-7.2.2** | Reject flow | Separate terminal transition: `SUBMITTED → REJECTED` with mandatory reason (10..1000 chars). Stores `JR_REJECTED_BY/ON/REASON`. Touches **no** JC. REJECTED is **terminal** for Slice 2 (no reopen). | Reject is operationally distinct from approve; keeping it separate avoids accidental "reject created a JC" bugs and keeps the audit trail simple. |
| **D-7.2.3** | APPROVED is transient | `JR_MVP_STATUS` ENUM does **not** contain `APPROVED`. The state machine still recognises it as a logical step (perm-gated by `job_request:approve`). It appears only in `job_request_status_history.to_status` (varchar — accepts the string). On disk, JR jumps `SUBMITTED → ASSIGNED`. | Avoids `ALTER … MODIFY` on a populated enum (violates ADD-only doctrine). Audit trail is still gap-free because history captures both rows. |
| **D-7.2.4** | Two history rows per Convert | `appendStatusHistory(SUBMITTED → APPROVED, …)` then `appendStatusHistory(APPROVED → ASSIGNED, …)` — same transaction, same actor, same instant. | Per §9.2 lifecycle diagram. Lets the Detail-page Timeline render the full path. |
| **D-7.2.5** | JC `JM_SectionJobNo` generator | New MVP format: `"J" + zeroPad(JM_JobCardNO, 8) = "J00024214"` (9 chars, fits varchar(9)). Generated under `SELECT MAX(JM_JobCardNO) + 1 FOR UPDATE` inside the convert txn. Mirrors `jobRequests.repo.nextJrNo()`. Legacy `"62026043"` format remains valid for legacy rows; the PK has no format constraint. | Single deterministic generator. No collision with legacy values (legacy never starts with `J`). Headroom to 99 999 999 cards. |
| **D-7.2.6** | Convert ⇒ DB state | Final `JR_MVP_STATUS` = `ASSIGNED`. `JR_APPROVED_BY` + `JR_APPROVED_ON` + `JR_ASSIGNED_ENGINEER` + `JR_SECTIONJOB_NO` all set in the same UPDATE. | Single UPDATE keeps the row atomically consistent. |
| **D-7.2.7** | JC ALTERs | ADD 5 NULLable columns to `cmms_jobcard_mst`: `JM_ASSIGNED_ENGINEER varchar(7)`, `JM_WORKFLOW_TYPE varchar(50)`, `JM_REQUIRED_RESOURCES varchar(2000)`, `JM_SPECIAL_INSTRUCTIONS varchar(2000)`, `JM_PARENT_JR_NO int(11)`. No NOT NULL on legacy rows. | Legacy rows have no engineer/workflow concept; new MVP rows will populate them explicitly. |
| **D-7.2.8** | Engineer dropdown source | `GET /api/v1/lookups/engineers` returns `[{ id (user_id), employee_id, full_name, active_card_count }]` joined from `users` × `user_roles` × `roles` × `cmms_emp_mst` × `cmms_jobcard_mst`. **Scope = ALL active LAB_ENGINEERs system-wide** (not filtered by JR division). | Q-1 (a). LIC needs flexibility to load-balance across divisions. Workload count makes the choice informed. |
| **D-7.2.9** | Engineer identity in JC | Store **`employee_id` (varchar(7))** in `JM_ASSIGNED_ENGINEER`, not the numeric `user_id`. Mirrors `JR_ASSIGNED_ENGINEER`, `audit_log.actor_employee_id`, and the FK target shape in `job_request_status_history.transitioned_by`. | Consistency across the schema. FE never sees `user_id` anywhere else. |
| **D-7.2.10** | Workflow Type enum | 6 string values, scoped by `JR.JR_JOB_TYPE`: <br>• `CALIBRATION` ⇒ `CALIBRATION_STANDARD`, `CALIBRATION_PRECISION` <br>• `REPAIR` ⇒ `INSPECTION_ROUTINE`, `INSPECTION_DETAILED` <br>• `REGISTRATION` ⇒ `MASTER_DATA_FIELD_UPDATE`, `MASTER_DATA_REVISION` <br> Stored as a string in `JM_WORKFLOW_TYPE`. **No CHECK constraint** (legacy MySQL doesn't enforce them prior to 8.0.16 anyway); enforced in `validators.js` + state machine. | Q-4 default. Simple, extensible. Bucket mapping prevents "REPAIR with CALIBRATION_PRECISION" nonsense. |
| **D-7.2.11** | Convert post-success UX | Modal closes, FE re-fetches the `/conversion` tab list, badges update, success toast: `"Job Card J00024214 created and assigned to <Engineer Name>"`. No navigation. | Q-2 (a). LIC is in batch-processing mindset. |
| **D-7.2.12** | "Save as Draft" on modal | Visible BUT disabled in Slice 2. Tooltip: `"Saving partial conversions ships in Slice 3"`. The button telegraphs the feature without committing to a half-baked implementation now. | Doctrine: no half-finished implementations. |

---

## 2. JR — Canonical ↔ Real-Column Map (this slice's read+write surface)

> Slice 2 reads detail + writes status/reason/linkage. Only **new** columns vs Phase 6 are highlighted.

| Canonical name | Type (canonical) | Real column | Notes |
|---|---|---|---|
| `id` | INT | `JR_JOBREQUESTNO` | PK, also exposed as `id`. |
| `status` | ENUM | `JR_MVP_STATUS` | Settable via `transitionStatus()`. |
| `approved_by_employee_id` | VARCHAR(7) | `JR_APPROVED_BY` | Already exists. |
| `approved_at` | DATETIME(6) | `JR_APPROVED_ON` | Already exists. |
| `rejected_by_employee_id` | VARCHAR(7) | `JR_REJECTED_BY` | Already exists. |
| `rejected_at` | DATETIME(6) | `JR_REJECTED_ON` | Already exists. |
| `rejection_reason` | VARCHAR(500) | `JR_REJECTION_REASON` | Already exists. Width caps zod schema at 500 chars (downsized from prompt's 1000 to match DB). |
| `assigned_engineer_employee_id` | VARCHAR(7) | `JR_ASSIGNED_ENGINEER` | Already exists. |
| `linked_job_card_section_no` | VARCHAR(9) | `JR_SECTIONJOB_NO` | Already exists + FK to `cmms_jobcard_mst.JM_SectionJobNo`. Acts as `linked_job_card_id`. |
| `priority` | ENUM `LOW/MEDIUM/HIGH` | `JR_PRIORITY` (`LOW/NORMAL/HIGH/URGENT`) | Alias per **P6-D1** (existing). |
| `submitted_at` | DATETIME(6) | `JR_MVP_STATUS_AT` (when status=SUBMITTED) | For Detail-page timeline only. |
| `created_at` | DATETIME(6) | `JR_CREATED_AT` | Phase 6 ADD. |
| `updated_at` | DATETIME(6) | `JR_UPDATED_AT` | Phase 6 ADD, ON UPDATE auto-touch. |

**Read JOINs used by `findByIdWithDetails`:**
- `cmms_section_mst` → division_code, division_name
- `cmms_emp_mst` (`EMM_ID = JR_SUBMITTEDBYID`) → submitter snapshot fallback
- `cmms_emp_mst` (`EMM_ID = JR_APPROVED_BY`) → `approved_by_name`
- `cmms_emp_mst` (`EMM_ID = JR_REJECTED_BY`) → `rejected_by_name`
- `cmms_emp_mst` (`EMM_ID = JR_ASSIGNED_ENGINEER`) → `assigned_engineer_name`
- `job_request_accessories` (1..N) → accessories list
- `cmms_jobcard_mst` (`JM_SectionJobNo = JR_SECTIONJOB_NO`) → linked JC summary

---

## 3. JC — Canonical ↔ Real-Column Map (new write surface this slice)

| Canonical name | Type (canonical) | Real column | NULL? | Default | Set by |
|---|---|---|---|---|---|
| `id` | VARCHAR(9) | `JM_SectionJobNo` | NOT NULL | — | `repo.nextSectionJobNo()` |
| `card_no` | INT | `JM_JobCardNO` | NOT NULL | — | `MAX(JM_JobCardNO)+1` (locked) |
| `equipment_type` | VARCHAR(15) | `JM_EQM_TYPE` | NOT NULL | — | Copied from JR |
| `equipment_id` | INT | `JM_EQM_ID` | NOT NULL | — | Copied from JR |
| `status` | ENUM | `JM_MVP_STATUS` | NOT NULL | `ASSIGNED` | Server-set on INSERT |
| `equipment_received_date` | DATETIME(6) | `JM_JCRecdDate` | NOT NULL | — | From convert body |
| `instrument_received_date` | DATETIME(6) | `JM_InstRecdDate` | NOT NULL | — | Same as `JM_JCRecdDate` (one device) |
| `planned_start_date` | DATETIME(6) | `JM_PlannedStartDate` | NOT NULL | — | From convert body |
| `target_end_date` | DATETIME(6) | `JM_PlannedComletedDate` | NOT NULL | — | From convert body |
| `actual_start_date` | DATETIME(6) | `JM_JobStartDate` | NULL | — | Set by Phase 9 (start-work). |
| `actual_end_date` | DATETIME(6) | `JM_JobEndDate` | NULL | — | Set by Phase 9. |
| `job_status_legacy` | CHAR(2) | `JM_JobStatus` | NOT NULL | — | INSERTed as `'A'` (legacy "Accepted" code; reproduces value seen in 19 432 legacy rows). |
| `warranty_repairs` | TINYINT | `JM_WarrantyRepairs` | NOT NULL | — | INSERTed as `0`. |
| `contract_repairs` | TINYINT | `JM_ContractRepairs` | NOT NULL | — | INSERTed as `0`. |
| `job_type_legacy` | TINYINT(3) | `JM_JOBTYPE` | NOT NULL | 0 | INSERTed as `0` (legacy default). |
| `created_by_employee_id` | VARCHAR(7) | `JM_CREATED_BY` | NOT NULL | — | `actor.employeeId` |
| `created_at` | DATETIME(6) | `JM_CREATED_ON` | NOT NULL | — | `NOW(6)` |
| `updated_by` | VARCHAR(50) | `JM_UPDATED_BY` | NOT NULL | — | `actor.employeeId` |
| `updated_at` | DATETIME(6) | `JM_UPDATED_ON` | NOT NULL | — | `NOW(6)` |
| `complaint` | VARCHAR(400) | `JM_COMPLAINTANDSYMPTOMS` | NULL | — | Copied from JR.JR_COMPLAINTANDSYMPTOMS |
| **`assigned_engineer_employee_id`** | VARCHAR(7) | **NEW** `JM_ASSIGNED_ENGINEER` | NULL | — | From convert body |
| **`workflow_type`** | VARCHAR(50) | **NEW** `JM_WORKFLOW_TYPE` | NULL | — | From convert body |
| **`required_resources`** | VARCHAR(2000) | **NEW** `JM_REQUIRED_RESOURCES` | NULL | — | From convert body (optional) |
| **`special_instructions`** | VARCHAR(2000) | **NEW** `JM_SPECIAL_INSTRUCTIONS` | NULL | — | From convert body (optional) |
| **`parent_jr_no`** | INT(11) | **NEW** `JM_PARENT_JR_NO` | NULL | — | `jr.JR_JOBREQUESTNO` (the JR being converted) |

> Legacy columns named `NA as per new desing` (`JM_DESC`, `JM_AttendedBy`, `JM_PLANID`, `JM_DUEIN`) are left untouched — NULL on new rows.

---

## 4. Migrations

| File | Type | Idempotent? | Notes |
|------|------|-------------|-------|
| `200__phase7s2_jc_columns.sql` | ALTER | YES (INFORMATION_SCHEMA-guarded) | 5 ADD COLUMN on `cmms_jobcard_mst`. |
| `201__phase7s2_indexes.sql` | INDEX | YES (DROP INDEX IF EXISTS then CREATE) | `idx_jc_engineer_status` on `(JM_ASSIGNED_ENGINEER, JM_MVP_STATUS)` for workload subquery. |

> **Phase 7 Slice 1 used migration codes 113..116** (admin module). Slice 2 jumps to 200 to leave clean numeric room for any S1 hotfix patches.

---

## 5. State Machine — patched lifecycle

```
DRAFT ─[submit]──> SUBMITTED ─[approve]──> APPROVED ─[assign]──> ASSIGNED
                       │                                            │
                       └─[reject]──> REJECTED                       │
                                                                    └──> (Phase 9: IN_PROGRESS → …)
```

| (from, action) | to | required permission | actor scope | extra invariants |
|----------------|----|---------------------|-------------|------------------|
| `DRAFT, submit` | `SUBMITTED` | `job_request:create` | owner only | (existing — unchanged) |
| `SUBMITTED, approve` | **`APPROVED`** (logical) | `job_request:approve` | any caller w/ perm | — |
| `APPROVED, assign` | `ASSIGNED` | `job_request:assign-engineer` | any caller w/ perm | engineer must be active LAB_ENGINEER; workflow_type must match JR.job_type bucket |
| `SUBMITTED, reject` | `REJECTED` | `job_request:reject` | any caller w/ perm | reason length ∈ [10, 500] |

**Convert** = run `approve` then `assign` inside the same `conn.beginTransaction()`. Each one passes through `transition()` so a missing permission throws **before** any UPDATE happens.

---

## 6. Convert — atomic transaction order

```
BEGIN TRANSACTION
  ┌─ SELECT … FOR UPDATE on cmms_jobrequest_mst WHERE JR_JOBREQUESTNO = ?
  │     ▸ verifies JR exists & status=SUBMITTED (else 409 ILLEGAL_TRANSITION)
  │
  ├─ transition('SUBMITTED', 'approve', actor)               // permission check
  ├─ INSERT job_request_status_history (SUBMITTED → APPROVED, actor)
  │
  ├─ transition('APPROVED', 'assign', actor)                 // permission check
  ├─ SELECT COALESCE(MAX(JM_JobCardNO),0)+1 FOR UPDATE       // JC sequence
  ├─ INSERT cmms_jobcard_mst (status=ASSIGNED, all snapshots, JM_PARENT_JR_NO=jr.id)
  ├─ UPDATE cmms_jobrequest_mst
  │      SET JR_MVP_STATUS='ASSIGNED', JR_MVP_STATUS_AT=NOW(6),
  │          JR_UPDATED_AT=NOW(6),
  │          JR_APPROVED_BY=?, JR_APPROVED_ON=NOW(6),
  │          JR_ASSIGNED_ENGINEER=?,
  │          JR_SECTIONJOB_NO=?
  │    WHERE JR_JOBREQUESTNO=?
  ├─ INSERT job_request_status_history (APPROVED → ASSIGNED, actor)
  │
  ├─ INSERT audit_log (action=JR_CONVERT, entity=job_request, id=jr_no)
  ├─ INSERT audit_log (action=JC_CREATE,  entity=job_card,    id=section_job_no)
  │
COMMIT
   ▸ kpiCache.invalidate(KEYS.ORG)
   ▸ kpiCache.invalidate(KEYS.personal(jr.submitter))
```

**Rollback guarantee (A12):** any throw between `BEGIN` and `COMMIT` triggers `conn.rollback()` in the service `try/catch`. Verified by injecting `throw new Error()` after the JC INSERT and confirming JR status, history rows, and audit rows are all gone.

---

## 7. Reject — atomic transaction order

```
BEGIN TRANSACTION
  ├─ SELECT … FOR UPDATE on cmms_jobrequest_mst WHERE JR_JOBREQUESTNO = ?
  │     ▸ verifies status=SUBMITTED
  ├─ transition('SUBMITTED', 'reject', actor)
  ├─ UPDATE cmms_jobrequest_mst
  │      SET JR_MVP_STATUS='REJECTED', JR_MVP_STATUS_AT=NOW(6), JR_UPDATED_AT=NOW(6),
  │          JR_REJECTED_BY=?, JR_REJECTED_ON=NOW(6), JR_REJECTION_REASON=?
  │    WHERE JR_JOBREQUESTNO=?
  ├─ INSERT job_request_status_history (SUBMITTED → REJECTED, actor, reason)
  ├─ INSERT audit_log (action=JR_REJECT, entity=job_request, id=jr_no, notes={reason…})
COMMIT
   ▸ kpiCache.invalidate(KEYS.ORG)
   ▸ kpiCache.invalidate(KEYS.personal(jr.submitter))
```

---

## 8. RBAC scoping on `GET /api/v1/job-requests/:id`

Reuses Phase 6's `rowLevelScope('job_request')` factory exactly as the list endpoint does. The detail repo function honours `req.scope`:

```
if (!scope.canReadAll && jr.submitted_by_employee_id !== scope.ownerEmployeeId) {
  throw errors.forbidden('Cannot view another user\'s job request');
}
```

| Role | `read-own`? | `read-all`? | Detail visibility |
|------|-------------|-------------|-------------------|
| Normal User | ✓ | ✗ | Only own rows; foreign id → 403 (not 404 — auditability) |
| View-Only | ✓ | ✓ | All |
| Lab Engineer | ✓ | ✓ | All |
| Lab In-Charge | ✓ | ✓ | All |
| Super Admin | ✓ | ✓ | All |

---

## 9. New endpoints (this slice)

| Method | Path | Required permission(s) | Notes |
|--------|------|------------------------|-------|
| GET | `/api/v1/job-requests/:id` | `read-own` OR `read-all` (+ row-level scope) | Returns full JR with accessories + history + linked JC summary. |
| GET | `/api/v1/job-requests/:id/history` | same | Returns ordered `job_request_status_history` rows. |
| POST | `/api/v1/job-requests/:id/convert` | `job_request:approve` AND `job_request:assign-engineer` (authorize both) | Body: `convertSchema`. Returns `{ job_request, job_card }`. |
| POST | `/api/v1/job-requests/:id/reject` | `job_request:reject` | Body: `{ reason }`. Returns updated JR summary. |
| GET | `/api/v1/lookups/engineers` | `job_request:assign-engineer` | Returns `[{ id, employee_id, full_name, division_id, division_code, active_card_count }]` sorted by `active_card_count` ASC then name. |

---

## 10. Audit-action vocabulary

| Action code | When | Entity |
|-------------|------|--------|
| `JR_CONVERT` | Convert succeeds | `job_request` |
| `JC_CREATE`  | Convert creates the JC | `job_card` |
| `JR_REJECT`  | Reject succeeds | `job_request` |

> Notes payload is the JSON-stringified detail object truncated to 500 chars by `buildAuditNotes()`. For `JR_CONVERT`: `{ engineer, workflow_type, jc_section_no, target_end_date }`. For `JR_REJECT`: `{ reason }` (reason itself capped at 200 chars inside the JSON to leave room).

---

## 11. Smoke matrix (A1 … A14)

| # | Test | Expected | Verified |
|---|------|----------|----------|
| A1 | GET detail as Normal · own JR | 200 + body | ▢ |
| A2 | GET detail as Normal · others' JR | 403 FORBIDDEN | ▢ |
| A3 | GET detail as LIC · any JR | 200 + body | ▢ |
| A4 | POST convert as Normal | 403 FORBIDDEN | ▢ |
| A5 | POST convert · valid body · LIC | jr=ASSIGNED + jc=ASSIGNED + 2 history + 2 audit | ▢ |
| A6 | POST convert · jr.status ≠ SUBMITTED | 409 ILLEGAL_TRANSITION | ▢ |
| A7 | POST convert · inactive/non-engineer | 400 BAD_REQUEST | ▢ |
| A8 | POST convert · workflow_type mismatch | 400 BAD_REQUEST | ▢ |
| A9 | POST convert · planned_start < received | 400 BAD_REQUEST | ▢ |
| A10 | POST reject · reason length < 10 | 422 VALIDATION_ERROR | ▢ |
| A11 | POST reject · valid · LIC | jr=REJECTED + 1 history + 1 audit + NO new JC row | ▢ |
| A12 | Forced rollback inside convert txn | JR unchanged, no JC, no history, no audit | ▢ |
| A13 | /conversion tab badges accurate within 30 s of mutation | counts match BE COUNT(*) | ▢ |
| A14 | Dashboard "Pending Jobs" KPI decreases by 1 within 30 s of convert | KPI delta = −1 | ▢ |

---

*Authored 2026-05-19 for DS. Locked at start of Phase 7 Slice 2.*
