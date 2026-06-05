-- ============================================================================
-- CMCMIS_SIMPLIFIED - Migration 803
-- Purpose: Create SSO employee hierarchy/head mapping table
-- ============================================================================

SET NAMES utf8;
SET time_zone = '+00:00';
SET foreign_key_checks = 1;
SET sql_mode = 'STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';

CREATE TABLE IF NOT EXISTS `employee_sso_heads` (
  `id`                      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `employee_id`             VARCHAR(7)      NOT NULL,
  `sec_head_employee_id`    VARCHAR(7)      NULL DEFAULT NULL,
  `div_head_employee_id`    VARCHAR(7)      NULL DEFAULT NULL,
  `group_head_employee_id`  VARCHAR(7)      NULL DEFAULT NULL,
  `entity_head_employee_id` VARCHAR(7)      NULL DEFAULT NULL,
  `centre_head_employee_id` VARCHAR(7)      NULL DEFAULT NULL,
  `update_date`             DATE            NULL DEFAULT NULL,
  `source_batch`            VARCHAR(80)     NULL DEFAULT NULL,
  `source_row_no`           INT UNSIGNED    NOT NULL,
  `created_at`              DATETIME(6)     NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at`              DATETIME(6)     NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
                                                ON UPDATE CURRENT_TIMESTAMP(6),
  `raw_payload`             JSON            NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_sso_heads_source_row` (`source_batch`, `source_row_no`),
  INDEX `idx_sso_heads_employee` (`employee_id`),
  INDEX `idx_sso_heads_sec_head` (`sec_head_employee_id`),
  INDEX `idx_sso_heads_div_head` (`div_head_employee_id`),
  INDEX `idx_sso_heads_group_head` (`group_head_employee_id`),
  INDEX `idx_sso_heads_entity_head` (`entity_head_employee_id`),
  INDEX `idx_sso_heads_centre_head` (`centre_head_employee_id`),
  INDEX `idx_sso_heads_update_date` (`update_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci
  COMMENT='SSO organization hierarchy heads. Employee ID is indexed, not unique, because source has multiple rows per employee.';

SELECT 'Migration 803 complete: employee_sso_heads created' AS status;
