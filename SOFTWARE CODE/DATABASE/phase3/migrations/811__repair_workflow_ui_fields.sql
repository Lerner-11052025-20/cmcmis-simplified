-- ============================================================================
-- CMCMIS_SIMPLIFIED - Migration 811
-- Purpose: Add storage for repair UI fields introduced after the dedicated
--          repair workflow tabs were first added.
-- ============================================================================

SET NAMES utf8mb4;
SET sql_mode = 'STRICT_TRANS_TABLES';

SET @c := (
  SELECT COUNT(*)
    FROM information_schema.columns
   WHERE table_schema = DATABASE()
     AND table_name = 'cmms_jobcard_mst'
     AND column_name = 'repair_equipment_received_from_cal_lab_flag'
);
SET @sql := IF(
  @c > 0,
  'SELECT ''skip: repair_equipment_received_from_cal_lab_flag already present'' AS note',
  'ALTER TABLE `cmms_jobcard_mst` ADD COLUMN `repair_equipment_received_from_cal_lab_flag` VARCHAR(3) NULL COMMENT ''Repair workflow: Yes/No flag for equipment received from calibration lab'' AFTER `repair_equipment_received_from_cal_lab`'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @c := (
  SELECT COUNT(*)
    FROM information_schema.columns
   WHERE table_schema = DATABASE()
     AND table_name = 'cmms_jobcard_mst'
     AND column_name = 'awaiting_restarting_date'
);
SET @sql := IF(
  @c > 0,
  'SELECT ''skip: awaiting_restarting_date already present'' AS note',
  'ALTER TABLE `cmms_jobcard_mst` ADD COLUMN `awaiting_restarting_date` DATE NULL COMMENT ''Awaiting information: restarting date after awaiting clearance'' AFTER `awaiting_from_date`'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT 'Migration 811 complete - repair workflow UI fields ensured' AS status;
