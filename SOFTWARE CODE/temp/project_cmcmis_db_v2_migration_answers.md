---
name: project-cmcmis-db-v2-migration-answers
description: "M1–M12 migration data answers LOCKED 2026-05-17 — Admin section SM_ID=9999, password=employee_id, no auto-create users, all defaults accepted"
metadata: 
  node_type: memory
  type: project
  originSessionId: 4365bcb1-7e07-4521-8da8-e6524359a964
---

**All answers LOCKED on 2026-05-17 by user.** These resolve the migration data requirements in FINAL_DB_DESIGN_v2.0 §18. No further confirmation needed before writing bootstrap code.

## The 12 Answers

| ID | Severity | Question | LOCKED Answer |
|---|---|---|---|
| **M1** | 🔴 BLOCK | SM_ID for SA79900/AC77777 EMM_DEPT | **Option B — INSERT new ADMIN section.** `INSERT INTO cmms_section_mst (SM_ID, SM_SHORTNAME, SM_NAME, SM_HEAD_NAME, SM_STATE, SM_CREATED_BY, SM_CREATED_ON, SM_UPDATED_BY, SM_UPDATED_ON) VALUES (9999, 'ADMIN', 'System Administration', NULL, 1, 'BOOTSTRAP', NOW(6), 'BOOTSTRAP', NOW(6))` |
| **M2** | 🔴 BLOCK | Full name/designation/email for SA79900 & AC77777 | **Use my defaults.** SA79900 = 'Super Admin Primary' / 'System Administrator' / sa79900@org.local. AC77777 = 'Super Admin Secondary' / 'System Administrator' / ac77777@org.local. User only owns: the 2 IDs + password = employee_id. Everything else: my call. |
| **M3** | 🟡 W2 | Seed cmms_cont_mst with vendor rows | **Placeholder strategy.** `SELECT DISTINCT EQM_MFRID, COALESCE(EQM_MFG_MODEL_NAME, CONCAT('Vendor #', EQM_MFRID)) FROM cmms_eqip_mst WHERE EQM_MFRID IS NOT NULL` → bulk INSERT each as (CMM_CONT_ID, CMM_CONT_NAME, 'MFR', 1, 'BOOTSTRAP', 'BOOTSTRAP'). **Critical:** reuse the same EQM_MFRID values as CMM_CONT_ID so legacy FKs resolve cleanly. |
| **M4** | 🟡 W2 | Legacy MFRID → new CMM_CONT_ID mapping | **Same as M3** — reuse legacy IDs as new PKs. AUTO_INCREMENT picks up after the max. |
| **M5** | 🟡 W2 | Legacy section_mst 293 SM_IDs → new sections mapping | **Skip for MVP.** Unmapped legacy data simply doesn't appear in new section-filtered views. Acceptable. Phase 2 task. |
| **M6** | 🟡 W2 | Auto-create users for the 57 legacy employees? | **NO — do not auto-create.** Super Admin onboards on demand via UI. Only SA79900 + AC77777 exist in `users` post-bootstrap. Cleaner audit, smaller bootstrap surface. |
| **M7** | 🟡 W2 | Backfill rule for cmms_jobcard_mst.JM_MVP_STATUS (19,432 rows) | **All legacy → VERIFIED_CLOSED.** Assume historical jobs are closed. `UPDATE cmms_jobcard_mst SET JM_MVP_STATUS='VERIFIED_CLOSED' WHERE JM_MVP_STATUS='ASSIGNED'` |
| **M8** | 🟡 W2 | Backfill rule for cmms_jobrequest_mst.JR_MVP_STATUS (21,485 rows) | **Conditional.** `UPDATE … SET JR_MVP_STATUS = CASE WHEN JR_SECTIONJOB_NO IS NOT NULL THEN 'ASSIGNED' ELSE 'SUBMITTED' END, JR_MVP_STATUS_AT = JR_JOBREQUESTDATE WHERE JR_MVP_STATUS='DRAFT'` |
| **M9** | 🟢 NTH | Head employee_id for T&ME and F&PE sections | **NULL on bootstrap.** Super Admin sets later via UI. |
| **M10** | 🟢 NTH | Archive 23-role legacy dump for historical viewer | **Already isolated** as `_legacy_role_mst`. No MVP impact. |
| **M11** | 🟢 NTH | bcrypt cost factor | **12 in prod, 10 in dev/test.** Overridable via `BCRYPT_ROUNDS` env. |
| **M12** | 🟢 NTH | JWT/refresh durations | **Locked defaults.** Access JWT 15 min, refresh 7 days (per D17). |

