-- ════════════════════════════════════════════════════════════════════
-- CMCMIS_SIMPLIFIED — Migration 303 (Phase 9)
-- File:     303__phase9_jr_cancel_columns.sql
-- Purpose:  ADD 3 NULLable columns to cmms_jobrequest_mst so the new
--           "Cancel DRAFT" flow can record cancellation metadata
--           without an enum MODIFY.
--
-- WHY LOGICAL CANCELLED (decision D-9.11):
--   JR_MVP_STATUS enum does NOT contain 'CANCELLED'. ALTER MODIFY on
--   a populated enum violates the ADD-only doctrine (same reasoning as
--   Phase 7 Slice 2's APPROVED). Cancel writes JR_CANCELLED_AT and
--   leaves status='DRAFT' on the wire. The list endpoint filters out
--   rows where JR_CANCELLED_AT IS NOT NULL (unless ?include_cancelled=1).
--
-- Idempotent: YES — INFORMATION_SCHEMA-guarded.
-- ════════════════════════════════════════════════════════════════════

SET NAMES utf8mb4;
SET sql_mode = 'STRICT_TRANS_TABLES';

-- 1) JR_CANCELLED_AT — datetime stamp. Truthy = cancelled.
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME   = 'cmms_jobrequest_mst'
     AND COLUMN_NAME  = 'JR_CANCELLED_AT'
);
SET @ddl := IF(
  @col_exists = 0,
  'ALTER TABLE `cmms_jobrequest_mst` ADD COLUMN `JR_CANCELLED_AT` DATETIME(6) NULL COMMENT ''Phase 9: when JR was cancelled (logical CANCELLED state — JR_MVP_STATUS stays DRAFT)''',
  'SELECT ''skip: JR_CANCELLED_AT already present'' AS note'
);
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2) JR_CANCELLED_BY — actor employee_id (matches D-9.12 identity shape).
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME   = 'cmms_jobrequest_mst'
     AND COLUMN_NAME  = 'JR_CANCELLED_BY'
);
SET @ddl := IF(
  @col_exists = 0,
  'ALTER TABLE `cmms_jobrequest_mst` ADD COLUMN `JR_CANCELLED_BY` VARCHAR(7) NULL COMMENT ''Phase 9: employee_id of the submitter who cancelled the draft''',
  'SELECT ''skip: JR_CANCELLED_BY already present'' AS note'
);
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3) JR_CANCEL_REASON — optional free-text reason.
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME   = 'cmms_jobrequest_mst'
     AND COLUMN_NAME  = 'JR_CANCEL_REASON'
);
SET @ddl := IF(
  @col_exists = 0,
  'ALTER TABLE `cmms_jobrequest_mst` ADD COLUMN `JR_CANCEL_REASON` VARCHAR(500) NULL COMMENT ''Phase 9: optional free-text reason for cancelling the draft''',
  'SELECT ''skip: JR_CANCEL_REASON already present'' AS note'
);
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Verify
SELECT '✓ Migration 303 complete' AS status;
SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE
  FROM information_schema.COLUMNS
 WHERE TABLE_SCHEMA = DATABASE()
   AND TABLE_NAME   = 'cmms_jobrequest_mst'
   AND COLUMN_NAME IN ('JR_CANCELLED_AT','JR_CANCELLED_BY','JR_CANCEL_REASON');
