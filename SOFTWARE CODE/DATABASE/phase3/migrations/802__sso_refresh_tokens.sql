-- ============================================================================
-- CMCMIS_SIMPLIFIED - Migration 802
-- Purpose: Store refresh tokens for SSO users without touching refresh_tokens
-- ============================================================================

SET NAMES utf8;
SET time_zone = '+00:00';
SET foreign_key_checks = 1;
SET sql_mode = 'STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';

CREATE TABLE IF NOT EXISTS `sso_refresh_tokens` (
  `token_id`       BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `sso_user_id`    BIGINT UNSIGNED NOT NULL,
  `token_hash`     VARCHAR(64)     NOT NULL,
  `issued_at`      DATETIME(6)     NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `expires_at`     DATETIME(6)     NOT NULL,
  `revoked_at`     DATETIME(6)     NULL DEFAULT NULL,
  `revoked_reason` ENUM('LOGOUT','ROTATED','ADMIN_REVOKE','EXPIRY_CLEANUP')
                   NULL DEFAULT NULL,
  `user_agent`     VARCHAR(500)    NULL DEFAULT NULL,
  `ip_address`     VARCHAR(45)     NULL DEFAULT NULL,
  PRIMARY KEY (`token_id`),
  UNIQUE KEY `uk_sso_rt_hash` (`token_hash`),
  CONSTRAINT `fk_sso_rt_user`
    FOREIGN KEY (`sso_user_id`) REFERENCES `employee_sso_directory` (`sso_user_id`)
    ON DELETE CASCADE,
  INDEX `idx_sso_rt_user_expires` (`sso_user_id`, `expires_at`),
  INDEX `idx_sso_rt_expires` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci
  COMMENT='SSO refresh token store. Separate from refresh_tokens because users table is untouched.';

SELECT 'Migration 802 complete: SSO refresh token table created' AS status;
