-- ════════════════════════════════════════════════════════════════════
-- CMCMIS_SIMPLIFIED — Migration 200 (Phase 7 Slice 2)
-- File:     200__phase7s2_jc_columns.sql
-- Purpose:  ADD 5 NULLable columns to cmms_jobcard_mst so the new MVP
--           Convert flow can record engineer, workflow type, planning
--           notes, and the parent JR linkage on each Job Card.
--
-- WHY ADDITIVE-ONLY:
--   19,432 legacy rows already live in cmms_jobcard_mst. NOT NULL on any
--   new column would 1-shot crash on apply. Every column here is NULL,
--   so legacy rows pass validation untouched and new MVP rows populate
--   them explicitly.
--
-- Idempotent: YES — INFORMATION_SCHEMA-guarded; safe to re-run.
-- Authority chain: FINAL-DESC-CMCMIS v1.0 > FINAL_DB_DESIGN v2.0
--                  > SCHEMA_PHASE7_SLICE2.md (decisions D-7.2.7, D-7.2.9)
-- ════════════════════════════════════════════════════════════════════

SET NAMES utf8mb4;
SET sql_mode = 'STRICT_TRANS_TABLES';

-- ─────────────────────────────────────────────────────────────────────
-- Helper procedure pattern — we wrap each ADD COLUMN in a dynamic
-- check against information_schema.COLUMNS so re-running the migration
-- on an already-patched DB is a no-op (mysql2's migration runner
-- compares file checksum to schema_migrations.checksum_sha256; if the
-- file edits, it'd otherwise try to re-apply and fail with "duplicate
-- column" — this guard makes it safe either way).
-- ─────────────────────────────────────────────────────────────────────

-- 1) JM_ASSIGNED_ENGINEER — varchar(7) NULL. Mirrors JR_ASSIGNED_ENGINEER
--    (same width / charset). Stores the engineer's cmms_emp_mst.EMM_ID,
--    NOT the numeric users.user_id (D-7.2.9). Indexed in migration 201.
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME   = 'cmms_jobcard_mst'
     AND COLUMN_NAME  = 'JM_ASSIGNED_ENGINEER'
);
SET @ddl := IF(
  @col_exists = 0,
  'ALTER TABLE `cmms_jobcard_mst` ADD COLUMN `JM_ASSIGNED_ENGINEER` VARCHAR(7) NULL COMMENT ''Phase 7 Slice 2: engineer assigned at Convert time (employee_id, FK shape matches JR_ASSIGNED_ENGINEER)'' AFTER `JM_REOPENED_REASON`',
  'SELECT ''skip: JM_ASSIGNED_ENGINEER already present'' AS note'
);
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2) JM_WORKFLOW_TYPE — varchar(50) NULL. Enum string scoped by JR.JR_JOB_TYPE.
--    No DB CHECK constraint (MySQL <8.0.16 ignores them anyway; enforced
--    in zod validators + state machine). Six valid values per D-7.2.10.
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME   = 'cmms_jobcard_mst'
     AND COLUMN_NAME  = 'JM_WORKFLOW_TYPE'
);
SET @ddl := IF(
  @col_exists = 0,
  'ALTER TABLE `cmms_jobcard_mst` ADD COLUMN `JM_WORKFLOW_TYPE` VARCHAR(50) NULL COMMENT ''Phase 7 Slice 2: workflow flavour (CALIBRATION_STANDARD/_PRECISION, INSPECTION_ROUTINE/_DETAILED, MASTER_DATA_FIELD_UPDATE/_REVISION)'' AFTER `JM_ASSIGNED_ENGINEER`',
  'SELECT ''skip: JM_WORKFLOW_TYPE already present'' AS note'
);
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3) JM_REQUIRED_RESOURCES — varchar(2000) NULL. Optional free-text the
--    LIC fills in at Convert ("High-precision multimeter, Temperature
--    chamber, …"). Engineer reads it later in Phase 9.
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME   = 'cmms_jobcard_mst'
     AND COLUMN_NAME  = 'JM_REQUIRED_RESOURCES'
);
SET @ddl := IF(
  @col_exists = 0,
  'ALTER TABLE `cmms_jobcard_mst` ADD COLUMN `JM_REQUIRED_RESOURCES` VARCHAR(2000) NULL COMMENT ''Phase 7 Slice 2: resources/tools the engineer should prep in advance'' AFTER `JM_WORKFLOW_TYPE`',
  'SELECT ''skip: JM_REQUIRED_RESOURCES already present'' AS note'
);
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 4) JM_SPECIAL_INSTRUCTIONS — varchar(2000) NULL. Optional safety /
--    procedure notes ("Handle with care - sensitive to static electricity").
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME   = 'cmms_jobcard_mst'
     AND COLUMN_NAME  = 'JM_SPECIAL_INSTRUCTIONS'
);
SET @ddl := IF(
  @col_exists = 0,
  'ALTER TABLE `cmms_jobcard_mst` ADD COLUMN `JM_SPECIAL_INSTRUCTIONS` VARCHAR(2000) NULL COMMENT ''Phase 7 Slice 2: safety/procedure notes pre-filled by LIC for the engineer'' AFTER `JM_REQUIRED_RESOURCES`',
  'SELECT ''skip: JM_SPECIAL_INSTRUCTIONS already present'' AS note'
);
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 5) JM_PARENT_JR_NO — int(11) NULL. The JR this JC was born from.
--    The existing legacy FK is JR.JR_SECTIONJOB_NO → JC.JM_SectionJobNo
--    (i.e. JR points at JC). Storing the inverse direction explicitly here
--    gives us O(1) lookup of "given a JC, which JR created it?" without a
--    JOIN. Matches JR_JOBREQUESTNO column type (int(11)).
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME   = 'cmms_jobcard_mst'
     AND COLUMN_NAME  = 'JM_PARENT_JR_NO'
);
SET @ddl := IF(
  @col_exists = 0,
  'ALTER TABLE `cmms_jobcard_mst` ADD COLUMN `JM_PARENT_JR_NO` INT(11) NULL COMMENT ''Phase 7 Slice 2: parent JR_JOBREQUESTNO (the JR that was converted to create this JC); inverse of the legacy JR_SECTIONJOB_NO FK direction'' AFTER `JM_SPECIAL_INSTRUCTIONS`',
  'SELECT ''skip: JM_PARENT_JR_NO already present'' AS note'
);
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ─────────────────────────────────────────────────────────────────────
-- Verify — print the row a person can eyeball for sanity.
-- ─────────────────────────────────────────────────────────────────────
SELECT '✓ Migration 200 complete (5 NULLable columns added or already present)' AS status;
SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_COMMENT
  FROM information_schema.COLUMNS
 WHERE TABLE_SCHEMA = DATABASE()
   AND TABLE_NAME   = 'cmms_jobcard_mst'
   AND COLUMN_NAME IN ('JM_ASSIGNED_ENGINEER','JM_WORKFLOW_TYPE','JM_REQUIRED_RESOURCES','JM_SPECIAL_INSTRUCTIONS','JM_PARENT_JR_NO')
 ORDER BY ORDINAL_POSITION;
