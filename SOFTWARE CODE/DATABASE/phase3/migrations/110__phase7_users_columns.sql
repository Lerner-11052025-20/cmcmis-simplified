-- ════════════════════════════════════════════════════════════════════
-- CMCMIS_SIMPLIFIED — Migration 110 (Phase 7 Slice 1)
-- File:     110__phase7_users_columns.sql
-- Purpose:  Additive columns on `users` for the Admin module:
--             - token_version              (D-7.2 real-time revocation)
--             - deactivated_at             (audit timestamp)
--             - deactivated_by_user_id     (the acting SA)
--             - deactivation_reason        (required ≥5 chars; Q-3)
--
-- ADD-only. No DROP, no MODIFY. Idempotent via information_schema guards.
-- Pattern inherited from Phase 6 migrations 100/102.
-- ════════════════════════════════════════════════════════════════════

SET NAMES utf8mb4;
SET sql_mode = 'STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';

-- ── 110.1  users.token_version  (D-7.2) ────────────────────────────
-- Stateful versioning for stateless JWTs. Every role / status / force-
-- logout mutation atomically bumps this; authenticate middleware compares
-- the JWT claim against the cached current value and rejects on mismatch.
SET @c := (SELECT COUNT(*) FROM information_schema.columns
            WHERE table_schema=DATABASE() AND table_name='users'
              AND column_name='token_version');
SET @sql := IF(@c>0, 'SELECT 1',
  "ALTER TABLE `users`
     ADD COLUMN `token_version` INT UNSIGNED NOT NULL DEFAULT 1
     COMMENT 'Phase 7: bumped on role/status/force-logout for JWT revocation'");
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;


-- ── 110.2  users.deactivated_at ────────────────────────────────────
SET @c := (SELECT COUNT(*) FROM information_schema.columns
            WHERE table_schema=DATABASE() AND table_name='users'
              AND column_name='deactivated_at');
SET @sql := IF(@c>0, 'SELECT 1',
  "ALTER TABLE `users`
     ADD COLUMN `deactivated_at` DATETIME(6) NULL DEFAULT NULL
     COMMENT 'Phase 7: when SA flipped is_active 1→0'");
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;


-- ── 110.3  users.deactivated_by_user_id ────────────────────────────
SET @c := (SELECT COUNT(*) FROM information_schema.columns
            WHERE table_schema=DATABASE() AND table_name='users'
              AND column_name='deactivated_by_user_id');
SET @sql := IF(@c>0, 'SELECT 1',
  "ALTER TABLE `users`
     ADD COLUMN `deactivated_by_user_id` BIGINT UNSIGNED NULL DEFAULT NULL
     COMMENT 'Phase 7: user_id of the SA who deactivated this row'");
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;


-- ── 110.4  users.deactivation_reason ───────────────────────────────
SET @c := (SELECT COUNT(*) FROM information_schema.columns
            WHERE table_schema=DATABASE() AND table_name='users'
              AND column_name='deactivation_reason');
SET @sql := IF(@c>0, 'SELECT 1',
  "ALTER TABLE `users`
     ADD COLUMN `deactivation_reason` VARCHAR(500) NULL DEFAULT NULL
     COMMENT 'Phase 7: required ≥5 chars (Q-3) when deactivating'");
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;


-- ── 110.5  cmms_emp_mst.EMM_DEACTIVATED_AT  (soft-delete timestamp) ─
-- Per P7-D7: keep EMM_INACTIVE as the active-flag (legacy); add a
-- timestamp for audit so we can answer "when was this employee
-- soft-deleted?" in the activity timeline.
SET @c := (SELECT COUNT(*) FROM information_schema.columns
            WHERE table_schema=DATABASE() AND table_name='cmms_emp_mst'
              AND column_name='EMM_DEACTIVATED_AT');
SET @sql := IF(@c>0, 'SELECT 1',
  "ALTER TABLE `cmms_emp_mst`
     ADD COLUMN `EMM_DEACTIVATED_AT` DATETIME(6) NULL DEFAULT NULL
     COMMENT 'Phase 7: when this employee was soft-deleted (EMM_INACTIVE flipped 0→1)'");
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;


-- ── 110.6  Verify ──────────────────────────────────────────────────
SELECT
  CONCAT('✓ Migration 110 complete — added ',
         SUM(CASE WHEN column_name IN
             ('token_version','deactivated_at','deactivated_by_user_id','deactivation_reason')
             THEN 1 ELSE 0 END),
         ' / 4 Phase-7 columns on users') AS result
  FROM information_schema.columns
 WHERE table_schema=DATABASE() AND table_name='users';

SELECT
  CONCAT('✓ cmms_emp_mst.EMM_DEACTIVATED_AT — ',
         CASE WHEN COUNT(*)=1 THEN 'present' ELSE 'MISSING' END) AS result
  FROM information_schema.columns
 WHERE table_schema=DATABASE() AND table_name='cmms_emp_mst'
   AND column_name='EMM_DEACTIVATED_AT';
