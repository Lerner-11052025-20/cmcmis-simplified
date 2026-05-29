-- ============================================================================
-- CMCMIS_SIMPLIFIED - Migration 740
-- Purpose: Add the dedicated repair Job Card workflow storage for both
--          TME and FPE repair cards.
--
-- Additive only: existing calibration workflow columns and legacy repair
-- columns remain untouched. These fields mirror the new repair workflow UI and
-- keep values PDF/certificate-ready.
-- ============================================================================

SET NAMES utf8mb4;
SET sql_mode = 'STRICT_TRANS_TABLES';

ALTER TABLE `cmms_jobcard_mst`
  ADD COLUMN IF NOT EXISTS `repair_accessory_selected` VARCHAR(120) NULL
    COMMENT 'Repair workflow: accessory selected from received list',
  ADD COLUMN IF NOT EXISTS `repair_job_received_date` DATE NULL
    COMMENT 'Repair workflow: job received date',
  ADD COLUMN IF NOT EXISTS `repair_job_start_planned_date` DATE NULL
    COMMENT 'Repair workflow: planned job start date',
  ADD COLUMN IF NOT EXISTS `repair_maintenance_type` VARCHAR(120) NULL
    COMMENT 'Repair workflow: maintenance type',
  ADD COLUMN IF NOT EXISTS `repair_faulty_section` VARCHAR(120) NULL
    COMMENT 'Repair workflow: primary faulty section',
  ADD COLUMN IF NOT EXISTS `repair_fault_category` VARCHAR(120) NULL
    COMMENT 'Repair workflow: fault category',
  ADD COLUMN IF NOT EXISTS `repair_attended_by_employee_id` VARCHAR(7) NULL
    COMMENT 'Repair workflow: employee id of engineer who attended',
  ADD COLUMN IF NOT EXISTS `repair_fault_description` TEXT NULL
    COMMENT 'Repair workflow: maintenance fault description',
  ADD COLUMN IF NOT EXISTS `repair_action_taken_description` TEXT NULL
    COMMENT 'Repair workflow: action taken description',
  ADD COLUMN IF NOT EXISTS `repair_sent_to_cal_lab_on` DATE NULL
    COMMENT 'Repair workflow: sent to calibration lab date',
  ADD COLUMN IF NOT EXISTS `repair_equipment_received_from_cal_lab` DATE NULL
    COMMENT 'Repair workflow: equipment received from calibration lab date',
  ADD COLUMN IF NOT EXISTS `repair_job_complete_date` DATE NULL
    COMMENT 'Repair workflow: job complete date',
  ADD COLUMN IF NOT EXISTS `repair_status` VARCHAR(80) NULL
    COMMENT 'Repair workflow: repair status',
  ADD COLUMN IF NOT EXISTS `repair_not_repairable_reason` VARCHAR(255) NULL
    COMMENT 'Repair workflow: not repairable reason',
  ADD COLUMN IF NOT EXISTS `repair_remarks` TEXT NULL
    COMMENT 'Repair workflow: maintenance remarks',
  ADD COLUMN IF NOT EXISTS `repair_sent_to_store_on` DATE NULL
    COMMENT 'Repair workflow: sent to store date',
  ADD COLUMN IF NOT EXISTS `repair_store_ref_number` VARCHAR(120) NULL
    COMMENT 'Repair workflow: store reference number',
  ADD COLUMN IF NOT EXISTS `repair_transport_charge` DECIMAL(12,2) NULL
    COMMENT 'Repair workflow: transport charge in rupees',
  ADD COLUMN IF NOT EXISTS `repair_invoice_cleared_on` DATE NULL
    COMMENT 'Repair workflow: invoice cleared date',
  ADD COLUMN IF NOT EXISTS `repair_fault_analysis_description` TEXT NULL
    COMMENT 'Repair workflow: fault analysis description',
  ADD COLUMN IF NOT EXISTS `repair_fault_analysis_action_taken` TEXT NULL
    COMMENT 'Repair workflow: fault analysis action taken',
  ADD COLUMN IF NOT EXISTS `repair_fault_analysis_sections` TEXT NULL
    COMMENT 'Repair workflow: selected faulty sections for analysis',
  ADD COLUMN IF NOT EXISTS `repair_fault_analysis_category` VARCHAR(120) NULL
    COMMENT 'Repair workflow: fault analysis category';

CREATE TABLE IF NOT EXISTS `jc_repair_equipment_used` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `jc_section_no` VARCHAR(9) NOT NULL,
  `sr_no` SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  `equipment_id` VARCHAR(100) NULL,
  `equipment_name` VARCHAR(255) NULL,
  `created_by_employee_id` VARCHAR(7) NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  KEY `idx_jreu_jc` (`jc_section_no`, `sr_no`),
  CONSTRAINT `fk_jreu_jc` FOREIGN KEY (`jc_section_no`) REFERENCES `cmms_jobcard_mst`(`JM_SectionJobNo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci
  COMMENT='Repair workflow: equipments/tools used for repair';

UPDATE `cmms_jobcard_mst`
   SET `repair_job_received_date` = COALESCE(`repair_job_received_date`, DATE(`JM_JCRecdDate`)),
       `repair_job_start_planned_date` = COALESCE(`repair_job_start_planned_date`, DATE(`JM_PlannedStartDate`))
 WHERE `JM_JOB_TYPE` = 'REPAIR';

SELECT 'Migration 740 complete - repair workflow storage ensured' AS status;
