# PHASE 3 — DAY 1 SCHEMA DESIGN & RECONCILIATION

**Project:** CMCMIS_SIMPLIFIED
**Document:** Phase 3 Day 1 Output — Schema Audit + Target Design
**Date:** May 16, 2026
**Prepared by:** Claude (AI engineering pair) for Deep Sorathiya (DS)
**Inputs received:** O1 (`cmcmis_schema_only.sql` + `cmcmis_table_summary.csv`), O2 (deferred to my analysis), O3 (SA79900, AC77777)
**Authority:** Subordinate to `FINAL-DESC-CMCMIS v1.0`. Any conflict → FINAL-DESC wins.

---

## TABLE OF CONTENTS

1. Executive Summary
2. Critical Findings (Read First)
3. Master Inventory — All 64 Existing Tables Classified
4. Cluster Mapping — Old Tables → 13 Target Clusters
5. Reconciliation Matrix — keep / modify / drop / add
6. CLUSTER 1 — Identity & Access (AUTH) — Full Deep Dive
7. CLUSTER 3 — Equipment Master — Reconciliation + DDL
8. CLUSTER 4 — Job Lifecycle — Reconciliation + DDL
9. CLUSTER 10 — Audit & Logs — Fresh Design
10. CLUSTER 12 — Lookups — Reconciliation
11. P2 Clusters — Sketch Only
12. Open Questions for DS
13. Phase 3 Day 2 Plan

---

## 1. EXECUTIVE SUMMARY

| Metric                                               | Count                                           |
| ---------------------------------------------------- | ----------------------------------------------- |
| Existing tables in dump                              | 64                                              |
| Tables with FK constraints                           | 22                                              |
| Tables with zero rows (likely dead)                  | 5                                               |
| Backup / orphan tables (cf001-cf004, _bkp, _jun2016) | 7                                               |
| Tables referenced by FK but NOT in dump              | 1 (`cmms_cont_mst` — vendor master)          |
| Total existing rows across all tables                | ~390,000+                                       |
| Largest table                                        | `cmms_jobcard_cal_observations` (77,171 rows) |
| MVP-critical existing tables to KEEP                 | ~22                                             |
| MVP-critical existing tables to MODIFY               | ~8                                              |
| Existing tables to ISOLATE (orphan/dead)             | ~10                                             |
| NEW tables to ADD for MVP                            | ~15                                             |
| Target total table count after Phase 3               | ~70                                             |

**Bottom line:** The existing database is a real, heavily-used CMMS with ~390K rows of operational data. The **Job Lifecycle** cluster is mature and rich (we will reuse aggressively). The **Identity & RBAC** cluster has a fundamentally wrong shape for our 3-layer RBAC model — we will **NOT modify the existing auth tables**, we will **build a new clean auth stack alongside** and use `cmms_emp_mst` only as the employee directory (lookup source for valid `employee_id`s).

---

## 2. CRITICAL FINDINGS (READ FIRST)

### 🔴 FINDING #1 — Plaintext passwords in existing auth

`cmms_userrole_mst.USER_PASSWORD VARCHAR(10)` — passwords are stored in plaintext, max 10 chars. **565 rows.**

**Impact:** Cannot reuse this table. Violates BR-AUTH (bcrypt required), NFR Security (bcrypt ≥10 rounds). 565 user records will need migration — see Cluster 1 plan below.

### 🔴 FINDING #2 — `cmms_cont_mst` is referenced but missing from dump

4 tables reference `cmms_cont_mst (CMM_CONT_ID)` as FK parent:

- `cmms_amc_mst.AMC_VENDERID`
- `cmms_checklist_mst.CHKL_MAKE`
- `cmms_eqip_mst.EQM_MFRID` ← **CRITICAL** (used by 5,704 equipment records)
- `cmms_inv_mst.INV_MCODE`

**Impact:** `cmms_cont_mst` is the vendor/manufacturer master. Without its DDL we can't see its columns. **DS must export this table separately.** (See Open Question #1.)

### 🔴 FINDING #3 — Existing RBAC model is incompatible

`cmms_accessright_mst (3221 rows)` uses an **operation-flag matrix**: `(module_id, role_id) → ADD/MODIFY/VIEW/DELETE/PRINT booleans`.

Our locked model (BR-RBAC-03) uses **resource:action permissions**: `(role_id, permission_id)` where permission is `'equipment:create'`, `'job_card:verify-close'`, etc.

**These models do NOT map 1:1.** We must build new `permissions`, `role_permissions`, `user_roles` tables. The old `cmms_accessright_mst` and `cmms_module_mst` are isolated (kept for historical reference, but the runtime never reads from them).

### 🟡 FINDING #4 — 23 existing roles vs locked 5 roles

`cmms_role_mst` has 23 rows. Our locked decision (C1) is **5 roles only**. We need a mapping table from old role_id → new role_id for the 565 existing user assignments (data migration concern, not schema concern).

### 🟡 FINDING #5 — Composite PK on equipment is unusual

`cmms_eqip_mst` uses composite PK `(EQM_TYPE, EQM_ID)` — 5,704 rows. Type is `'TME'` or `'FPE'` (likely). Most joins use both columns.

**Decision:** KEEP composite PK to avoid breaking 5,704 records + 13 dependent tables. New tables we add will use single-column surrogate keys.

### 🟡 FINDING #6 — Orphan backup tables

7 tables look like backups or test artifacts with no FKs and no documentation:

| Table                              | Rows  | Likely meaning                                             |
| ---------------------------------- | ----- | ---------------------------------------------------------- |
| `cf001`                          | 6     | Backup of `cmms_checklist_hist` columns                  |
| `cf002`                          | 553   | Backup of `cmms_checklist_tasks_hist` columns            |
| `cf003`                          | 570   | Backup of `cmms_checklist_mst` columns                   |
| `cf004`                          | 3,449 | Backup of `cmms_checklist_tasks` columns                 |
| `chklistvendor`                  | 238   | Loose junction without FK — chklistno × mfrid × modelno |
| `cmms_parameter_master_bkp`      | 4     | Backup of `cmms_parameter_master`                        |
| `cmms_parameter_master_jun2016`  | 233   | Snapshot from June 2016                                    |
| `cmms_parameter_master_incharge` | 9     | Old/orphan variant                                         |

