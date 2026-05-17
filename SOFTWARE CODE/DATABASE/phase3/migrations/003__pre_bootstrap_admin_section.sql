-- ════════════════════════════════════════════════════════════════════
-- CMCMIS_SIMPLIFIED — Migration 003
-- File:     003__pre_bootstrap_admin_section.sql
-- Purpose:  Insert "ADMIN" row into legacy cmms_section_mst so that
--           SA79900 and AC77777 can be inserted with a valid EMM_DEPT FK.
-- Per:      M1 answer — "Insert a brand-new 'ADMIN' row (SM_ID=9999)"
-- Idempotent: YES — INSERT IGNORE on duplicate PK
-- ════════════════════════════════════════════════════════════════════

SET NAMES utf8;

INSERT IGNORE INTO `cmms_section_mst` (
  `SM_ID`,
  `SM_SHORTNAME`,
  `SM_NAME`,
  `SM_HEAD_NAME`,
  `SM_HEAD_PH_NO`,
  `SM_HEAD_USER_ID`,
  `SM_STATE`,
  `SM_CREATED_BY`,
  `SM_CREATED_ON`,
  `SM_UPDATED_BY`,
  `SM_UPDATED_ON`,
  `SM_HEAD_DESIGNATION`,
  `SM_ISGROUP`,
  `SM_Email`
) VALUES (
  9999,
  'ADMIN',
  'System Administration',
  NULL,
  NULL,
  NULL,
  1,
  'BOOTSTRAP',
  NOW(6),
  'BOOTSTRAP',
  NOW(6),
  'System Administrator',
  0,
  NULL
);

-- Verify
SELECT
  '✓ Migration 003 complete' AS status,
  SM_ID, SM_SHORTNAME, SM_NAME
FROM `cmms_section_mst`
WHERE `SM_ID` = 9999;
