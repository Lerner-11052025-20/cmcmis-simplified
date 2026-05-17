-- ════════════════════════════════════════════════════════════════════
-- CMCMIS_SIMPLIFIED — Migration 004
-- File:     004__seed_super_admin_employees.sql
-- Purpose:  Insert SA79900 and AC77777 rows into legacy cmms_emp_mst
-- Per:      M1 (EMM_DEPT=9999), M2 (defaults accepted)
-- Idempotent: YES — INSERT IGNORE on duplicate PK
-- ════════════════════════════════════════════════════════════════════

SET NAMES utf8mb4;

-- ────────────────────────────────────────────────────────────────────
-- SA79900 — Primary Super Admin
-- ────────────────────────────────────────────────────────────────────
INSERT IGNORE INTO `cmms_emp_mst` (
  `EMM_ID`,
  `EMM_NAME`,
  `EMM_DESIGNATION`,
  `EMM_DESIGDATE`,
  `EMM_DEPT`,
  `EMM_DEPTDATE`,
  `EMM_DOB`,
  `EMM_DOJ`,
  `EMM_EMAIL`,
  `EMM_MOBILE`,
  `EMM_REMARKS`,
  `EMM_CREATED_BY`,
  `EMM_CREATED_ON`,
  `EMM_UPDATED_BY`,
  `EMM_UPDATED_ON`,
  `EMM_ROLE`,
  `EMM_INACTIVE`
) VALUES (
  'SA79900',
  'System Super Admin (Primary)',
  'System Administrator',
  NOW(6),
  9999,                 -- ADMIN section seeded in migration 003
  NOW(6),
  NULL,
  NOW(6),
  'sa79900@cmcmis.local',
  NULL,
  'Bootstrap super admin seeded per Phase 3 v2.0 (SUPER_ADMIN_EMPLOYEE_IDS env)',
  'BOOTSTRAP',
  NOW(6),
  'BOOTSTRAP',
  NOW(6),
  NULL,                 -- legacy EMM_ROLE intentionally NULL; new RBAC owns this
  0                     -- active
);

-- ────────────────────────────────────────────────────────────────────
-- AC77777 — Secondary Super Admin
-- ────────────────────────────────────────────────────────────────────
INSERT IGNORE INTO `cmms_emp_mst` (
  `EMM_ID`,
  `EMM_NAME`,
  `EMM_DESIGNATION`,
  `EMM_DESIGDATE`,
  `EMM_DEPT`,
  `EMM_DEPTDATE`,
  `EMM_DOB`,
  `EMM_DOJ`,
  `EMM_EMAIL`,
  `EMM_MOBILE`,
  `EMM_REMARKS`,
  `EMM_CREATED_BY`,
  `EMM_CREATED_ON`,
  `EMM_UPDATED_BY`,
  `EMM_UPDATED_ON`,
  `EMM_ROLE`,
  `EMM_INACTIVE`
) VALUES (
  'AC77777',
  'System Super Admin (Secondary)',
  'System Administrator',
  NOW(6),
  9999,
  NOW(6),
  NULL,
  NOW(6),
  'ac77777@cmcmis.local',
  NULL,
  'Bootstrap super admin seeded per Phase 3 v2.0 (SUPER_ADMIN_EMPLOYEE_IDS env)',
  'BOOTSTRAP',
  NOW(6),
  'BOOTSTRAP',
  NOW(6),
  NULL,
  0
);

-- Verify
SELECT '✓ Migration 004 complete' AS status;
SELECT EMM_ID, EMM_NAME, EMM_DEPT, EMM_EMAIL, EMM_INACTIVE
  FROM `cmms_emp_mst`
 WHERE `EMM_ID` IN ('SA79900', 'AC77777');
