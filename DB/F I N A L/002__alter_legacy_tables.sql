-- CMCMIS_SIMPLIFIED — Migration 002 (FIXED for MariaDB + mysql2)
-- Removed DELIMITER/stored procedure. Uses SET+PREPARE+EXECUTE instead.
-- Idempotent: YES

SET NAMES utf8mb4;
SET sql_mode = 'STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';

-- ── 2.1 cmms_emp_mst ─────────────────────────────────────────────
SET @i := (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema=DATABASE() AND table_name='cmms_emp_mst' AND index_name='idx_emm_active');
SET @sql := IF(@i>0,'SELECT 1','ALTER TABLE `cmms_emp_mst` ADD INDEX `idx_emm_active` (`EMM_INACTIVE`)');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- ── 2.2 cmms_eqip_mst — columns ──────────────────────────────────
SET @c := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='cmms_eqip_mst' AND column_name='EQM_VERIFIED_BY');
SET @sql := IF(@c>0,'SELECT 1','ALTER TABLE `cmms_eqip_mst` ADD COLUMN `EQM_VERIFIED_BY` VARCHAR(7) NULL DEFAULT NULL');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @c := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='cmms_eqip_mst' AND column_name='EQM_VERIFIED_ON');
SET @sql := IF(@c>0,'SELECT 1','ALTER TABLE `cmms_eqip_mst` ADD COLUMN `EQM_VERIFIED_ON` DATETIME(6) NULL DEFAULT NULL');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @c := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='cmms_eqip_mst' AND column_name='EQM_MVP_STATUS');
SET @sql := IF(@c>0,'SELECT 1','ALTER TABLE `cmms_eqip_mst` ADD COLUMN `EQM_MVP_STATUS` ENUM(''PENDING_VERIFICATION'',''ACTIVE'',''UNDER_CALIBRATION'',''UNDER_REPAIR'',''OUT_OF_TOLERANCE'',''QUARANTINED'',''CONDEMNED'',''RETIRED'') NOT NULL DEFAULT ''PENDING_VERIFICATION''');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @c := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='cmms_eqip_mst' AND column_name='EQM_MVP_STATUS_AT');
SET @sql := IF(@c>0,'SELECT 1','ALTER TABLE `cmms_eqip_mst` ADD COLUMN `EQM_MVP_STATUS_AT` DATETIME(6) NULL DEFAULT NULL');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @c := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='cmms_eqip_mst' AND column_name='EQM_SECTION_ID');
SET @sql := IF(@c>0,'SELECT 1','ALTER TABLE `cmms_eqip_mst` ADD COLUMN `EQM_SECTION_ID` INT UNSIGNED NULL DEFAULT NULL');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- ── 2.2 cmms_eqip_mst — indexes ──────────────────────────────────
SET @i := (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema=DATABASE() AND table_name='cmms_eqip_mst' AND index_name='idx_eqip_mvp_status');
SET @sql := IF(@i>0,'SELECT 1','ALTER TABLE `cmms_eqip_mst` ADD INDEX `idx_eqip_mvp_status` (`EQM_MVP_STATUS`)');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @i := (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema=DATABASE() AND table_name='cmms_eqip_mst' AND index_name='idx_eqip_cal_due');
SET @sql := IF(@i>0,'SELECT 1','ALTER TABLE `cmms_eqip_mst` ADD INDEX `idx_eqip_cal_due` (`EQM_CAL_DUE_DATE`)');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @i := (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema=DATABASE() AND table_name='cmms_eqip_mst' AND index_name='idx_eqip_section_new');
SET @sql := IF(@i>0,'SELECT 1','ALTER TABLE `cmms_eqip_mst` ADD INDEX `idx_eqip_section_new` (`EQM_SECTION_ID`)');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @i := (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema=DATABASE() AND table_name='cmms_eqip_mst' AND index_name='idx_eqip_mfr');
SET @sql := IF(@i>0,'SELECT 1','ALTER TABLE `cmms_eqip_mst` ADD INDEX `idx_eqip_mfr` (`EQM_MFRID`)');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- ── 2.2 cmms_eqip_mst — FK ───────────────────────────────────────
SET @f := (SELECT COUNT(*) FROM information_schema.table_constraints WHERE table_schema=DATABASE() AND table_name='cmms_eqip_mst' AND constraint_name='fk_eqip_section_new' AND constraint_type='FOREIGN KEY');
SET @sql := IF(@f>0,'SELECT 1','ALTER TABLE `cmms_eqip_mst` ADD CONSTRAINT `fk_eqip_section_new` FOREIGN KEY (`EQM_SECTION_ID`) REFERENCES `sections` (`section_id`)');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- Backfill M7: existing equipment → ACTIVE
UPDATE `cmms_eqip_mst`
   SET `EQM_MVP_STATUS`    = 'ACTIVE',
       `EQM_MVP_STATUS_AT` = COALESCE(`EQM_UPDATED_ON`, `EQM_CREATED_ON`, NOW(6))
 WHERE `EQM_MVP_STATUS` = 'PENDING_VERIFICATION' AND `EQM_VERIFIED_ON` IS NULL;

