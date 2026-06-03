-- ============================================================================
-- CMCMIS_SIMPLIFIED - Migration 780
-- Purpose: Equipment-specific calibration checklist master and JC linkage.
-- ============================================================================

SET NAMES utf8mb4;
SET sql_mode = 'STRICT_TRANS_TABLES';

CREATE TABLE IF NOT EXISTS `checklists_master` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `checklist_code` VARCHAR(30) NOT NULL,
  `checklist_name` VARCHAR(150) NOT NULL,
  `equipment_type` VARCHAR(15) NOT NULL,
  `equipment_id` INT NOT NULL,
  `equipment_code` VARCHAR(40) NOT NULL,
  `equipment_name` VARCHAR(150) NULL,
  `equipment_model_no` VARCHAR(100) NULL,
  `equipment_serial_no` VARCHAR(100) NULL,
  `equipment_make` VARCHAR(150) NULL,
  `equipment_division` VARCHAR(100) NULL,
  `equipment_category` VARCHAR(100) NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_by_employee_id` VARCHAR(7) NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_by_employee_id` VARCHAR(7) NULL,
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  UNIQUE KEY `uk_checklists_code` (`checklist_code`),
  KEY `idx_checklists_equipment` (`equipment_type`, `equipment_id`, `is_active`),
  KEY `idx_checklists_name` (`checklist_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci
  COMMENT='Equipment-specific calibration checklist master created by SA/Lab In-Charge';

CREATE TABLE IF NOT EXISTS `checklist_master_tasks` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `checklist_id` BIGINT UNSIGNED NOT NULL,
  `task_id` INT NULL COMMENT 'References cmms_task_mst.TSK_ID, or NULL for custom checklist task',
  `task_text` VARCHAR(500) NOT NULL,
  `task_type` VARCHAR(50) NOT NULL DEFAULT 'NABL' COMMENT 'NABL / NON-NABL / BOTH',
  `is_custom` TINYINT(1) NOT NULL DEFAULT 0,
  `order_index` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  KEY `idx_cmt_checklist` (`checklist_id`, `order_index`),
  KEY `idx_cmt_task` (`task_id`),
  CONSTRAINT `fk_cmt_checklist`
    FOREIGN KEY (`checklist_id`) REFERENCES `checklists_master`(`id`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci
  COMMENT='Task rows grouped under checklists_master';

SET @col_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'jc_calibration_task_checklist'
    AND COLUMN_NAME = 'checklist_id'
);
SET @ddl := IF(
  @col_exists = 0,
  'ALTER TABLE `jc_calibration_task_checklist` ADD COLUMN `checklist_id` BIGINT UNSIGNED NULL AFTER `jc_section_no`',
  'SELECT ''checklist_id already exists'' AS status'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'jc_calibration_task_checklist'
    AND INDEX_NAME = 'idx_jctc_checklist'
);
SET @ddl := IF(
  @idx_exists = 0,
  'ALTER TABLE `jc_calibration_task_checklist` ADD KEY `idx_jctc_checklist` (`checklist_id`)',
  'SELECT ''idx_jctc_checklist already exists'' AS status'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT 'Migration 780 complete - checklist master and JC checklist linkage ready' AS status;