## SA79900 + AC77777 Full Seed Spec (committed)

```sql
-- Step 3: Pre-bootstrap admin section
INSERT INTO cmms_section_mst
  (SM_ID, SM_SHORTNAME, SM_NAME, SM_HEAD_NAME, SM_STATE,
   SM_CREATED_BY, SM_CREATED_ON, SM_UPDATED_BY, SM_UPDATED_ON)
VALUES (9999, 'ADMIN', 'System Administration', NULL, 1,
   'BOOTSTRAP', NOW(6), 'BOOTSTRAP', NOW(6));

-- Step 4: Seed Super Admins in cmms_emp_mst (EMM_DEPT=9999)
INSERT INTO cmms_emp_mst
  (EMM_ID, EMM_NAME, EMM_DESIGNATION, EMM_DEPT, EMM_EMAIL, EMM_INACTIVE,
   EMM_CREATED_BY, EMM_CREATED_ON, EMM_UPDATED_BY, EMM_UPDATED_ON)
VALUES
  ('SA79900', 'Super Admin Primary',   'System Administrator', 9999,
   'sa79900@org.local', 0,
   'BOOTSTRAP', CURRENT_TIMESTAMP(6),
   'BOOTSTRAP', CURRENT_TIMESTAMP(6)),
  ('AC77777', 'Super Admin Secondary', 'System Administrator', 9999,
   'ac77777@org.local', 0,
   'BOOTSTRAP', CURRENT_TIMESTAMP(6),
   'BOOTSTRAP', CURRENT_TIMESTAMP(6));

-- Step 8: Seed users (Node migration runner computes bcrypt at runtime)
-- password_hash = bcrypt('SA79900', 12) and bcrypt('AC77777', 12) respectively
-- section_id NULL on bootstrap (M9 default)

-- Step 8b: Both → role_id=1 (SUPER_ADMIN) in user_roles
```

## What User Explicitly Owns vs Delegated

| User OWNS (locked) | Claude OWNS (delegated) |
|---|---|
| 2 Super Admin employee_ids: SA79900, AC77777 | Names, designations, emails |
| Password rule: password = employee_id | All bootstrap defaults |
| Admin section: SM_ID=9999 strategy | Section short_name/full_name wording |
| 5 roles, ~40 permissions matrix | Exact permission codes + grant matrix |

## Post-Bootstrap Verification Checklist (must pass)

- `SELECT COUNT(*) FROM roles` = 5
- `SELECT COUNT(*) FROM permissions` = 40
- `SELECT COUNT(*) FROM role_permissions` ≈ 110
- `SELECT COUNT(*) FROM users` = 2
- `SELECT COUNT(*) FROM user_roles` = 2
- `SELECT COUNT(*) FROM departments` = 1 (TIMCD)
- `SELECT COUNT(*) FROM sections` = 2 (T&ME, F&PE)
- `SELECT COUNT(*) FROM cmms_emp_mst` = 57 + 2 = 59
- `SELECT COUNT(*) FROM cmms_parameter_master` = 337 + 28 = 365
- `SELECT COUNT(*) FROM audit_log` ≥ 6
- `bcrypt.compare('SA79900', users.password_hash)` = TRUE for SA79900
- `bcrypt.compare('AC77777', users.password_hash)` = TRUE for AC77777

See [[project-cmcmis-db-v2-locked]] for the full design, [[project-cmcmis-next-phase-code]] for the code-writing phase that follows.
