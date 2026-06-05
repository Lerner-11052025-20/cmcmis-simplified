-- ============================================================================
-- CMCMIS_SIMPLIFIED - Migration 800
-- Purpose: Create isolated SSO identity tables without touching users/user_roles
-- ============================================================================

SET NAMES utf8;
SET time_zone = '+00:00';
SET foreign_key_checks = 1;
SET sql_mode = 'STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';

CREATE TABLE IF NOT EXISTS `employee_sso_directory` (
  `sso_user_id`       BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `employee_id`       VARCHAR(7)      NOT NULL,
  `email`             VARCHAR(150)    NULL DEFAULT NULL,
  `full_name`         VARCHAR(150)    NOT NULL,
  `egd_name`          VARCHAR(100)    NULL DEFAULT NULL,
  `designation`       VARCHAR(200)    NULL DEFAULT NULL,
  `telephone`         VARCHAR(100)    NULL DEFAULT NULL,
  `lab_telephone`     VARCHAR(100)    NULL DEFAULT NULL,
  `is_active`         TINYINT(1)      NOT NULL DEFAULT 1,
  `last_sso_login_at` DATETIME(6)     NULL DEFAULT NULL,
  `last_sso_login_ip` VARCHAR(45)     NULL DEFAULT NULL,
  `source_batch`      VARCHAR(80)     NULL DEFAULT NULL,
  `raw_payload`       JSON            NULL DEFAULT NULL,
  `created_at`        DATETIME(6)     NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by`        VARCHAR(20)     NULL DEFAULT NULL,
  `updated_at`        DATETIME(6)     NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
                                      ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by`        VARCHAR(20)     NULL DEFAULT NULL,
  PRIMARY KEY (`sso_user_id`),
  UNIQUE KEY `uk_sso_employee_id` (`employee_id`),
  UNIQUE KEY `uk_sso_email` (`email`),
  INDEX `idx_sso_active` (`is_active`),
  INDEX `idx_sso_egd` (`egd_name`),
  INDEX `idx_sso_name` (`full_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci
  COMMENT='SSO employee directory. Separate from users; Employee ID popup now, email callback later.';

CREATE TABLE IF NOT EXISTS `sso_user_roles` (
  `sso_user_id` BIGINT UNSIGNED  NOT NULL,
  `role_id`     TINYINT UNSIGNED NOT NULL,
  `assigned_at` DATETIME(6)      NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `assigned_by` VARCHAR(20)      NULL DEFAULT NULL,
  PRIMARY KEY (`sso_user_id`),
  CONSTRAINT `fk_sur_sso_user`
    FOREIGN KEY (`sso_user_id`) REFERENCES `employee_sso_directory` (`sso_user_id`)
    ON DELETE CASCADE,
  CONSTRAINT `fk_sur_role`
    FOREIGN KEY (`role_id`) REFERENCES `roles` (`role_id`),
  INDEX `idx_sur_role` (`role_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci
  COMMENT='Exactly one app role per SSO user; reuses roles and permissions only.';

SELECT 'Migration 800 complete: SSO directory tables created' AS status;
