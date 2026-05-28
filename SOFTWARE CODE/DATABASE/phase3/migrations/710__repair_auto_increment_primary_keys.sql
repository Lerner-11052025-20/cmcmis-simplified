-- ============================================================================
-- CMCMIS_SIMPLIFIED - Migration 710
-- Purpose: Repair app-owned numeric primary keys that drifted without
--          AUTO_INCREMENT in the live database.
--
-- Symptom fixed:
--   Duplicate entry '0' for key 'PRIMARY'
--
-- Why:
--   Runtime INSERT statements intentionally omit surrogate primary keys on
--   audit/history/master rows. If the live table was created before the final
--   migration definition, MySQL supplies 0 for the omitted numeric PK and the
--   second insert fails.
-- ============================================================================

SET NAMES utf8mb4;
SET sql_mode = 'STRICT_TRANS_TABLES';

-- Existing bad row repair: one historical user_role_history row was inserted
-- with id=0. Move it above the current max before enabling AUTO_INCREMENT.
SET @urh_zero_count := (
  SELECT COUNT(*) FROM `user_role_history` WHERE `id` = 0
);
SET @urh_next_id := (
  SELECT COALESCE(MAX(`id`), 0) + 1 FROM `user_role_history` WHERE `id` <> 0
);
SET @ddl := IF(
  @urh_zero_count > 0,
  CONCAT('UPDATE `user_role_history` SET `id` = ', @urh_next_id, ' WHERE `id` = 0'),
  'SELECT ''skip: no user_role_history id=0 row'' AS note'
);
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Helper pattern repeated per table: only ALTER when the column exists and is
-- not already AUTO_INCREMENT. This keeps the repair idempotent.

SET @needs_ai := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'users'
     AND COLUMN_NAME = 'user_id'
     AND EXTRA NOT LIKE '%auto_increment%'
);
SET @ddl := IF(
  @needs_ai > 0,
  'ALTER TABLE `users` MODIFY COLUMN `user_id` BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT',
  'SELECT ''skip: users.user_id already auto_increment'' AS note'
);
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @needs_ai := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'user_role_history'
     AND COLUMN_NAME = 'id'
     AND EXTRA NOT LIKE '%auto_increment%'
);
SET @ddl := IF(
  @needs_ai > 0,
  'ALTER TABLE `user_role_history` MODIFY COLUMN `id` BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT ''Phase 7: row id''',
  'SELECT ''skip: user_role_history.id already auto_increment'' AS note'
);
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @needs_ai := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'schedules'
     AND COLUMN_NAME = 'id'
     AND EXTRA NOT LIKE '%auto_increment%'
);
SET @ddl := IF(
  @needs_ai > 0,
  'ALTER TABLE `schedules` MODIFY COLUMN `id` BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT',
  'SELECT ''skip: schedules.id already auto_increment'' AS note'
);
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @needs_ai := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'schedule_status_history'
     AND COLUMN_NAME = 'id'
     AND EXTRA NOT LIKE '%auto_increment%'
);
SET @ddl := IF(
  @needs_ai > 0,
  'ALTER TABLE `schedule_status_history` MODIFY COLUMN `id` BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT',
  'SELECT ''skip: schedule_status_history.id already auto_increment'' AS note'
);
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @needs_ai := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'spare_parts'
     AND COLUMN_NAME = 'id'
     AND EXTRA NOT LIKE '%auto_increment%'
);
SET @ddl := IF(
  @needs_ai > 0,
  'ALTER TABLE `spare_parts` MODIFY COLUMN `id` BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT',
  'SELECT ''skip: spare_parts.id already auto_increment'' AS note'
);
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @needs_ai := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'purchase_order_items'
     AND COLUMN_NAME = 'id'
     AND EXTRA NOT LIKE '%auto_increment%'
);
SET @ddl := IF(
  @needs_ai > 0,
  'ALTER TABLE `purchase_order_items` MODIFY COLUMN `id` BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT',
  'SELECT ''skip: purchase_order_items.id already auto_increment'' AS note'
);
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @needs_ai := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'task_library'
     AND COLUMN_NAME = 'id'
     AND EXTRA NOT LIKE '%auto_increment%'
);
SET @ddl := IF(
  @needs_ai > 0,
  'ALTER TABLE `task_library` MODIFY COLUMN `id` BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT',
  'SELECT ''skip: task_library.id already auto_increment'' AS note'
);
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE, EXTRA
  FROM information_schema.COLUMNS
 WHERE TABLE_SCHEMA = DATABASE()
   AND (
     (TABLE_NAME = 'users' AND COLUMN_NAME = 'user_id')
     OR (TABLE_NAME IN (
       'user_role_history',
       'schedules',
       'schedule_status_history',
       'spare_parts',
       'purchase_order_items',
       'task_library'
     ) AND COLUMN_NAME = 'id')
   )
 ORDER BY TABLE_NAME, COLUMN_NAME;
