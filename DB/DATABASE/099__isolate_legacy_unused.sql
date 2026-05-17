-- ════════════════════════════════════════════════════════════════════
-- CMCMIS_SIMPLIFIED — Migration 099
-- File:     099__isolate_legacy_unused.sql
-- Purpose:  Rename 11 unused legacy tables to `_legacy_*` prefix so the
--           MVP runtime cannot accidentally read from them.
-- Per:      v2.0 §3 (Naming Conventions), §14 (Master Inventory)
-- Idempotent: YES — only renames if target name doesn't already exist
-- ════════════════════════════════════════════════════════════════════

SET NAMES utf8mb4;

DROP PROCEDURE IF EXISTS `_cmcmis_safe_rename`;

DELIMITER //

CREATE PROCEDURE `_cmcmis_safe_rename`(
  IN p_old_name VARCHAR(64),
  IN p_new_name VARCHAR(64)
)
BEGIN
  DECLARE v_old_exists INT DEFAULT 0;
  DECLARE v_new_exists INT DEFAULT 0;

  SELECT COUNT(*) INTO v_old_exists
    FROM information_schema.tables
   WHERE table_schema = DATABASE() AND table_name = p_old_name;

  SELECT COUNT(*) INTO v_new_exists
    FROM information_schema.tables
   WHERE table_schema = DATABASE() AND table_name = p_new_name;

  IF v_old_exists = 1 AND v_new_exists = 0 THEN
    SET @stmt := CONCAT('RENAME TABLE `', p_old_name, '` TO `', p_new_name, '`');
    PREPARE r FROM @stmt;
    EXECUTE r;
    DEALLOCATE PREPARE r;
    SELECT CONCAT('  [RENAMED] ', p_old_name, ' → ', p_new_name) AS step;
  ELSEIF v_new_exists = 1 THEN
    SELECT CONCAT('  [SKIPPED] ', p_new_name, ' already exists') AS step;
  ELSE
    SELECT CONCAT('  [SKIPPED] ', p_old_name, ' does not exist') AS step;
  END IF;
END //

DELIMITER ;


-- ────────────────────────────────────────────────────────────────────
-- ORPHAN / BACKUP TABLES (7)
-- ────────────────────────────────────────────────────────────────────
CALL `_cmcmis_safe_rename`('cf001',                         '_legacy_cf001');
CALL `_cmcmis_safe_rename`('cf002',                         '_legacy_cf002');
CALL `_cmcmis_safe_rename`('cf003',                         '_legacy_cf003');
CALL `_cmcmis_safe_rename`('cf004',                         '_legacy_cf004');
CALL `_cmcmis_safe_rename`('chklistvendor',                 '_legacy_chklistvendor');
CALL `_cmcmis_safe_rename`('cmms_parameter_master_bkp',     '_legacy_parameter_master_bkp');
CALL `_cmcmis_safe_rename`('cmms_parameter_master_jun2016', '_legacy_parameter_master_jun2016');
CALL `_cmcmis_safe_rename`('cmms_parameter_master_incharge','_legacy_parameter_master_incharge');


-- ────────────────────────────────────────────────────────────────────
-- DEAD / EMPTY LEGACY TABLES (2)
-- ────────────────────────────────────────────────────────────────────
CALL `_cmcmis_safe_rename`('cmms_cal_jobcard_feedback_spec','_legacy_cal_jobcard_feedback_spec');
CALL `_cmcmis_safe_rename`('cmms_jobcard_insp_maint_dtl',   '_legacy_jobcard_insp_maint_dtl');


-- ────────────────────────────────────────────────────────────────────
-- OLD RBAC TABLES — INCOMPATIBLE WITH MVP 3-LAYER RBAC (5)
-- These hold legacy data; renamed so MVP code cannot accidentally
-- read them; legacy data preserved per Constraint #2.
-- ────────────────────────────────────────────────────────────────────
CALL `_cmcmis_safe_rename`('cmms_accessright_mst',  '_legacy_accessright_mst');
CALL `_cmcmis_safe_rename`('cmms_module_mst',       '_legacy_module_mst');
CALL `_cmcmis_safe_rename`('cmms_role_mst',         '_legacy_role_mst');
CALL `_cmcmis_safe_rename`('cmms_section_user_mst', '_legacy_section_user_mst');
CALL `_cmcmis_safe_rename`('cmms_userrole_mst',     '_legacy_userrole_mst');


-- Clean up
DROP PROCEDURE IF EXISTS `_cmcmis_safe_rename`;


-- Audit marker
INSERT INTO `audit_log`
  (`actor_employee_id`, `actor_role_code`, `action`,
   `entity_type`, `entity_id`, `occurred_at`, `notes`)
SELECT
  'BOOTSTRAP', 'BOOTSTRAP', 'LEGACY_ISOLATED',
  'system', 'phase3-v2.0', NOW(6),
  '15 legacy/orphan tables renamed to _legacy_* prefix'
WHERE NOT EXISTS (
  SELECT 1 FROM `audit_log` WHERE `action` = 'LEGACY_ISOLATED' AND `entity_id` = 'phase3-v2.0'
);


-- Verify
SELECT '✓ Migration 099 complete' AS status;
SELECT TABLE_NAME, TABLE_ROWS
  FROM information_schema.TABLES
 WHERE TABLE_SCHEMA = DATABASE()
   AND TABLE_NAME LIKE '\\_legacy\\_%'
 ORDER BY TABLE_NAME;
