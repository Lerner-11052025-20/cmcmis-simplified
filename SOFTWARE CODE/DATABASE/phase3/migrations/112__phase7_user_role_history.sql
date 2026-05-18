-- ════════════════════════════════════════════════════════════════════
-- CMCMIS_SIMPLIFIED — Migration 112 (Phase 7 Slice 1)
-- File:     112__phase7_user_role_history.sql
-- Purpose:  Create the user_role_history audit-grade transition table.
--
--           Every role change, activate, deactivate, force-logout writes
--           exactly ONE row here inside the same transaction as the
--           UPDATE (Doctrine 6 — audit pairing).
--
-- IDEMPOTENT: CREATE TABLE IF NOT EXISTS.
-- ════════════════════════════════════════════════════════════════════

SET NAMES utf8mb4;
SET sql_mode = 'STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';

CREATE TABLE IF NOT EXISTS `user_role_history` (
  `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT
                  COMMENT 'Phase 7: row id',
  `user_id`       BIGINT UNSIGNED NOT NULL
                  COMMENT 'FK → users.user_id (the row being changed)',
  `from_role`     VARCHAR(30)     NULL DEFAULT NULL
                  COMMENT 'roles.role_code BEFORE the change (NULL on CREATE)',
  `to_role`       VARCHAR(30)     NOT NULL
                  COMMENT 'roles.role_code AFTER the change',
  `from_active`   TINYINT(1)      NULL DEFAULT NULL,
  `to_active`     TINYINT(1)      NOT NULL,
  `action`        ENUM(
                    'CHANGE_ROLE',
                    'ACTIVATE',
                    'DEACTIVATE',
                    'CREATE',
                    'FORCE_LOGOUT'
                  ) NOT NULL,
  `reason`        VARCHAR(500)    NULL DEFAULT NULL
                  COMMENT 'Required ≥5 chars on DEACTIVATE (Q-3); optional on others (Q-4)',
  `actor_user_id` BIGINT UNSIGNED NOT NULL
                  COMMENT 'The Super Admin who performed the action',
  `created_at`    DATETIME(6)     NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_urh_user`
    FOREIGN KEY (`user_id`)       REFERENCES `users` (`user_id`),
  CONSTRAINT `fk_urh_actor`
    FOREIGN KEY (`actor_user_id`) REFERENCES `users` (`user_id`),
  INDEX `idx_urh_user` (`user_id`, `created_at` DESC),
  INDEX `idx_urh_actor` (`actor_user_id`, `created_at` DESC),
  INDEX `idx_urh_action` (`action`, `created_at` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci
  COMMENT='Phase 7: append-only role/status transition history';


-- Verify
SELECT
  CONCAT('✓ Migration 112 complete — user_role_history ',
         CASE WHEN (SELECT COUNT(*) FROM information_schema.tables
                     WHERE table_schema=DATABASE()
                       AND table_name='user_role_history') = 1
              THEN 'present' ELSE 'MISSING' END) AS result;
