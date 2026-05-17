-- CMCMIS_SIMPLIFIED — Migration 099 (FIXED for MariaDB + mysql2)
-- Removed DELIMITER/stored procedure. Uses SET+PREPARE+EXECUTE pattern.
-- Idempotent: only renames if old exists AND new doesn't.

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ── ORPHAN / BACKUP TABLES (8) ───────────────────────────────────
SET @oe := (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='cf001');
SET @ne := (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='_legacy_cf001');
SET @sql := IF(@oe=1 AND @ne=0, 'RENAME TABLE `cf001` TO `_legacy_cf001`', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @oe := (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='cf002');
SET @ne := (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='_legacy_cf002');
SET @sql := IF(@oe=1 AND @ne=0, 'RENAME TABLE `cf002` TO `_legacy_cf002`', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @oe := (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='cf003');
SET @ne := (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='_legacy_cf003');
SET @sql := IF(@oe=1 AND @ne=0, 'RENAME TABLE `cf003` TO `_legacy_cf003`', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @oe := (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='cf004');
SET @ne := (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='_legacy_cf004');
SET @sql := IF(@oe=1 AND @ne=0, 'RENAME TABLE `cf004` TO `_legacy_cf004`', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @oe := (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='chklistvendor');
SET @ne := (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='_legacy_chklistvendor');
SET @sql := IF(@oe=1 AND @ne=0, 'RENAME TABLE `chklistvendor` TO `_legacy_chklistvendor`', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @oe := (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='cmms_parameter_master_bkp');
SET @ne := (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='_legacy_parameter_master_bkp');
SET @sql := IF(@oe=1 AND @ne=0, 'RENAME TABLE `cmms_parameter_master_bkp` TO `_legacy_parameter_master_bkp`', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @oe := (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='cmms_parameter_master_jun2016');
SET @ne := (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='_legacy_parameter_master_jun2016');
SET @sql := IF(@oe=1 AND @ne=0, 'RENAME TABLE `cmms_parameter_master_jun2016` TO `_legacy_parameter_master_jun2016`', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @oe := (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='cmms_parameter_master_incharge');
SET @ne := (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='_legacy_parameter_master_incharge');
SET @sql := IF(@oe=1 AND @ne=0, 'RENAME TABLE `cmms_parameter_master_incharge` TO `_legacy_parameter_master_incharge`', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- ── DEAD / EMPTY LEGACY TABLES (2) ───────────────────────────────
SET @oe := (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='cmms_cal_jobcard_feedback_spec');
SET @ne := (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='_legacy_cal_jobcard_feedback_spec');
SET @sql := IF(@oe=1 AND @ne=0, 'RENAME TABLE `cmms_cal_jobcard_feedback_spec` TO `_legacy_cal_jobcard_feedback_spec`', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @oe := (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='cmms_jobcard_insp_maint_dtl');
SET @ne := (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='_legacy_jobcard_insp_maint_dtl');
SET @sql := IF(@oe=1 AND @ne=0, 'RENAME TABLE `cmms_jobcard_insp_maint_dtl` TO `_legacy_jobcard_insp_maint_dtl`', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- ── OLD RBAC TABLES — INCOMPATIBLE WITH MVP 3-LAYER RBAC (5) ─────
SET @oe := (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='cmms_accessright_mst');
SET @ne := (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='_legacy_accessright_mst');
SET @sql := IF(@oe=1 AND @ne=0, 'RENAME TABLE `cmms_accessright_mst` TO `_legacy_accessright_mst`', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @oe := (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='cmms_module_mst');
SET @ne := (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='_legacy_module_mst');
SET @sql := IF(@oe=1 AND @ne=0, 'RENAME TABLE `cmms_module_mst` TO `_legacy_module_mst`', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @oe := (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='cmms_role_mst');
SET @ne := (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='_legacy_role_mst');
SET @sql := IF(@oe=1 AND @ne=0, 'RENAME TABLE `cmms_role_mst` TO `_legacy_role_mst`', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @oe := (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='cmms_section_user_mst');
SET @ne := (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='_legacy_section_user_mst');
SET @sql := IF(@oe=1 AND @ne=0, 'RENAME TABLE `cmms_section_user_mst` TO `_legacy_section_user_mst`', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @oe := (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='cmms_userrole_mst');
SET @ne := (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='_legacy_userrole_mst');
SET @sql := IF(@oe=1 AND @ne=0, 'RENAME TABLE `cmms_userrole_mst` TO `_legacy_userrole_mst`', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- ── Audit marker (idempotent) ────────────────────────────────────
SELECT COUNT(*) INTO @legacy_audit_done
  FROM `audit_log`
 WHERE `action` = 'LEGACY_ISOLATED' COLLATE utf8mb4_unicode_ci
   AND `entity_id` = 'phase3-v2.0' COLLATE utf8mb4_unicode_ci;

SET @sql := IF(@legacy_audit_done > 0, 'SELECT 1',
  'INSERT INTO `audit_log`
     (`actor_employee_id`, `actor_role_code`, `action`,
      `entity_type`, `entity_id`, `occurred_at`, `notes`)
   VALUES (''BOOTSTRAP'', ''BOOTSTRAP'', ''LEGACY_ISOLATED'',
           ''system'', ''phase3-v2.0'', NOW(6),
           ''15 legacy/orphan tables renamed to _legacy_* prefix'')');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SELECT '✓ Migration 099 complete' AS status;