-- ── 2.3 cmms_jobrequest_mst — columns ────────────────────────────
SET @c := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='cmms_jobrequest_mst' AND column_name='JR_MVP_STATUS');
SET @sql := IF(@c>0,'SELECT 1','ALTER TABLE `cmms_jobrequest_mst` ADD COLUMN `JR_MVP_STATUS` ENUM(''DRAFT'',''SUBMITTED'',''ASSIGNED'',''IN_PROGRESS'',''COMPLETED'',''VERIFIED_CLOSED'',''REJECTED'',''REOPENED'') NOT NULL DEFAULT ''DRAFT''');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @c := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='cmms_jobrequest_mst' AND column_name='JR_MVP_STATUS_AT');
SET @sql := IF(@c>0,'SELECT 1','ALTER TABLE `cmms_jobrequest_mst` ADD COLUMN `JR_MVP_STATUS_AT` DATETIME(6) NULL DEFAULT NULL');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @c := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='cmms_jobrequest_mst' AND column_name='JR_APPROVED_BY');
SET @sql := IF(@c>0,'SELECT 1','ALTER TABLE `cmms_jobrequest_mst` ADD COLUMN `JR_APPROVED_BY` VARCHAR(7) NULL DEFAULT NULL');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @c := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='cmms_jobrequest_mst' AND column_name='JR_APPROVED_ON');
SET @sql := IF(@c>0,'SELECT 1','ALTER TABLE `cmms_jobrequest_mst` ADD COLUMN `JR_APPROVED_ON` DATETIME(6) NULL DEFAULT NULL');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @c := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='cmms_jobrequest_mst' AND column_name='JR_REJECTED_BY');
SET @sql := IF(@c>0,'SELECT 1','ALTER TABLE `cmms_jobrequest_mst` ADD COLUMN `JR_REJECTED_BY` VARCHAR(7) NULL DEFAULT NULL');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @c := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='cmms_jobrequest_mst' AND column_name='JR_REJECTED_ON');
SET @sql := IF(@c>0,'SELECT 1','ALTER TABLE `cmms_jobrequest_mst` ADD COLUMN `JR_REJECTED_ON` DATETIME(6) NULL DEFAULT NULL');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @c := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='cmms_jobrequest_mst' AND column_name='JR_REJECTION_REASON');
SET @sql := IF(@c>0,'SELECT 1','ALTER TABLE `cmms_jobrequest_mst` ADD COLUMN `JR_REJECTION_REASON` VARCHAR(500) NULL DEFAULT NULL');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @c := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='cmms_jobrequest_mst' AND column_name='JR_PRIORITY');
SET @sql := IF(@c>0,'SELECT 1','ALTER TABLE `cmms_jobrequest_mst` ADD COLUMN `JR_PRIORITY` ENUM(''LOW'',''NORMAL'',''HIGH'',''URGENT'') NOT NULL DEFAULT ''NORMAL''');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @c := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='cmms_jobrequest_mst' AND column_name='JR_ASSIGNED_ENGINEER');
SET @sql := IF(@c>0,'SELECT 1','ALTER TABLE `cmms_jobrequest_mst` ADD COLUMN `JR_ASSIGNED_ENGINEER` VARCHAR(7) NULL DEFAULT NULL');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- ── 2.3 cmms_jobrequest_mst — indexes ────────────────────────────
SET @i := (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema=DATABASE() AND table_name='cmms_jobrequest_mst' AND index_name='idx_jr_status');
SET @sql := IF(@i>0,'SELECT 1','ALTER TABLE `cmms_jobrequest_mst` ADD INDEX `idx_jr_status` (`JR_MVP_STATUS`)');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @i := (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema=DATABASE() AND table_name='cmms_jobrequest_mst' AND index_name='idx_jr_priority');
SET @sql := IF(@i>0,'SELECT 1','ALTER TABLE `cmms_jobrequest_mst` ADD INDEX `idx_jr_priority` (`JR_PRIORITY`,`JR_MVP_STATUS`)');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @i := (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema=DATABASE() AND table_name='cmms_jobrequest_mst' AND index_name='idx_jr_assigned_eng');
SET @sql := IF(@i>0,'SELECT 1','ALTER TABLE `cmms_jobrequest_mst` ADD INDEX `idx_jr_assigned_eng` (`JR_ASSIGNED_ENGINEER`)');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- Backfill M8
UPDATE `cmms_jobrequest_mst`
   SET `JR_MVP_STATUS` = CASE
         WHEN `JR_SECTIONJOB_NO` IS NOT NULL AND `JR_SECTIONJOB_NO` <> '' THEN 'ASSIGNED'
         ELSE 'SUBMITTED' END,
       `JR_MVP_STATUS_AT` = `JR_JOBREQUESTDATE`
 WHERE `JR_MVP_STATUS` = 'DRAFT' AND `JR_MVP_STATUS_AT` IS NULL;

