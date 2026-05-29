-- ============================================================================
-- CMCMIS_SIMPLIFIED - Migration 730
-- Purpose: Add the dedicated calibration Job Card workflow storage for both
--          TME and FPE calibration cards.
--
-- Additive only: existing repair workflow columns and child tables remain
-- untouched. These fields are certificate/PDF friendly and mirror the new
-- calibration workflow UI.
-- ============================================================================

SET NAMES utf8mb4;
SET sql_mode = 'STRICT_TRANS_TABLES';

ALTER TABLE `cmms_jobcard_mst`
  ADD COLUMN IF NOT EXISTS `cal_job_started_date` DATE NULL
    COMMENT 'Calibration workflow: job started date',
  ADD COLUMN IF NOT EXISTS `cal_job_completed_date` DATE NULL
    COMMENT 'Calibration workflow: job completed date',
  ADD COLUMN IF NOT EXISTS `cal_calibration_status` VARCHAR(80) NULL
    COMMENT 'Calibration workflow: Valid/Limited/Partial/No Cal status',
  ADD COLUMN IF NOT EXISTS `cal_temperature_c` VARCHAR(80) NULL
    COMMENT 'Calibration workflow: temperature in deg C as recorded on certificate',
  ADD COLUMN IF NOT EXISTS `cal_relative_humidity` VARCHAR(80) NULL
    COMMENT 'Calibration workflow: relative humidity as recorded on certificate',
  ADD COLUMN IF NOT EXISTS `cal_ref_no` VARCHAR(120) NULL
    COMMENT 'Calibration workflow: calibration reference number',
  ADD COLUMN IF NOT EXISTS `cal_due_date` DATE NULL
    COMMENT 'Calibration workflow: next calibration due date',
  ADD COLUMN IF NOT EXISTS `calibrated_by_employee_id` VARCHAR(7) NULL
    COMMENT 'Calibration workflow: employee id of calibrating engineer',
  ADD COLUMN IF NOT EXISTS `cal_equipment_received_status` VARCHAR(120) NULL
    COMMENT 'Calibration workflow: status of equipment as received',
  ADD COLUMN IF NOT EXISTS `cal_repair_carried_out_by` VARCHAR(255) NULL
    COMMENT 'Calibration workflow: repaired carried out by, if applicable',
  ADD COLUMN IF NOT EXISTS `cal_sent_to_lab_date` DATE NULL
    COMMENT 'Calibration workflow: date sent to lab',
  ADD COLUMN IF NOT EXISTS `cal_received_from_lab_date` DATE NULL
    COMMENT 'Calibration workflow: date received from lab',
  ADD COLUMN IF NOT EXISTS `cal_adjustment_status` VARCHAR(80) NULL
    COMMENT 'Calibration workflow: adjustment selection/status',
  ADD COLUMN IF NOT EXISTS `cal_limited_reason` TEXT NULL
    COMMENT 'Calibration workflow: reason for limited, partial, or no calibration',
  ADD COLUMN IF NOT EXISTS `cal_remarks` TEXT NULL
    COMMENT 'Calibration workflow: remarks for calibration certificate/job card',
  ADD COLUMN IF NOT EXISTS `cal_incharge_employee_id` VARCHAR(7) NULL
    COMMENT 'Calibration workflow: lab in-charge signature employee id',
  ADD COLUMN IF NOT EXISTS `cal_incharge_date` DATE NULL
    COMMENT 'Calibration workflow: lab in-charge signature date';

CREATE TABLE IF NOT EXISTS `jc_calibration_equipment_used` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `jc_section_no` VARCHAR(9) NOT NULL,
  `sr_no` SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  `equipment_id` VARCHAR(100) NULL,
  `equipment_name` VARCHAR(255) NULL,
  `created_by_employee_id` VARCHAR(7) NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  KEY `idx_jceu_jc` (`jc_section_no`, `sr_no`),
  CONSTRAINT `fk_jceu_jc` FOREIGN KEY (`jc_section_no`) REFERENCES `cmms_jobcard_mst`(`JM_SectionJobNo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci
  COMMENT='Calibration workflow: equipments/tools used for calibration';

CREATE TABLE IF NOT EXISTS `jc_calibration_adjustments` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `jc_section_no` VARCHAR(9) NOT NULL,
  `sr_no` SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  `parameter_name` VARCHAR(255) NULL,
  `test_value` VARCHAR(255) NULL,
  `specifications_limits` TEXT NULL,
  `observation_before` TEXT NULL,
  `observation_after` TEXT NULL,
  `created_by_employee_id` VARCHAR(7) NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  KEY `idx_jca_jc` (`jc_section_no`, `sr_no`),
  CONSTRAINT `fk_jca_jc` FOREIGN KEY (`jc_section_no`) REFERENCES `cmms_jobcard_mst`(`JM_SectionJobNo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci
  COMMENT='Calibration workflow: adjustment parameters and before/after observations';

SELECT 'Migration 730 complete - calibration workflow storage ensured' AS status;
