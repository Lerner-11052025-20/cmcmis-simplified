---
name: project-cmcmis-existing-db
description: "CMCMIS existing DB inventory (Phase 3 audit, 2026-05-16) — SUPERSEDED for design by [[project-cmcmis-db-v2-locked]] (2026-05-17). Kept for historical audit context only."
metadata: 
  node_type: memory
  type: project
  originSessionId: b9863bb4-3873-480d-9bae-b15d6a527c82
---

> ⚠️ **STATUS:** This memory captures the Phase 3 Day 1 audit. As of 2026-05-17, all design decisions have moved to [[project-cmcmis-db-v2-locked]] (the v2.0 LOCKED design) with answers in [[project-cmcmis-db-v2-migration-answers]]. The 🔴 BR-VIOLATIONS listed below are ALL RESOLVED by v2.0 (new users table with bcrypt VARCHAR(60), new audit_log / login_audit / refresh_tokens tables, ALTERs adding EQM_VERIFIED_BY/ON + EQM_MVP_STATUS, new equipment_status_history with PK, new job_request_status_history). Read for legacy context; do NOT use as design guide.

**Database name (legacy):** `cmcmis_redev` (MySQL 8.x, InnoDB, utf8mb4)
**Total existing tables:** 64
**Schema files (in repo):**
- `DB/cmcmis_schema_analysis_bundle/cmcmis_schema_only.sql` — DDL dump (no data)
- `DB/cmcmis_schema_analysis_bundle/cmcmis_table_summary.csv` — row counts + FK summary
- `DB/cmcmis_schema_analysis_bundle/cmcmis_schema_key_report.md` — pre-analyzed key report
- `DB/cmcmis_schema_analysis_bundle/cmcmis_schema_keys.json` — keys in JSON

**Super Admin Seed IDs (D11 / BR-AUTH-05):**
- `SA79900`
- `AC77777`
These two go into `SUPER_ADMIN_EMPLOYEE_IDS` env var (comma-separated) and the seed migration creates corresponding rows in `cmcm_users` + `cmcm_user_roles`.

## Critical findings from Phase 3 audit (must preserve)

| Flag | Issue | Where |
|---|---|---|
| 🔴 BR-VIOLATION | `cmms_userrole_mst.USER_PASSWORD` is VARCHAR(10) — likely plaintext; cannot fit bcrypt 60-char hash | cmms_userrole_mst |
| 🔴 BR-VIOLATION | `cmms_jobcard_status_hist` has NO primary key — append-only assumption violated (BR-JC-08) | cmms_jobcard_status_hist |
| 🔴 BR-VIOLATION | Equipment table has no `registered_by` / `verified_by` / `verified_at` (BR-EQP-09) | cmms_eqip_mst |
| 🔴 BR-VIOLATION | Equipment has no PENDING_VERIFICATION status — uses free-text `EQM_DIV_STATUS` (BR-EQP-10) | cmms_eqip_mst |
| 🔴 BR-VIOLATION | No central `audit_log` table — only per-entity *_hist tables (BR-AUD-01) | (missing) |
| 🔴 BR-VIOLATION | No `login_audit` (BR-AUTH-06), no `refresh_tokens` table | (missing) |
| 🟡 DECISION | `cmms_role_mst` has 23 roles — we only need 5. Mapping pending. | cmms_role_mst |
| 🟡 DECISION | `cmms_eqip_mst` compound PK (EQM_TYPE, EQM_ID) propagates to 12+ FK chains | cmms_eqip_mst |
| 🟡 DECISION | `cmms_jobcard_mst` has BOTH JM_JobCardNO (int) AND JM_SectionJobNo (varchar(9), PK) — which is canonical? | cmms_jobcard_mst |
| 🟡 DECISION | `cmms_cont_mst` (vendors/contacts) is referenced by 4+ FKs but NOT in the 64-table dump | (missing FK target!) |
| ⚪ REVISION | `cmms_amc_mst.UPDATED_BY` is BIGINT but `UPDATED_ON` is VARCHAR(7) — column names swapped | cmms_amc_mst |
| 🟣 ORPHAN | `cmms_parameter_master_bkp` (4 rows), `_jun2016` (233 rows), `_incharge` (9 rows) — backup tables | (3 tables) |
| 🟣 ORPHAN | `cf001`/`cf002`/`cf003`/`cf004` (4 tables, no FKs) — look like legacy duplicates of checklist tables | cf00x |
| 🟣 ORPHAN | `cmms_pur_mst` (0 rows), `cmms_pur_dtl` (0 rows), `cmms_amc_mst` (0 rows), `cmms_cal_jobcard_feedback_spec` (0 rows), `cmms_jobcard_insp_maint_dtl` (0 rows) | (5 tables) |

**Why this memory:** Phase 3 audit is the foundation for the next 9 weeks. These flags must persist so future sessions don't re-derive them from scratch.

**How to apply:**
- Treat all 🔴 BR-VIOLATION flags as MUST-FIX before MVP ships.
- Treat 🟡 DECISION-NEEDED items as blockers for finalising the cluster they belong to.
- Treat 🟣 ORPHAN-CANDIDATE tables as DEPRECATE in MVP (don't migrate data into new tables).
- New schema: prefix new tables with `cmcm_` to distinguish from legacy `cmms_` tables.

See [[project-cmcmis-overview]], [[project-cmcmis-modules-roles]], [[project-cmcmis-business-rules]], [[project-cmcmis-decisions]], [[project-cmcmis-constraints]].
