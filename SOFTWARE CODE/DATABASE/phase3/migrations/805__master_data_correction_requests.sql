SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS `master_data_correction_requests` (
  `request_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `status` ENUM('SUBMITTED','APPROVED','REJECTED') NOT NULL DEFAULT 'SUBMITTED',

  `eqm_type` VARCHAR(25) NOT NULL,
  `eqm_id` INT NOT NULL,
  `equipment_name` VARCHAR(200) NOT NULL,
  `current_division_id` INT NULL DEFAULT NULL,
  `current_division_code` VARCHAR(80) NULL DEFAULT NULL,
  `current_division_name` VARCHAR(200) NULL DEFAULT NULL,
  `proposed_division_id` INT NOT NULL,
  `proposed_division_code` VARCHAR(80) NOT NULL,
  `proposed_division_name` VARCHAR(200) NULL DEFAULT NULL,

  `submitted_by_employee_id` VARCHAR(7) NOT NULL,
  `submitted_by_name` VARCHAR(120) NOT NULL,
  `submitted_by_designation` VARCHAR(160) NULL DEFAULT NULL,
  `submitted_by_email` VARCHAR(160) NULL DEFAULT NULL,
  `submitted_by_lab_phone` VARCHAR(60) NULL DEFAULT NULL,
  `submitted_by_room_phone` VARCHAR(60) NULL DEFAULT NULL,
  `submitted_by_egd_name` VARCHAR(120) NULL DEFAULT NULL,
  `submitted_by_subsystem` VARCHAR(120) NULL DEFAULT NULL,

  `sec_head_employee_id` VARCHAR(7) NULL DEFAULT NULL,
  `sec_head_name` VARCHAR(120) NULL DEFAULT NULL,
  `sec_head_designation` VARCHAR(160) NULL DEFAULT NULL,
  `div_head_employee_id` VARCHAR(7) NULL DEFAULT NULL,
  `div_head_name` VARCHAR(120) NULL DEFAULT NULL,
  `div_head_designation` VARCHAR(160) NULL DEFAULT NULL,
  `group_head_employee_id` VARCHAR(7) NULL DEFAULT NULL,
  `group_head_name` VARCHAR(120) NULL DEFAULT NULL,
  `group_head_designation` VARCHAR(160) NULL DEFAULT NULL,
  `entity_head_employee_id` VARCHAR(7) NULL DEFAULT NULL,
  `entity_head_name` VARCHAR(120) NULL DEFAULT NULL,
  `entity_head_designation` VARCHAR(160) NULL DEFAULT NULL,
  `centre_head_employee_id` VARCHAR(7) NULL DEFAULT NULL,
  `centre_head_name` VARCHAR(120) NULL DEFAULT NULL,
  `centre_head_designation` VARCHAR(160) NULL DEFAULT NULL,

  `reason` TEXT NULL,
  `review_notes` TEXT NULL,
  `reviewed_by_employee_id` VARCHAR(7) NULL DEFAULT NULL,
  `reviewed_by_role` VARCHAR(40) NULL DEFAULT NULL,
  `reviewed_at` DATETIME(6) NULL DEFAULT NULL,

  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `raw_payload` JSON NULL,

  PRIMARY KEY (`request_id`),
  KEY `idx_mdc_status_created` (`status`, `created_at`),
  KEY `idx_mdc_submitter` (`submitted_by_employee_id`, `created_at`),
  KEY `idx_mdc_equipment` (`eqm_type`, `eqm_id`),
  KEY `idx_mdc_proposed_division` (`proposed_division_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='SSO master data correction requests for equipment division mismatch.';

SELECT 'Migration 805 complete - master data correction requests ready' AS status;