-- ── 2.4 cmms_jobcard_mst — columns ───────────────────────────────
SET @c := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='cmms_jobcard_mst' AND column_name='JM_MVP_STATUS');
SET @sql := IF(@c>0,'SELECT 1','ALTER TABLE `cmms_jobcard_mst` ADD COLUMN `JM_MVP_STATUS` ENUM(''ASSIGNED'',''IN_PROGRESS'',''COMPLETED'',''VERIFIED_CLOSED'',''REOPENED'') NOT NULL DEFAULT ''ASSIGNED''');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @c := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='cmms_jobcard_mst' AND column_name='JM_VERIFIED_BY');
SET @sql := IF(@c>0,'SELECT 1','ALTER TABLE `cmms_jobcard_mst` ADD COLUMN `JM_VERIFIED_BY` VARCHAR(7) NULL DEFAULT NULL');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @c := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='cmms_jobcard_mst' AND column_name='JM_VERIFIED_ON');
SET @sql := IF(@c>0,'SELECT 1','ALTER TABLE `cmms_jobcard_mst` ADD COLUMN `JM_VERIFIED_ON` DATETIME(6) NULL DEFAULT NULL');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @c := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='cmms_jobcard_mst' AND column_name='JM_REOPENED_REASON');
SET @sql := IF(@c>0,'SELECT 1','ALTER TABLE `cmms_jobcard_mst` ADD COLUMN `JM_REOPENED_REASON` VARCHAR(500) NULL DEFAULT NULL');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @i := (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema=DATABASE() AND table_name='cmms_jobcard_mst' AND index_name='idx_jc_status');
SET @sql := IF(@i>0,'SELECT 1','ALTER TABLE `cmms_jobcard_mst` ADD INDEX `idx_jc_status` (`JM_MVP_STATUS`)');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @i := (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema=DATABASE() AND table_name='cmms_jobcard_mst' AND index_name='idx_jc_recd_date');
SET @sql := IF(@i>0,'SELECT 1','ALTER TABLE `cmms_jobcard_mst` ADD INDEX `idx_jc_recd_date` (`JM_JCRecdDate`)');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- Backfill M7: all legacy job cards → VERIFIED_CLOSED
UPDATE `cmms_jobcard_mst`
   SET `JM_MVP_STATUS` = 'VERIFIED_CLOSED'
 WHERE `JM_MVP_STATUS` = 'ASSIGNED' AND `JM_VERIFIED_ON` IS NULL;

-- ── 2.5 cmms_parameter_master — PK + audit cols ───────────────────
SET @c := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='cmms_parameter_master' AND column_name='is_active');
SET @sql := IF(@c>0,'SELECT 1','ALTER TABLE `cmms_parameter_master` ADD COLUMN `is_active` TINYINT(1) NOT NULL DEFAULT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @c := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='cmms_parameter_master' AND column_name='display_order');
SET @sql := IF(@c>0,'SELECT 1','ALTER TABLE `cmms_parameter_master` ADD COLUMN `display_order` SMALLINT NOT NULL DEFAULT 0');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @c := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='cmms_parameter_master' AND column_name='created_at');
SET @sql := IF(@c>0,'SELECT 1','ALTER TABLE `cmms_parameter_master` ADD COLUMN `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @c := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='cmms_parameter_master' AND column_name='created_by');
SET @sql := IF(@c>0,'SELECT 1','ALTER TABLE `cmms_parameter_master` ADD COLUMN `created_by` VARCHAR(7) NULL DEFAULT NULL');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @c := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='cmms_parameter_master' AND column_name='updated_at');
SET @sql := IF(@c>0,'SELECT 1','ALTER TABLE `cmms_parameter_master` ADD COLUMN `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @c := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='cmms_parameter_master' AND column_name='updated_by');
SET @sql := IF(@c>0,'SELECT 1','ALTER TABLE `cmms_parameter_master` ADD COLUMN `updated_by` VARCHAR(7) NULL DEFAULT NULL');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @pk := (SELECT COUNT(*) FROM information_schema.table_constraints WHERE table_schema=DATABASE() AND table_name='cmms_parameter_master' AND constraint_type='PRIMARY KEY');
SET @sql := IF(@pk>0,'SELECT 1','ALTER TABLE `cmms_parameter_master` ADD PRIMARY KEY (`CategoryID`,`SrID`)');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @i := (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema=DATABASE() AND table_name='cmms_parameter_master' AND index_name='idx_pm_category_order');
SET @sql := IF(@i>0,'SELECT 1','ALTER TABLE `cmms_parameter_master` ADD INDEX `idx_pm_category_order` (`CategoryID`,`display_order`)');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- ── 2.6 cmms_checklist_mst (noop) ────────────────────────────────
SELECT '[NOOP] cmms_checklist_mst already has audit columns' AS step;

-- ── 2.7 users FK (deferred from 001) ─────────────────────────────
SET @f := (SELECT COUNT(*) FROM information_schema.table_constraints WHERE table_schema=DATABASE() AND table_name='users' AND constraint_name='fk_users_section' AND constraint_type='FOREIGN KEY');
SET @sql := IF(@f>0,'SELECT 1','ALTER TABLE `users` ADD CONSTRAINT `fk_users_section` FOREIGN KEY (`section_id`) REFERENCES `sections` (`section_id`)');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SELECT '✓ Migration 002 complete' AS result;