**Decision:** ISOLATE (rename with `_legacy_` prefix in Phase 2). Not in MVP code path. Not dropped (Constraint #2).

### 🟢 FINDING #7 — Job Lifecycle is mature & reusable

22 jobcard/jobrequest tables with ~280,000+ rows of real history. Schema is verbose (varchar everywhere, no proper status enum), but the relationships are sound. **Strategy: ALTER existing tables to add what we need, do NOT recreate.**

### 🟡 FINDING #8 — Super Admin IDs format mismatch

DS provided `SA79900` and `AC77777` — both 7 chars, fits `cmms_emp_mst.EMM_ID VARCHAR(7)` ✓.

**Concern:** Are these existing employee records or new entries to be created? Of the 57 employees in `cmms_emp_mst`, we need to verify these two exist. See Open Question #3.

---

## 3. MASTER INVENTORY — All 64 Existing Tables Classified

Legend: ✅ = KEEP as-is · 🔧 = KEEP + MODIFY (ALTER TABLE) · 🗄️ = ISOLATE (legacy, not in MVP code) · 🌱 = NEW (will be added) · 🔴 = SECURITY ISSUE

| #  | Table                                  | Rows   | Cluster                       | Bucket | Action                                                                     |
| -- | -------------------------------------- | ------ | ----------------------------- | ------ | -------------------------------------------------------------------------- |
| 1  | `cf001`                              | 6      | Orphan                        | 🗄️   | Rename `_legacy_cf001`, exclude from MVP                                 |
| 2  | `cf002`                              | 553    | Orphan                        | 🗄️   | Rename `_legacy_cf002`, exclude from MVP                                 |
| 3  | `cf003`                              | 570    | Orphan                        | 🗄️   | Rename `_legacy_cf003`, exclude from MVP                                 |
| 4  | `cf004`                              | 3,449  | Orphan                        | 🗄️   | Rename `_legacy_cf004`, exclude from MVP                                 |
| 5  | `chklistvendor`                      | 238    | Orphan                        | 🗄️   | Rename `_legacy_chklistvendor`                                           |
| 6  | `cmms_accessright_mst`               | 3,221  | 1 Identity                    | 🗄️   | OLD RBAC, incompatible model — new tables replace                         |
| 7  | `cmms_amc_mst`                       | 0      | 6 Maintenance / 8 Procurement | 🗄️   | Empty, P2 cluster, sketch only                                             |
| 8  | `cmms_cal_jobcard_feedback_spec`     | 0      | 4 Job Lifecycle               | 🗄️   | Empty + has BLOB — dead                                                   |
| 9  | `cmms_checklist_hist`                | 811    | 4 Job Lifecycle (sub)         | ✅     | Keep for historical reference                                              |
| 10 | `cmms_checklist_mst`                 | 928    | 4 Job Lifecycle (sub)         | 🔧     | Keep; add audit cols                                                       |
| 11 | `cmms_checklist_tasks`               | 7,536  | 4 Job Lifecycle (sub)         | ✅     | Junction, keep                                                             |
| 12 | `cmms_checklist_tasks_hist`          | 8,450  | 4 Job Lifecycle (sub)         | ✅     | Historical, keep                                                           |
| 13 | `cmms_designation_mst`               | 40     | 2 Organisation                | ✅     | Designations master, keep                                                  |
| 14 | `cmms_device_spares_mst`             | 67     | 6/8 Maint/Procurement         | 🗄️   | P2 cluster — sketch only                                                  |
| 15 | `cmms_division_hist`                 | 3,676  | 3 Equipment                   | ✅     | Equipment division change history                                          |
| 16 | `cmms_documentno_mst`                | 151    | 12 Lookups                    | ✅     | Document number sequences                                                  |
| 17 | **`cmms_emp_mst`**             | 57     | 1 Identity                    | 🔧     | **Employee directory — KEEP, light ALTER**                          |
| 18 | `cmms_eqip_detail_spec`              | 3      | 3 Equipment                   | 🗄️   | Has BLOB images, almost empty — P2 (file storage out of MVP)              |
| 19 | **`cmms_eqip_mst`**            | 5,704  | 3 Equipment                   | 🔧     | **Equipment master — KEEP, add new columns**                        |
| 20 | `cmms_eqip_mst_hist`                 | 519    | 3 Equipment                   | ✅     | History, keep                                                              |
| 21 | `cmms_eqipinst_identification`       | 2,286  | 3 Equipment                   | ✅     | Sub-instrument identification, keep                                        |
| 22 | `cmms_fault_mst`                     | 30     | 4 Job Lifecycle / 12 Lookups  | ✅     | Fault category lookup                                                      |
| 23 | `cmms_ins_accuracy_info`             | 1,501  | 3 Equipment / 5 Calibration   | ✅     | Accuracy/range/unit per instrument                                         |
| 24 | `cmms_inv_mst`                       | 42     | 8 Procurement                 | 🗄️   | P2 cluster — inventory parts                                              |
| 25 | `cmms_jobcard_attendedby_dtl`        | 27,890 | 4 Job Lifecycle               | ✅     | Engineer assignment (junction)                                             |
| 26 | `cmms_jobcard_awaitinginfo`          | 7,261  | 4 Job Lifecycle               | ✅     | Awaiting/idle data per jobcard                                             |
| 27 | `cmms_jobcard_cal_adjustments_dtl`   | 1,831  | 4 Job Lifecycle               | ✅     | Calibration adjustments                                                    |
| 28 | `cmms_jobcard_cal_dtl`               | 9,065  | 4 Job Lifecycle               | ✅     | Calibration details                                                        |
| 29 | `cmms_jobcard_cal_observations`      | 77,171 | 4 Job Lifecycle               | ✅     | THE observation log (largest table)                                        |
| 30 | `cmms_jobcard_contract_warranty_dtl` | 17,225 | 4 / 8                         | ✅     | Keep but mostly P2                                                         |
| 31 | `cmms_jobcard_eq_used`               | 38,316 | 4 Job Lifecycle               | ✅     | Equipment used during job                                                  |
| 32 | `cmms_jobcard_faulty_category`       | 8,605  | 4 Job Lifecycle               | ✅     | Fault tag (junction)                                                       |
| 33 | `cmms_jobcard_faulty_section`        | 8,131  | 4 Job Lifecycle               | ✅     | Fault tag (junction)                                                       |
| 34 | `cmms_jobcard_insp_maint_dtl`        | 0      | 4 Job Lifecycle               | 🗄️   | Empty — dead                                                              |
| 35 | `cmms_jobcard_inspection_info`       | 2,214  | 4 Job Lifecycle               | ✅     | Registration inspection info                                               |
| 36 | **`cmms_jobcard_mst`**         | 19,432 | 4 Job Lifecycle               | 🔧     | **Core job card — KEEP, add cols**                                  |
| 37 | `cmms_jobcard_mst_history`           | 22,143 | 4 / 10 Audit                  | ✅     | History table — keep                                                      |
| 38 | `cmms_jobcard_repair_info`           | 8,118  | 4 Job Lifecycle               | ✅     | Repair sub-info                                                            |
| 39 | `cmms_jobcard_request_info`          | 19,432 | 4 Job Lifecycle               | ✅     | Request info on jobcard                                                    |
| 40 | `cmms_jobcard_request_item_dtl`      | 11,064 | 4 Job Lifecycle               | ✅     | Request items                                                              |
| 41 | `cmms_jobcard_request_project_dtl`   | 22,316 | 4 Job Lifecycle               | ✅     | Project link                                                               |
| 42 | `cmms_jobcard_spares_equip`          | 2,804  | 4 / 8                         | ✅     | Spares used during job                                                     |
| 43 | `cmms_jobcard_status_hist`           | 22,214 | 4 / 10 Audit                  | ✅     | THE status history — keep                                                 |
| 44 | `cmms_jobrequest_item_dtl`           | 7,786  | 4 Job Lifecycle               | ✅     | JR items                                                                   |
| 45 | **`cmms_jobrequest_mst`**      | 21,485 | 4 Job Lifecycle               | 🔧     | **Core job request — KEEP, add cols**                               |
| 46 | `cmms_jobrequest_project_dtl`        | 19,624 | 4 Job Lifecycle               | ✅     | JR-project link                                                            |
| 47 | `cmms_lineitem_mst`                  | 24     | 8 Procurement                 | ✅     | Budget line items — keep                                                  |
| 48 | `cmms_module_mst`                    | 163    | 1 Identity                    | 🗄️   | OLD menu hierarchy, replaced by permission-driven UI                       |
| 49 | `cmms_parameter_master`              | 337    | 12 Lookups                    | 🔧     | THE lookup table — keep, will modernize                                   |
| 50 | `cmms_parameter_master_bkp`          | 4      | Orphan                        | 🗄️   | Backup — isolate                                                          |
| 51 | `cmms_parameter_master_incharge`     | 9      | Orphan                        | 🗄️   | Old variant — isolate                                                     |
| 52 | `cmms_parameter_master_jun2016`      | 233    | Orphan                        | 🗄️   | Old snapshot — isolate                                                    |
| 53 | `cmms_po_mst`                        | 115    | 8 Procurement                 | ✅     | P2 cluster, keep                                                           |
| 54 | `cmms_product_mst`                   | 32     | 3 Equipment / 12 Lookups      | ✅     | Instrument type lookup                                                     |
| 55 | `cmms_proj_mst`                      | 182    | 2 Organisation                | ✅     | Project master                                                             |
| 56 | `cmms_pur_dtl`                       | 0      | 8 Procurement                 | 🗄️   | Empty — P2                                                                |
| 57 | `cmms_pur_mst`                       | 0      | 8 Procurement                 | 🗄️   | Empty — P2                                                                |
| 58 | **`cmms_role_mst`**            | 23     | 1 Identity                    | 🗄️   | 23 old roles vs locked 5 — new `roles` table replaces                   |
| 59 | `cmms_schedule_eqip_dtl`             | 316    | 7 Scheduling                  | ✅     | P2 — keep                                                                 |
| 60 | `cmms_schedule_mst`                  | 6      | 7 Scheduling                  | ✅     | P2 — keep                                                                 |
| 61 | **`cmms_section_mst`**         | 293    | 2 Organisation                | ✅     | Divisions/sections — keep                                                 |
| 62 | `cmms_section_user_mst`              | 294    | 1 / 2                         | 🗄️   | Old user-section-role mapping — replaced by new RBAC                      |
| 63 | `cmms_task_mst`                      | 1,489  | 4 Job Lifecycle               | ✅     | Task master — keep                                                        |
| 64 | **`cmms_userrole_mst`**        | 565    | 1 Identity                    | 🔴     | **Plaintext passwords — DO NOT REUSE. Migrate data to new tables.** |

### Bucket Totals

| Bucket                | Count | Note                                                              |
| --------------------- | ----- | ----------------------------------------------------------------- |
| ✅ KEEP as-is         | 30    | Use directly in MVP code                                          |
| 🔧 KEEP + MODIFY      | 6     | Need `ALTER TABLE` to add new columns                           |
| 🗄️ ISOLATE (legacy) | 28    | Rename or leave; not in MVP read/write path                       |
| 🔴 Quarantine         | 0     | (the userrole_mst is isolated and data migrated, not quarantined) |
| 🌱 NEW (to add)       | ~15   | See per-cluster sections below                                    |

---

## 4. CLUSTER MAPPING — Old Tables → 13 Target Clusters

### Cluster 1 — Identity & Access (target 8–10 tables)

**Existing tables in this cluster:** 6 (all going to ISOLATE)

- `cmms_emp_mst` — KEEP as employee directory (light ALTER)
- `cmms_role_mst` — ISOLATE
- `cmms_userrole_mst` — ISOLATE + migrate data
- `cmms_accessright_mst` — ISOLATE
- `cmms_module_mst` — ISOLATE
- `cmms_section_user_mst` — ISOLATE

**Target NEW tables (8):**

1. `users` 🌱
2. `roles` 🌱
3. `permissions` 🌱
4. `role_permissions` 🌱
5. `user_roles` 🌱
6. `refresh_tokens` 🌱
7. `login_audit` 🌱
8. `password_history` 🌱 *(optional, recommended for defence-grade)*

**Total Cluster 1: 1 KEEP + 1 ALTER on cmms_emp_mst + 8 NEW = 9 tables in active code path.**

---

### Cluster 2 — Organisation (target 4–5 tables)

**Existing:** ✅ `cmms_section_mst` (293), ✅ `cmms_proj_mst` (182), ✅ `cmms_designation_mst` (40)

**No NEW tables needed for MVP.** Sketch later: departments, locations.

---

### Cluster 3 — Equipment Master (target 8–10 tables)

**Existing (KEEP):** `cmms_eqip_mst` 🔧, `cmms_eqip_mst_hist` ✅, `cmms_eqipinst_identification` ✅, `cmms_ins_accuracy_info` ✅, `cmms_division_hist` ✅, `cmms_product_mst` ✅, `cmms_fault_mst` ✅

**ISOLATE:** `cmms_eqip_detail_spec` (BLOB, almost empty)

**NEW:**

1. `equipment_status_history` 🌱 (formal state-machine log for PENDING_VERIFICATION → ACTIVE → etc.) *(unless `cmms_division_hist` can be repurposed — see Open Q5)*

**Total: 7 existing + 1 new = 8 tables in active code path.**

---

### Cluster 4 — Job Lifecycle (target 6–8 tables, but actually 16+ existing)

**This is the largest cluster.** 22 existing job/jobcard tables. Almost all KEEP.

**KEEP (no change):** 18 jobcard/jobrequest sub-tables
**MODIFY:** `cmms_jobrequest_mst`, `cmms_jobcard_mst` — add new state columns and audit columns
**ISOLATE:** `cmms_cal_jobcard_feedback_spec` (0 rows, BLOB), `cmms_jobcard_insp_maint_dtl` (0 rows)

**NEW:**

1. `job_request_status_history` 🌱 *(if `cmms_jobcard_status_hist` can be extended to handle JRs too, this isn't needed — see Open Q6)*

**Verdict:** Cluster 4 is actually fine, the existing schema is rich. We extend, not rebuild.

---

### Cluster 5 — Calibration (target 6–8 tables)

**Existing:** `cmms_jobcard_cal_dtl`, `cmms_jobcard_cal_observations`, `cmms_jobcard_cal_adjustments_dtl`, `cmms_ins_accuracy_info` — already in jobcard cluster effectively

**Strategy:** Calibration is currently a child of Job Lifecycle in your schema, not a separate cluster. For MVP we'll keep it that way. P2 may add `calibration_certificates`, `traceability`, `standards`.

---

### Cluster 6 — Maintenance (target 4–5 tables)

**Existing:** `cmms_amc_mst` (0 rows), `cmms_device_spares_mst` — P2

**No MVP work.**

---

### Cluster 7 — Scheduling (target 3–4 tables) — P2

`cmms_schedule_mst`, `cmms_schedule_eqip_dtl` — sketch only.

---

### Cluster 8 — Procurement (target 6–7 tables) — P2

`cmms_po_mst`, `cmms_pur_mst`, `cmms_pur_dtl`, `cmms_inv_mst`, `cmms_lineitem_mst` — sketch only.

---

### Cluster 9 — Documents (target 3–4 tables) — P2 deferred (no file storage in MVP)

---

### Cluster 10 — Audit & Logs (target 3–4 tables)

**Existing:** `cmms_jobcard_status_hist` (✅, 22,214 rows), `cmms_jobcard_mst_history` (✅, 22,143 rows), `cmms_eqip_mst_hist` (✅, 519), `cmms_division_hist` (✅, 3,676)

**These are ENTITY-SPECIFIC history tables — useful but not enough.**

**NEW:**

1. `audit_log` 🌱 — generic write-audit log (BR-AUD-01)
2. `audit_log_changes` 🌱 — JSON diff per entry (BR-AUD-02)
3. `export_audit` 🌱 — BR-AUD-03

**Total: 4 existing + 3 new = 7 in active path.**

---

### Cluster 11 — Notifications (target 3 tables) — P2 (no email in MVP)

---

### Cluster 12 — Lookups (target 5–7 tables)

**Existing:** `cmms_parameter_master` 🔧 (337, primary lookup), `cmms_documentno_mst` ✅, `cmms_product_mst` ✅, `cmms_fault_mst` ✅, `cmms_task_mst` ✅, `cmms_designation_mst` ✅

**ISOLATE:** `cmms_parameter_master_bkp`, `cmms_parameter_master_incharge`, `cmms_parameter_master_jun2016`

**Strategy:** `cmms_parameter_master` already has shape `(CategoryID, CategoryDescription, SrID, Value)` which is a perfectly serviceable key-value lookup. We add a PK + audit columns.

**No NEW tables needed for MVP.**

---

### Cluster 13 — Reporting — P2

---

## 5. RECONCILIATION MATRIX — SUMMARY

```
┌──────────────────────────────────────────────────────────────────────┐
│                  EXISTING SCHEMA (~64 tables)                        │
│                                                                      │
│  ✅ KEEP (30)  🔧 ALTER (6)  🗄️ ISOLATE (28)                         │
│        │            │             │                                  │
│        │            │             └─→ legacy_*, not in MVP code     │
│        │            └─→ light ALTER TABLE                            │
│        │                                                             │
│        └─→ used as-is                                                │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
                              +
┌──────────────────────────────────────────────────────────────────────┐
│              NEW MVP TABLES (~12 in MVP-critical clusters)           │
│                                                                      │
│  Cluster 1 (Identity)   : 8 new (users, roles, permissions, etc.)    │
│  Cluster 3 (Equipment)  : 1 new (equipment_status_history)           │
│  Cluster 4 (Job)        : 0–1 new                                    │
│  Cluster 10 (Audit)     : 3 new (audit_log, audit_log_changes,       │
│                                  export_audit)                       │
└──────────────────────────────────────────────────────────────────────┘
                              =
┌──────────────────────────────────────────────────────────────────────┐
│  ACTIVE MVP SCHEMA = ~36 existing + ~12 new = ~48 tables             │
│  Plus ~28 legacy tables left untouched but renamed → ~76 total       │
│  ✓ Aligned with FINAL-DESC target "~70 tables"                       │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 6. CLUSTER 1 — Identity & Access (AUTH) — FULL DEEP DIVE

This is the most important cluster for MVP. The existing auth is **fundamentally incompatible** with our locked 3-layer RBAC model + bcrypt + JWT. We do NOT modify existing tables; we build a clean new stack and use `cmms_emp_mst` as a read-only employee directory.

### 6.1 Strategic Decision Diagram

```
   EXISTING (DO NOT BREAK)                  NEW (MVP RUNTIME READS THESE)
   ═════════════════════════                ═════════════════════════════

   cmms_emp_mst (57 rows)  ◄──── FK ────►   users (NEW)
   employee directory                       auth identity
   (kept as source of truth                 (bcrypt password + flags)
    for valid employee_ids)                          │
                                                     │ one role per user
                                                     ▼
                                            user_roles (NEW)
                                            (PK on user_id enforces
                                             BR-RBAC-02: ONE role)
                                                     │
                                                     ▼
                                            roles (NEW — exactly 5 rows)
                                                     │
                                                     │ many-to-many
                                                     ▼
                                            role_permissions (NEW)
                                                     │
                                                     ▼
                                            permissions (NEW — ~50 rows)
                                            (resource:action)
   ────────────────────────────────────────────────────────────────────
   ISOLATED (rename _legacy_*)
   • cmms_role_mst         (23 roles, archived)
   • cmms_userrole_mst     (565 user-role-pwd rows, MIGRATED then archived)
   • cmms_accessright_mst  (3221 module-role flags, archived)
   • cmms_module_mst       (163 menu items, archived)
   • cmms_section_user_mst (294 mappings, archived)
```

### 6.2 Data Migration Plan (existing 565 user-role rows → new tables)

**Source:** `cmms_userrole_mst` (565 rows). **Target:** `users` + `user_roles`.

| Old column           | Old type    | New target              | New type       | Notes                                                                                                                  |
| -------------------- | ----------- | ----------------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `USER_ID`          | varchar(7)  | `users.employee_id`   | varchar(7)     | Direct copy                                                                                                            |
| `USER_PASSWORD`    | varchar(10) | `users.password_hash` | varchar(60)    | **CANNOT migrate directly** — bcrypt the plaintext on first login OR force password reset for all (recommended) |
| `USER_STATE`       | tinyint(1)  | `users.is_active`     | tinyint(1)     | Direct                                                                                                                 |
| `USER_DIVISION_ID` | int         | (dropped)               | —             | Division is now in `cmms_section_user_mst`, or stored in `cmms_emp_mst.EMM_DEPT`                                   |
| `USER_ROLE`        | int (1..23) | `user_roles.role_id`  | tinyint (1..5) | **Requires role-mapping table** — see Open Q4                                                                   |

**Recommended migration approach (defence-grade):**

1. Seed `users` row for each `cmms_userrole_mst.USER_ID` with `password_hash = NULL` and `password_must_change = TRUE`.
2. Force password reset on first login for every existing user.
3. Do NOT auto-migrate plaintext passwords — even if bcrypted, the original was 10 chars and probably weak.

### 6.3 Complete DDL — Cluster 1 (Identity & Access)

```sql
-- ════════════════════════════════════════════════════════════════════
-- CLUSTER 1: IDENTITY & ACCESS
-- Locked decisions: D11, D12, D17, D18, BR-AUTH-*, BR-RBAC-*
-- ════════════════════════════════════════════════════════════════════

-- 1.0 — ALTER existing employee directory (KEEP + light modify)
-- ────────────────────────────────────────────────────────────────────
-- We do NOT touch business columns. We add a deterministic activity
-- index so auth can fast-filter to "loginable" employees.

ALTER TABLE `cmms_emp_mst`
  ADD INDEX `idx_emm_active` (`EMM_INACTIVE`);

-- (Note: we intentionally do NOT add a password column to cmms_emp_mst.
--  Auth identity is a separate concern from employee record. New
--  `users` table owns auth state. This is industry-standard separation.)


-- 1.1 — USERS (NEW)
-- ────────────────────────────────────────────────────────────────────
-- The auth-aware user record. ONE row per loginable employee.
-- Bound to cmms_emp_mst (employee directory) via FK on employee_id.

CREATE TABLE `users` (
  `user_id`              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `employee_id`          VARCHAR(7)      NOT NULL,
  `password_hash`        VARCHAR(60)     NULL DEFAULT NULL
                         COMMENT 'bcrypt hash, 60 chars. NULL until first set.',
  `password_must_change` TINYINT(1)      NOT NULL DEFAULT 1
                         COMMENT 'TRUE on bootstrap or admin reset',
  `password_changed_at`  DATETIME(6)     NULL DEFAULT NULL,
  `is_active`            TINYINT(1)      NOT NULL DEFAULT 1
                         COMMENT 'BR-AUTH-07: deactivated cannot login',
  `is_locked`            TINYINT(1)      NOT NULL DEFAULT 0
                         COMMENT 'Auto-lock after N failed attempts',
  `failed_login_count`   SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  `last_login_at`        DATETIME(6)     NULL DEFAULT NULL,
  `last_login_ip`        VARCHAR(45)     NULL DEFAULT NULL
                         COMMENT 'IPv6-ready',
  `created_at`           DATETIME(6)     NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by`           VARCHAR(7)      NULL DEFAULT NULL,
  `updated_at`           DATETIME(6)     NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
                                          ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by`           VARCHAR(7)      NULL DEFAULT NULL,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `uk_users_employee_id` (`employee_id`),
  CONSTRAINT `fk_users_employee`
    FOREIGN KEY (`employee_id`)
    REFERENCES `cmms_emp_mst` (`EMM_ID`),
  INDEX `idx_users_active` (`is_active`, `is_locked`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- 1.2 — ROLES (NEW — exactly 5 system roles per C1)
-- ────────────────────────────────────────────────────────────────────

CREATE TABLE `roles` (
  `role_id`          TINYINT UNSIGNED NOT NULL,
  `role_code`        VARCHAR(30)     NOT NULL
                     COMMENT 'SUPER_ADMIN | LAB_IN_CHARGE | LAB_ENGINEER | NORMAL_USER | VIEW_ONLY',
  `role_name`        VARCHAR(60)     NOT NULL,
  `role_description` VARCHAR(255)    NULL DEFAULT NULL,
  `is_system`        TINYINT(1)      NOT NULL DEFAULT 1
                     COMMENT 'System roles cannot be deleted via UI',
  `created_at`       DATETIME(6)     NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`role_id`),
  UNIQUE KEY `uk_roles_code` (`role_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Seed the 5 locked roles (run from migration, not app code)
INSERT INTO `roles` (`role_id`, `role_code`, `role_name`, `role_description`) VALUES
  (1, 'SUPER_ADMIN',   'Super Admin',    'Master data + RBAC + system integrity'),
  (2, 'LAB_IN_CHARGE', 'Lab In-Charge',  'Approve, assign, verify, close'),
  (3, 'LAB_ENGINEER',  'Lab Engineer',   'Execute jobs, fill cards, observations'),
  (4, 'NORMAL_USER',   'Normal User',    'Raise requests, register equipment'),
  (5, 'VIEW_ONLY',     'View-Only',      'Read-only auditor / management oversight');


-- 1.3 — PERMISSIONS (NEW — atomic resource:action)
-- ────────────────────────────────────────────────────────────────────

CREATE TABLE `permissions` (
  `permission_id`   SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `permission_code` VARCHAR(80)       NOT NULL
                    COMMENT 'e.g., equipment:create | job_card:verify-close',
  `resource`        VARCHAR(40)       NOT NULL
                    COMMENT 'e.g., equipment, job_card, audit_log',
  `action`          VARCHAR(40)       NOT NULL
                    COMMENT 'e.g., create, read-list, verify, reopen',
  `description`     VARCHAR(255)      NULL DEFAULT NULL,
  `is_system`       TINYINT(1)        NOT NULL DEFAULT 1,
  `created_at`      DATETIME(6)       NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`permission_id`),
  UNIQUE KEY `uk_perm_code` (`permission_code`),
  INDEX `idx_perm_resource` (`resource`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Seed permissions per FINAL-DESC §6 (run from migration)
-- Subset shown — full list mirrors the permission matrix exactly
INSERT INTO `permissions` (`permission_code`, `resource`, `action`, `description`) VALUES
  -- Auth & Identity
  ('auth:login',                'auth',         'login',                'Submit credentials'),
  ('auth:logout',               'auth',         'logout',               'End session'),
  ('auth:refresh-token',        'auth',         'refresh-token',        'Refresh JWT'),
  ('me:read',                   'me',           'read',                 'Read own profile'),
  -- User mgmt
  ('user:read-list',            'user',         'read-list',            'List users'),
  ('user:role-assign',          'user',         'role-assign',          'Assign/change role'),
  ('user:activate',             'user',         'activate',             'Activate user'),
  ('user:deactivate',           'user',         'deactivate',           'Deactivate user'),
  -- Equipment
  ('equipment:read-list',       'equipment',    'read-list',            'List equipment'),
  ('equipment:read-detail',     'equipment',    'read-detail',          'View equipment detail'),
  ('equipment:create',          'equipment',    'create',               'Register new equipment'),
  ('equipment:update',          'equipment',    'update',               'Edit equipment'),
  ('equipment:verify',          'equipment',    'verify',               'PENDING_VERIFICATION → ACTIVE'),
  ('equipment:condemn',         'equipment',    'condemn',              'Mark CONDEMNED'),
  ('equipment:delete',          'equipment',    'delete',               'Hard delete (SA only)'),
  -- Job Requests
  ('job_request:create',        'job_request',  'create',               'Create JR'),
  ('job_request:read-own',      'job_request',  'read-own',             'Read own JRs'),
  ('job_request:read-all',      'job_request',  'read-all',             'Read all JRs'),
  ('job_request:approve',       'job_request',  'approve',              'Approve JR'),
  ('job_request:reject',        'job_request',  'reject',               'Reject JR with reason'),
  ('job_request:assign-engineer','job_request', 'assign-engineer',      'Assign LE'),
  -- Job Cards
  ('job_card:read-list',        'job_card',     'read-list',            'List JCs'),
  ('job_card:read-detail',      'job_card',     'read-detail',          'View JC'),
  ('job_card:start-work',       'job_card',     'start-work',           'Mark IN-PROGRESS'),
  ('job_card:update-tasks',     'job_card',     'update-tasks',         'Update tasks/observations'),
  ('job_card:complete',         'job_card',     'complete',             'Mark COMPLETED'),
  ('job_card:verify-close',     'job_card',     'verify-close',         'Verify + close'),
  ('job_card:reopen',           'job_card',     'reopen',               'Reopen closed JC'),
  ('job_card:generate-pdf',     'job_card',     'generate-pdf',         'Download JC PDF'),
  -- Dashboard & Inquiry
  ('dashboard:view',            'dashboard',    'view',                 'Dashboard'),
  ('inquiry:search-vendors',    'inquiry',      'search-vendors',       'Vendor search'),
  ('inquiry:search-products',   'inquiry',      'search-products',      'Product search'),
  ('inquiry:search-job-cards',  'inquiry',      'search-job-cards',     'JC search'),
  ('inquiry:search-instruments','inquiry',      'search-instruments',   'Instrument search'),
  -- Master Data (Phase 2)
  ('master:employees:manage',   'master',       'employees:manage',     'Mgmt master employees'),
  ('master:vendors:manage',     'master',       'vendors:manage',       'Mgmt master vendors'),
  ('master:equipment-types:manage','master',    'equipment-types:manage','Mgmt eq types'),
  ('master:divisions:manage',   'master',       'divisions:manage',     'Mgmt divisions'),
  ('master:lookup-values:manage','master',      'lookup-values:manage', 'Mgmt lookup values'),
  -- Audit
  ('audit_log:read',            'audit_log',    'read',                 'Read audit log'),
  ('export:trigger',            'export',       'trigger',              'Trigger exports/PDF');


-- 1.4 — ROLE_PERMISSIONS (NEW — many-to-many junction)
-- ────────────────────────────────────────────────────────────────────

CREATE TABLE `role_permissions` (
  `role_id`       TINYINT UNSIGNED  NOT NULL,
  `permission_id` SMALLINT UNSIGNED NOT NULL,
  `granted_at`    DATETIME(6)       NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `granted_by`    VARCHAR(7)        NULL DEFAULT NULL,
  PRIMARY KEY (`role_id`, `permission_id`),
  CONSTRAINT `fk_rp_role`
    FOREIGN KEY (`role_id`)       REFERENCES `roles` (`role_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_rp_permission`
    FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`permission_id`) ON DELETE CASCADE,
  INDEX `idx_rp_perm` (`permission_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Seed role-permission grants per FINAL-DESC §6 permission matrix
-- (Generated by mapping the ✓/✗ matrix into rows. Below is a sample;
--  full grants live in seed/03_role_permissions.sql.)
-- Super Admin gets ALL permissions:
INSERT INTO `role_permissions` (`role_id`, `permission_id`)
SELECT 1, `permission_id` FROM `permissions`;
-- Other role grants are explicit per the matrix — see seed file.


-- 1.5 — USER_ROLES (NEW — BR-RBAC-02: exactly ONE role per user)
-- ────────────────────────────────────────────────────────────────────
-- The PK on `user_id` (not composite) enforces "one role per user".

CREATE TABLE `user_roles` (
  `user_id`     BIGINT UNSIGNED   NOT NULL,
  `role_id`     TINYINT UNSIGNED  NOT NULL,
  `assigned_at` DATETIME(6)       NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `assigned_by` VARCHAR(7)        NULL DEFAULT NULL,
  PRIMARY KEY (`user_id`),                       -- BR-RBAC-02 enforced here
  CONSTRAINT `fk_ur_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ur_role`
    FOREIGN KEY (`role_id`) REFERENCES `roles` (`role_id`),
  INDEX `idx_ur_role` (`role_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- 1.6 — REFRESH_TOKENS (NEW — D17: 7-day refresh)
-- ────────────────────────────────────────────────────────────────────

CREATE TABLE `refresh_tokens` (
  `token_id`        BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`         BIGINT UNSIGNED NOT NULL,
  `token_hash`      VARCHAR(255)    NOT NULL
                    COMMENT 'SHA-256 hash of raw token; raw token never stored',
  `issued_at`       DATETIME(6)     NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `expires_at`      DATETIME(6)     NOT NULL,
  `revoked_at`      DATETIME(6)     NULL DEFAULT NULL,
  `revoked_reason`  VARCHAR(60)     NULL DEFAULT NULL
                    COMMENT 'logout | rotated | admin_revoke | password_change',
  `user_agent`      VARCHAR(500)    NULL DEFAULT NULL,
  `ip_address`      VARCHAR(45)     NULL DEFAULT NULL,
  PRIMARY KEY (`token_id`),
  UNIQUE KEY `uk_rt_hash` (`token_hash`),
  CONSTRAINT `fk_rt_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  INDEX `idx_rt_user_expires` (`user_id`, `expires_at`),
  INDEX `idx_rt_expires` (`expires_at`)
                    COMMENT 'For background cleanup of expired tokens'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- 1.7 — LOGIN_AUDIT (NEW — BR-AUTH-06: every login attempt logged)
-- ────────────────────────────────────────────────────────────────────

CREATE TABLE `login_audit` (
  `audit_id`     BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `employee_id`  VARCHAR(7)      NOT NULL
                 COMMENT 'Not user_id — failed logins may have no matching user',
  `attempt_at`   DATETIME(6)     NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `outcome`      ENUM(
                   'SUCCESS',
                   'FAILED_BAD_PASSWORD',
                   'FAILED_LOCKED',
                   'FAILED_INACTIVE',
                   'FAILED_NOT_FOUND',
                   'FAILED_MUST_CHANGE_PW',
                   'LOGOUT'
                 ) NOT NULL,
  `ip_address`   VARCHAR(45)     NULL DEFAULT NULL,
  `user_agent`   VARCHAR(500)    NULL DEFAULT NULL,
  `notes`        VARCHAR(255)    NULL DEFAULT NULL,
  PRIMARY KEY (`audit_id`),
  INDEX `idx_la_emp_time`  (`employee_id`, `attempt_at`),
  INDEX `idx_la_time`      (`attempt_at`),
  INDEX `idx_la_outcome`   (`outcome`, `attempt_at`)
                 COMMENT 'For "failed logins last 24h" dashboards'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- 1.8 — PASSWORD_HISTORY (NEW — defence-grade nicety, OPTIONAL but recommended)
-- ────────────────────────────────────────────────────────────────────
-- Prevents reuse of last N passwords. ISRO SAC-like environment usually
-- mandates this. Mark as OPTIONAL — confirm with DS before keeping.

CREATE TABLE `password_history` (
  `history_id`      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`         BIGINT UNSIGNED NOT NULL,
  `password_hash`   VARCHAR(60)     NOT NULL,
  `changed_at`      DATETIME(6)     NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `changed_by`      VARCHAR(7)      NULL DEFAULT NULL
                    COMMENT 'NULL if self-change, else admin who reset it',
  PRIMARY KEY (`history_id`),
  CONSTRAINT `fk_ph_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  INDEX `idx_ph_user_time` (`user_id`, `changed_at` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

### 6.4 Old vs New — Auth Comparison Table

| Concern                 | Existing (cmms_*)                                                       | New (clean stack)                                                        | Why we changed it                                                                                                                               |
| ----------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Password storage        | `USER_PASSWORD varchar(10)` plaintext                                 | `users.password_hash varchar(60)` bcrypt                               | 🔴 Plaintext is unacceptable. bcrypt locked in NFR Security + S5.                                                                               |
| User identity           | Composite (USER_ID, USER_DIVISION_ID)                                   | Single PK `user_id BIGINT` + UNIQUE `employee_id`                    | Composite PK forces redundant rows if a user moves division. Modern model: one user, one identity. Division lives in `cmms_emp_mst.EMM_DEPT`. |
| Role count              | 23 (in `cmms_role_mst`)                                               | 5 (in `roles`)                                                         | Locked C1: 5 roles only. Old 23 will be archived; 565 existing user assignments need a role-mapping rule (see Open Q4).                         |
| Roles per user          | Could have multiple via (USER_ID, DIVISION) pairs                       | Exactly 1 (PK on `user_roles.user_id`)                                 | Locked BR-RBAC-02. Enforced at the schema level — not just business logic.                                                                     |
| Permission model        | `(MOD_ID, ROLE_ID) → 5 boolean flags` (ADD/MODIFY/VIEW/DELETE/PRINT) | `(role_id, permission_id)` where permission is `resource:action`     | Locked BR-RBAC-03: code never checks role names. Old model couldn't express e.g.`job_card:verify-close` distinct from `job_card:complete`.  |
| Token storage           | None (session-based, no JWT)                                            | `refresh_tokens` table with SHA-256 hash                               | Locked D17: JWT 15min + refresh cookie 7 days. Hash-not-token at rest is industry standard.                                                     |
| Login audit             | None visible                                                            | `login_audit` with outcome enum                                        | Locked BR-AUTH-06: 100% coverage of login attempts.                                                                                             |
| Inactive user           | `USER_STATE tinyint(1)`                                               | `users.is_active` + `users.is_locked` separate                       | Inactive = admin-deactivated. Locked = auto-locked from failed attempts. Different states, different recovery paths.                            |
| Password rotation       | Not enforced                                                            | `password_must_change` flag + optional `password_history`            | Bootstrap forces reset (D18); password_history is defence-grade nicety.                                                                         |
| Failed-attempt tracking | None                                                                    | `users.failed_login_count` + `login_audit`                           | Defence-grade. Lock after N attempts.                                                                                                           |
| Employee directory      | Tangled with auth in `cmms_userrole_mst`                              | Separated:`cmms_emp_mst` = directory (KEEP), `users` = auth identity | Clean separation of concerns. Employee data lives where business already maintains it.                                                          |

### 6.5 Auth Module ER Diagram

```
                            ┌──────────────────────────────┐
                            │ cmms_emp_mst (KEEP)          │
                            │ ── employee directory ──     │
                            │ PK: EMM_ID (varchar 7)       │
                            │     EMM_NAME, EMM_DESIGNATION│
                            │     EMM_DEPT → section       │
                            │     EMM_INACTIVE             │
                            └─────────────┬────────────────┘
                                          │ employee_id (FK)
                                          ▼
        ┌─────────────────────────────────────────────────────────────┐
        │  users                                                      │
        │  PK: user_id                                                │
        │      employee_id (UNIQUE, FK to cmms_emp_mst.EMM_ID)        │
        │      password_hash (bcrypt 60)                              │
        │      password_must_change, is_active, is_locked             │
        │      failed_login_count, last_login_at                      │
        └────┬──────────────────────────┬──────────────────────────┬──┘
             │ 1:1                       │ 1:N                      │ 1:N
             │ PK enforces ONE role     │                          │
             ▼                          ▼                          ▼
        ┌──────────────┐         ┌────────────────┐        ┌──────────────────┐
        │ user_roles   │         │ refresh_tokens │        │ password_history │
        │ PK: user_id  │         │ token_hash     │        │ (optional)       │
        │     role_id  │         │ expires_at     │        │                  │
        └──────┬───────┘         │ revoked_at     │        └──────────────────┘
               │                 └────────────────┘
               │ M:1
               ▼
        ┌──────────────┐
        │ roles (5)    │
        │ PK: role_id  │
        │     role_code│
        └──────┬───────┘
               │ M:N
               ▼
        ┌────────────────────┐
        │ role_permissions   │
        │ PK: (role_id,      │
        │      permission_id)│
        └──────┬─────────────┘
               │ M:1
               ▼
        ┌─────────────────┐
        │ permissions     │
        │ PK: permission_id│
        │     resource    │
        │     action      │
        └─────────────────┘

        ┌────────────────────────────────────────┐
        │ login_audit (write-only by auth layer) │
        │ employee_id, outcome, attempt_at, ip   │
        └────────────────────────────────────────┘
```

### 6.6 Bootstrap Seed — Super Admin (per D11, D18, BR-AUTH-05)

```sql
-- Bootstrap migration: runs once on first deploy.
-- Reads SUPER_ADMIN_EMPLOYEE_IDS env var = "SA79900,AC77777"
-- DS provided: SA79900, AC77777

-- Step 1: Verify both employee IDs exist in cmms_emp_mst
--   (If not, migration fails with clear error — DS adds employees first.)

-- Step 2: Create users rows
INSERT INTO `users`
  (`employee_id`, `password_hash`, `password_must_change`, `is_active`, `created_by`)
VALUES
  ('SA79900', NULL, 1, 1, 'BOOTSTRAP'),    -- password set on first login
  ('AC77777', NULL, 1, 1, 'BOOTSTRAP');

-- Step 3: Grant SUPER_ADMIN role to both
INSERT INTO `user_roles` (`user_id`, `role_id`, `assigned_by`)
SELECT u.user_id, 1, 'BOOTSTRAP'
FROM `users` u
WHERE u.employee_id IN ('SA79900', 'AC77777');

-- Step 4: Record in audit
INSERT INTO `audit_log`
  (`actor_employee_id`, `action`, `entity_type`, `entity_id`, `notes`)
VALUES
  ('BOOTSTRAP', 'USER_CREATE', 'user', 'SA79900', 'Super Admin seed via env CSV'),
  ('BOOTSTRAP', 'USER_CREATE', 'user', 'AC77777', 'Super Admin seed via env CSV'),
  ('BOOTSTRAP', 'ROLE_ASSIGN', 'user', 'SA79900', 'role=SUPER_ADMIN'),
  ('BOOTSTRAP', 'ROLE_ASSIGN', 'user', 'AC77777', 'role=SUPER_ADMIN');
```

---

## 7. CLUSTER 3 — Equipment Master — Reconciliation + DDL

### 7.1 Strategy: KEEP + ALTER (don't recreate)

`cmms_eqip_mst` has 5,704 rows + 13 dependent tables. Recreating is reckless. We **ALTER** to add what's missing for our locked rules:

**What's missing for our locked rules:**

- BR-EQP-09: `registered_by` + `verified_by` + timestamps → `EQM_CREATED_BY` exists ✓ but no `verified_by`, `verified_on`
- BR-EQP-10: PENDING_VERIFICATION default → status column exists (`EQM_DIV_STATUS`) but no formal enum
- D10: New equipment defaults to PENDING_VERIFICATION → not enforced

### 7.2 DDL — Cluster 3 ALTERs and NEW

```sql
-- ════════════════════════════════════════════════════════════════════
-- CLUSTER 3: EQUIPMENT MASTER
-- ════════════════════════════════════════════════════════════════════

-- 3.1 ALTER cmms_eqip_mst — add what's missing for BR-EQP rules
-- ────────────────────────────────────────────────────────────────────

ALTER TABLE `cmms_eqip_mst`
  -- BR-EQP-09: verification fields
  ADD COLUMN `EQM_VERIFIED_BY`   VARCHAR(7)  NULL DEFAULT NULL AFTER `EQM_CREATED_BY`,
  ADD COLUMN `EQM_VERIFIED_ON`   DATETIME(6) NULL DEFAULT NULL AFTER `EQM_VERIFIED_BY`,
  -- D10 / BR-EQP-10: formal MVP status column
  ADD COLUMN `EQM_MVP_STATUS` ENUM(
      'PENDING_VERIFICATION',
      'ACTIVE',
      'UNDER_CALIBRATION',
      'UNDER_REPAIR',
      'OUT_OF_TOLERANCE',
      'QUARANTINED',
      'CONDEMNED',
      'RETIRED'
    ) NOT NULL DEFAULT 'PENDING_VERIFICATION' AFTER `EQM_DIV_STATUS`,
  ADD COLUMN `EQM_MVP_STATUS_AT` DATETIME(6) NULL DEFAULT NULL AFTER `EQM_MVP_STATUS`,
  ADD INDEX `idx_eqip_mvp_status` (`EQM_MVP_STATUS`),
  ADD INDEX `idx_eqip_cal_due` (`EQM_CAL_DUE_DATE`),
  ADD INDEX `idx_eqip_div` (`EQM_DIVID`);

-- Note: existing 5,704 rows will get NULL EQM_VERIFIED_BY; per business
-- decision, we backfill all existing as 'ACTIVE' (data migration).
UPDATE `cmms_eqip_mst`
   SET `EQM_MVP_STATUS` = 'ACTIVE',
       `EQM_MVP_STATUS_AT` = COALESCE(`EQM_UPDATED_ON`, `EQM_CREATED_ON`)
 WHERE `EQM_MVP_STATUS` = 'PENDING_VERIFICATION';

-- 3.2 NEW: equipment_status_history (formal state-machine log)
-- ────────────────────────────────────────────────────────────────────
-- BR-EQP-06: state transitions logged. `cmms_division_hist` tracks
-- division/status but not the full state machine, so we add this.

CREATE TABLE `equipment_status_history` (
  `history_id`        BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `eqm_type`          VARCHAR(15)     NOT NULL,
  `eqm_id`            INT             NOT NULL,
  `from_status`       VARCHAR(30)     NULL DEFAULT NULL
                      COMMENT 'NULL on initial create (= PENDING_VERIFICATION)',
  `to_status`         VARCHAR(30)     NOT NULL,
  `transitioned_at`   DATETIME(6)     NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `transitioned_by`   VARCHAR(7)      NOT NULL,
  `reason`            VARCHAR(500)    NULL DEFAULT NULL,
  `related_job_card`  VARCHAR(9)      NULL DEFAULT NULL
                      COMMENT 'If transition was triggered by a job card',
  PRIMARY KEY (`history_id`),
  CONSTRAINT `fk_esh_eqip`
    FOREIGN KEY (`eqm_type`, `eqm_id`)
    REFERENCES `cmms_eqip_mst` (`EQM_TYPE`, `EQM_ID`),
  INDEX `idx_esh_eqip_time` (`eqm_type`, `eqm_id`, `transitioned_at` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

---

## 8. CLUSTER 4 — Job Lifecycle — Reconciliation + DDL

### 8.1 Strategy: ALTER existing, almost no NEW tables

Job Lifecycle is the most data-rich cluster. 22 existing tables, ~280K rows, mature relationships. We extend.

### 8.2 DDL — Cluster 4

```sql
-- ════════════════════════════════════════════════════════════════════
-- CLUSTER 4: JOB LIFECYCLE
-- ════════════════════════════════════════════════════════════════════

-- 4.1 ALTER cmms_jobrequest_mst — add formal MVP status enum
-- ────────────────────────────────────────────────────────────────────

ALTER TABLE `cmms_jobrequest_mst`
  ADD COLUMN `JR_MVP_STATUS` ENUM(
      'DRAFT',
      'SUBMITTED',
      'ASSIGNED',
      'IN_PROGRESS',
      'COMPLETED',
      'VERIFIED_CLOSED',
      'REJECTED',
      'REOPENED'
    ) NOT NULL DEFAULT 'DRAFT' AFTER `JR_REQUEST_TYPE`,
  ADD COLUMN `JR_MVP_STATUS_AT` DATETIME(6) NULL DEFAULT NULL,
  ADD COLUMN `JR_APPROVED_BY`   VARCHAR(7) NULL DEFAULT NULL,
  ADD COLUMN `JR_APPROVED_ON`   DATETIME(6) NULL DEFAULT NULL,
  ADD COLUMN `JR_REJECTED_BY`   VARCHAR(7) NULL DEFAULT NULL,
  ADD COLUMN `JR_REJECTED_ON`   DATETIME(6) NULL DEFAULT NULL,
  ADD COLUMN `JR_REJECTION_REASON` VARCHAR(500) NULL DEFAULT NULL,
  ADD COLUMN `JR_PRIORITY` ENUM('LOW','NORMAL','HIGH','URGENT') NOT NULL DEFAULT 'NORMAL',
  ADD INDEX `idx_jr_status` (`JR_MVP_STATUS`),
  ADD INDEX `idx_jr_submittedby` (`JR_SUBMITTEDBYID`),
  ADD INDEX `idx_jr_division` (`JR_DIVISION`);

-- Backfill existing 21,485 rows: derive MVP status from existing data
UPDATE `cmms_jobrequest_mst`
   SET `JR_MVP_STATUS` = CASE
         WHEN `JR_SECTIONJOB_NO` IS NOT NULL THEN 'ASSIGNED'
         ELSE 'SUBMITTED'
       END
 WHERE `JR_MVP_STATUS` = 'DRAFT';


-- 4.2 ALTER cmms_jobcard_mst — add formal MVP status enum + audit
-- ────────────────────────────────────────────────────────────────────

ALTER TABLE `cmms_jobcard_mst`
  ADD COLUMN `JM_MVP_STATUS` ENUM(
      'ASSIGNED',
      'IN_PROGRESS',
      'COMPLETED',
      'VERIFIED_CLOSED',
      'REOPENED'
    ) NOT NULL DEFAULT 'ASSIGNED' AFTER `JM_JobStatus`,
  ADD COLUMN `JM_VERIFIED_BY`   VARCHAR(7) NULL DEFAULT NULL,
  ADD COLUMN `JM_VERIFIED_ON`   DATETIME(6) NULL DEFAULT NULL,
  ADD COLUMN `JM_REOPENED_REASON` VARCHAR(500) NULL DEFAULT NULL,
  ADD INDEX `idx_jc_status` (`JM_MVP_STATUS`),
  ADD INDEX `idx_jc_eqip` (`JM_EQM_TYPE`, `JM_EQM_ID`),
  ADD INDEX `idx_jc_recd_date` (`JM_JCRecdDate`);

-- (cmms_jobcard_status_hist already exists with 22,214 rows — KEEP as the
--  formal state-history table. We just write our new MVP status into it
--  going forward.)
```

---

## 9. CLUSTER 10 — Audit & Logs — Fresh Design

### 9.1 Strategy: existing history tables are entity-specific; we add a generic write-audit log

```sql
-- ════════════════════════════════════════════════════════════════════
-- CLUSTER 10: AUDIT & LOGS
-- ════════════════════════════════════════════════════════════════════

-- 10.1 audit_log (NEW — BR-AUD-01: every write logged)
-- ────────────────────────────────────────────────────────────────────

CREATE TABLE `audit_log` (
  `audit_id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `actor_employee_id`   VARCHAR(7)      NOT NULL
                        COMMENT 'EMM_ID of acting user, or BOOTSTRAP/SYSTEM',
  `actor_role_code`     VARCHAR(30)     NULL DEFAULT NULL,
  `action`              VARCHAR(60)     NOT NULL
                        COMMENT 'EQUIPMENT_CREATE | JOB_REQUEST_APPROVE | etc.',
  `entity_type`         VARCHAR(40)     NOT NULL
                        COMMENT 'equipment | job_request | job_card | user',
  `entity_id`           VARCHAR(50)     NOT NULL
                        COMMENT 'PK of the affected entity (stringified)',
  `occurred_at`         DATETIME(6)     NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `ip_address`          VARCHAR(45)     NULL DEFAULT NULL,
  `user_agent`          VARCHAR(500)    NULL DEFAULT NULL,
  `request_id`          VARCHAR(40)     NULL DEFAULT NULL
                        COMMENT 'Correlates with pino-http log line',
  `notes`               VARCHAR(500)    NULL DEFAULT NULL,
  PRIMARY KEY (`audit_id`),
  INDEX `idx_al_entity` (`entity_type`, `entity_id`, `occurred_at` DESC),
  INDEX `idx_al_actor`  (`actor_employee_id`, `occurred_at` DESC),
  INDEX `idx_al_action` (`action`, `occurred_at` DESC),
  INDEX `idx_al_time`   (`occurred_at` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- 10.2 audit_log_changes (NEW — BR-AUD-02: before/after JSON diff)
-- ────────────────────────────────────────────────────────────────────

CREATE TABLE `audit_log_changes` (
  `change_id`     BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `audit_id`      BIGINT UNSIGNED NOT NULL,
  `field_name`    VARCHAR(80)     NOT NULL,
  `before_value`  TEXT            NULL DEFAULT NULL,
  `after_value`   TEXT            NULL DEFAULT NULL,
  PRIMARY KEY (`change_id`),
  CONSTRAINT `fk_alc_audit`
    FOREIGN KEY (`audit_id`) REFERENCES `audit_log` (`audit_id`) ON DELETE CASCADE,
  INDEX `idx_alc_audit` (`audit_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- 10.3 export_audit (NEW — BR-AUD-03: exports logged with user + IDs)
-- ────────────────────────────────────────────────────────────────────

CREATE TABLE `export_audit` (
  `export_id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `actor_employee_id` VARCHAR(7)      NOT NULL,
  `export_type`       VARCHAR(40)     NOT NULL
                      COMMENT 'JOB_CARD_PDF | CAL_CERT_PDF | future EXCEL_*',
  `record_ids`        TEXT            NOT NULL
                      COMMENT 'Comma-separated or JSON array of PK(s)',
  `occurred_at`       DATETIME(6)     NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `ip_address`        VARCHAR(45)     NULL DEFAULT NULL,
  PRIMARY KEY (`export_id`),
  INDEX `idx_ea_actor` (`actor_employee_id`, `occurred_at` DESC),
  INDEX `idx_ea_type`  (`export_type`, `occurred_at` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

---

## 10. CLUSTER 12 — Lookups — Reconciliation

```sql
-- ════════════════════════════════════════════════════════════════════
-- CLUSTER 12: LOOKUPS
-- ════════════════════════════════════════════════════════════════════
-- Strategy: cmms_parameter_master already has the right shape — extend.
-- It's a key-value lookup with (CategoryID, CategoryDescription, SrID, Value).
-- We add a real PK and audit columns.

ALTER TABLE `cmms_parameter_master`
  ADD COLUMN `is_active`   TINYINT(1) NOT NULL DEFAULT 1,
  ADD COLUMN `display_order` SMALLINT NOT NULL DEFAULT 0,
  ADD COLUMN `created_at`  DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  ADD COLUMN `updated_at`  DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
                                       ON UPDATE CURRENT_TIMESTAMP(6),
  ADD PRIMARY KEY (`CategoryID`, `SrID`),
  ADD INDEX `idx_pm_category` (`CategoryID`, `display_order`);

-- Isolate the backup variants so the runtime never accidentally reads them
RENAME TABLE
  `cmms_parameter_master_bkp`       TO `_legacy_parameter_master_bkp`,
  `cmms_parameter_master_jun2016`   TO `_legacy_parameter_master_jun2016`,
  `cmms_parameter_master_incharge`  TO `_legacy_parameter_master_incharge`;
```

**MVP lookup seeds we will need** (rows go in `cmms_parameter_master`):

- `CategoryID=1, 'Job Request Status'` → DRAFT, SUBMITTED, ASSIGNED, IN_PROGRESS, COMPLETED, VERIFIED_CLOSED, REJECTED, REOPENED
- `CategoryID=2, 'Equipment MVP Status'` → PENDING_VERIFICATION, ACTIVE, UNDER_CALIBRATION, …
- `CategoryID=3, 'Calibration Status'` → VALID, DUE_SOON, OVERDUE, OUT_OF_TOLERANCE, NOT_REQUIRED
- `CategoryID=4, 'Priority'` → LOW, NORMAL, HIGH, URGENT
- `CategoryID=5, 'Equipment Category'` → T&ME, F&PE

(Note: enums on the actual `_MVP_STATUS` columns are the source of truth at the DB layer. Lookups are for UI display labels, ordering, i18n. Both exist by design.)

---

## 11. P2 CLUSTERS — Sketch Only

Per FINAL-DESC §25 Step 6, we sketch but do not finalise Phase 2 clusters.

| Cluster          | Existing tables                                     | NEW for P2                                                                                    |
| ---------------- | --------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| 5 Calibration    | `cmms_jobcard_cal_*`, `cmms_ins_accuracy_info`  | `calibration_certificates`, `standards`, `traceability_chain`                           |
| 6 Maintenance    | `cmms_amc_mst`, `cmms_device_spares_mst`        | `pm_plans`, `breakdowns`                                                                  |
| 7 Scheduling     | `cmms_schedule_mst`, `cmms_schedule_eqip_dtl`   | `schedule_events`, `schedule_recurrence`                                                  |
| 8 Procurement    | `cmms_po_mst`, `cmms_pur_mst`, `cmms_inv_mst` | `vendors` (replaces missing `cmms_cont_mst`?), `vendor_categories`, `stock_movements` |
| 9 Documents      | (none kept)                                         | `documents`, `doc_versions`, `signatures`                                               |
| 11 Notifications | (none)                                              | `notifications`, `notification_preferences`                                               |
| 13 Reporting     | (none)                                              | `saved_reports`, `report_runs`                                                            |

---

## 12. OPEN QUESTIONS FOR DS

These are **decision-needed** items I cannot resolve from the dump alone.

### Q1 (🔴 BLOCKING for Cluster 3) — Where is `cmms_cont_mst`?

4 tables reference `cmms_cont_mst (CMM_CONT_ID)` but its DDL is missing from the dump. This is the vendor/manufacturer master and is FK'd from `cmms_eqip_mst.EQM_MFRID` (5,704 rows depend on it). Can you export this table's schema?

### Q2 (🟡 Cluster 1) — Are SA79900 and AC77777 existing employees?

The 2 super-admin IDs you provided are 7 chars (fit `EMM_ID VARCHAR(7)`). Do they already exist in `cmms_emp_mst`'s 57 employees? If NO, the bootstrap migration needs to insert them first. Please run:

```sql
SELECT EMM_ID, EMM_NAME, EMM_INACTIVE FROM cmms_emp_mst WHERE EMM_ID IN ('SA79900','AC77777');
```

### Q3 (🟡 Cluster 1) — Migration of 565 existing user-role rows

For the 565 rows in `cmms_userrole_mst`:

- **(a)** Migrate them all and force password reset on first login? (RECOMMENDED — defence-grade)
- **(b)** Only migrate active employees (`cmms_emp_mst.EMM_INACTIVE = 0`)?
- **(c)** Skip migration entirely; let Super Admins provision users on demand?

### Q4 (🟡 Cluster 1) — Mapping 23 old roles → 5 new roles

The old `cmms_role_mst` has 23 role rows. We need a mapping. Can you share the names of the 23 roles? I'll propose a mapping table like:

```
old_role_id → new_role_code
   1 ("Administrator")   → SUPER_ADMIN
   2 ("Lab In-Charge")   → LAB_IN_CHARGE
   ...
   23 ("Guest")          → VIEW_ONLY
```

### Q5 (🟢 Cluster 3) — Can `cmms_division_hist` serve as equipment_status_history?

`cmms_division_hist` (3,676 rows) already tracks (EQM_TYPE, EQM_ID, EQD_STATUS, EQD_DIV_DATE). Should we extend it with `from_status` + `transitioned_by` instead of creating a new `equipment_status_history`? My preference: keep them separate (division history vs status history are semantically different).

### Q6 (🟢 Cluster 4) — Should we add `job_request_status_history`?

`cmms_jobcard_status_hist` (22,214 rows) only tracks job cards. Job requests have no status history table. Two options:

- **(a)** Create `job_request_status_history` (NEW, my recommendation)
- **(b)** Extend `cmms_jobcard_status_hist` with a polymorphic `entity_type` column (uglier but fewer tables)

### Q7 (🟡 Cluster 12) — Password policy strength?

For an ISRO SAC-like environment, what password policy should we enforce?

- Length minimum (8/12/14)?
- Complexity (mixed case + digit + symbol)?
- Expiry (90 days / 180 days / never)?
- Password history (last 3 / 5 / 10 forbidden)?

I included `password_history` in the DDL as optional. Confirm or remove.

### Q8 (🟢 Org context) — `cmms_emp_mst.EMM_DEPT` semantics

`EMM_DEPT` is an int FK to `cmms_section_mst(SM_ID)` (293 sections). Is "section" the right granularity for org-level row scoping (BR-VIS)? Or should we add a coarser "division" level above section?

---

## 13. PHASE 3 — DAY 2 PLAN

When DS returns answers to Open Questions 1–8, we complete:

1. Resolve `cmms_cont_mst` (Q1) → finalise Equipment cluster
2. Verify SA79900/AC77777 (Q2) → finalise bootstrap seed
3. Lock migration strategy for old users (Q3) + role mapping (Q4)
4. Write final seed files:
   - `seed/01_roles.sql` (5 rows)
   - `seed/02_permissions.sql` (~45 rows mirroring the matrix)
   - `seed/03_role_permissions.sql` (full grant matrix per §6 FINAL-DESC)
   - `seed/04_super_admin_users.sql` (SA79900, AC77777)
   - `seed/05_lookup_values.sql` (statuses, frequencies, etc.)
5. Draw clean ER diagrams for MVP-critical clusters (image deliverable)
6. Set up the migration runner (versioned SQL files, naming convention)
7. Lock the final MVP-critical schema and freeze

---

**END OF PHASE 3 — DAY 1 OUTPUT**

*This document is subordinate to FINAL-DESC-CMCMIS v1.0. Any conflict, FINAL-DESC wins. Any decision in this document can be revised by DS — flag a "REVISION-CANDIDATE" and we update.*
