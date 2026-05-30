-- ============================================================================
-- CMCMIS_SIMPLIFIED - Migration 760
-- Purpose: Create dedicated jc_calibration_task_checklist table for calibration
--          tasks to store both task type (NABL/NON-NABL/BOTH) and result.
-- ============================================================================

SET NAMES utf8mb4;
SET sql_mode = 'STRICT_TRANS_TABLES';

CREATE TABLE IF NOT EXISTS `jc_calibration_task_checklist` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `jc_section_no` VARCHAR(9) NOT NULL,
  `task_id` INT NULL COMMENT 'References cmms_task_mst.TSK_ID, or NULL if custom',
  `task_text` VARCHAR(500) NOT NULL COMMENT 'Task name / text description',
  `task_type` VARCHAR(50) NULL COMMENT 'NABL / NON-NABL / BOTH NABL & NON-NABL',
  `task_result` VARCHAR(50) NULL COMMENT 'PASS / FAIL / Functional Test / Not Carried Out',
  `is_custom` TINYINT(1) NOT NULL DEFAULT 0,
  `is_completed` TINYINT(1) NOT NULL DEFAULT 0,
  `completed_by_employee_id` VARCHAR(7) NULL,
  `completed_at` DATETIME(6) NULL,
  `order_index` INT NOT NULL DEFAULT 0,
  `created_by_employee_id` VARCHAR(7) NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  KEY `idx_jctc_jc` (`jc_section_no`, `order_index`),
  CONSTRAINT `fk_jctc_jc` FOREIGN KEY (`jc_section_no`) REFERENCES `cmms_jobcard_mst`(`JM_SectionJobNo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci
  COMMENT='Dedicated task checklist for calibration department (TME and FPE Calibration)';

SELECT 'Migration 760 complete - calibration task checklist table created' AS status;
