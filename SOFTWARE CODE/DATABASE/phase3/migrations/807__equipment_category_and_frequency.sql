SET NAMES utf8mb4;

ALTER TABLE `cmms_eqip_mst`
  ADD COLUMN IF NOT EXISTS `category` VARCHAR(10) NULL
    COMMENT 'Equipment registration category selected in UI: T&ME or F&PE'
    AFTER `EQM_ID`;

ALTER TABLE `cmms_eqip_mst`
  ADD COLUMN IF NOT EXISTS `EQM_CAL_FREQ` VARCHAR(2) NULL
    COMMENT 'Calibration or maintenance frequency in months'
    AFTER `EQM_PM_FREQ`;

SET @i := (
  SELECT COUNT(*)
    FROM information_schema.statistics
   WHERE table_schema = DATABASE()
     AND table_name = 'cmms_eqip_mst'
     AND index_name = 'idx_eqip_category'
);
SET @sql := IF(
  @i > 0,
  'SELECT ''skip: idx_eqip_category already present'' AS note',
  'CREATE INDEX `idx_eqip_category` ON `cmms_eqip_mst` (`category`)'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT 'Migration 807 complete - equipment category and calibration frequency columns ready' AS status;
