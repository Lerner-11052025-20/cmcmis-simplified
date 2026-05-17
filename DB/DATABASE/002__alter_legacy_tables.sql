-- ════════════════════════════════════════════════════════════════════
-- CMCMIS_SIMPLIFIED — Migration 002
-- File:     002__alter_legacy_tables.sql
-- Purpose:  Apply 6 ALTER TABLE statements to legacy tables
-- Author:   Claude (AI engineering pair) for Deep Sorathiya (DS)
-- Version:  v2.0 LOCKED
-- Idempotent: YES — wrapped in stored procedure that checks
--                   information_schema before each ADD COLUMN/INDEX/FK
-- ════════════════════════════════════════════════════════════════════

SET NAMES utf8mb4;
SET sql_mode = 'STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';

-- ────────────────────────────────────────────────────────────────────
-- Helper: drop the procedure if it exists from a previous failed run,
-- then create it fresh. The procedure provides idempotent column /
-- index / FK additions via information_schema lookups.
-- ────────────────────────────────────────────────────────────────────

DROP PROCEDURE IF EXISTS `_cmcmis_safe_alter`;

DELIMITER //

CREATE PROCEDURE `_cmcmis_safe_alter`(
  IN p_kind  VARCHAR(20),   -- 'COLUMN' | 'INDEX' | 'FK'
  IN p_table VARCHAR(64),
  IN p_name  VARCHAR(64),
  IN p_ddl   TEXT           -- the full ALTER fragment, e.g. "ADD COLUMN ..."
)
BEGIN
  DECLARE v_exists INT DEFAULT 0;

  IF p_kind = 'COLUMN' THEN
    SELECT COUNT(*) INTO v_exists
      FROM information_schema.columns
     WHERE table_schema = DATABASE()
       AND table_name   = p_table
       AND column_name  = p_name;
  ELSEIF p_kind = 'INDEX' THEN
    SELECT COUNT(*) INTO v_exists
      FROM information_schema.statistics
     WHERE table_schema = DATABASE()
       AND table_name   = p_table
       AND index_name   = p_name;
  ELSEIF p_kind = 'FK' THEN
    SELECT COUNT(*) INTO v_exists
      FROM information_schema.table_constraints
     WHERE table_schema    = DATABASE()
       AND table_name      = p_table
       AND constraint_name = p_name
       AND constraint_type = 'FOREIGN KEY';
  END IF;

  IF v_exists = 0 THEN
    SET @full_ddl = CONCAT('ALTER TABLE `', p_table, '` ', p_ddl);
    PREPARE stmt FROM @full_ddl;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
    SELECT CONCAT('  [ADDED]   ', p_kind, ' ', p_name, ' on ', p_table) AS step;
  ELSE
    SELECT CONCAT('  [SKIPPED] ', p_kind, ' ', p_name, ' on ', p_table, ' (already exists)') AS step;
  END IF;
END //

DELIMITER ;


-- ════════════════════════════════════════════════════════════════════
-- 2.1 — cmms_emp_mst (legacy KEEP, light ALTER: 1 index)
-- ════════════════════════════════════════════════════════════════════
CALL `_cmcmis_safe_alter`('INDEX', 'cmms_emp_mst', 'idx_emm_active',
  'ADD INDEX `idx_emm_active` (`EMM_INACTIVE`)');


-- ════════════════════════════════════════════════════════════════════
-- 2.2 — cmms_eqip_mst (4 new columns + 5 indexes + 1 FK)
-- ════════════════════════════════════════════════════════════════════

-- New columns
CALL `_cmcmis_safe_alter`('COLUMN', 'cmms_eqip_mst', 'EQM_VERIFIED_BY',
  'ADD COLUMN `EQM_VERIFIED_BY` VARCHAR(7) NULL DEFAULT NULL
   COMMENT ''Lab In-Charge / Super Admin who verified PENDING→ACTIVE''
   AFTER `EQM_CREATED_BY`');

CALL `_cmcmis_safe_alter`('COLUMN', 'cmms_eqip_mst', 'EQM_VERIFIED_ON',
  'ADD COLUMN `EQM_VERIFIED_ON` DATETIME(6) NULL DEFAULT NULL
   AFTER `EQM_VERIFIED_BY`');

CALL `_cmcmis_safe_alter`('COLUMN', 'cmms_eqip_mst', 'EQM_MVP_STATUS',
  'ADD COLUMN `EQM_MVP_STATUS` ENUM(
     ''PENDING_VERIFICATION'',''ACTIVE'',''UNDER_CALIBRATION'',
     ''UNDER_REPAIR'',''OUT_OF_TOLERANCE'',''QUARANTINED'',
     ''CONDEMNED'',''RETIRED''
   ) NOT NULL DEFAULT ''PENDING_VERIFICATION''
   COMMENT ''D10: new equipment defaults to PENDING_VERIFICATION''
   AFTER `EQM_DIV_STATUS`');

CALL `_cmcmis_safe_alter`('COLUMN', 'cmms_eqip_mst', 'EQM_MVP_STATUS_AT',
  'ADD COLUMN `EQM_MVP_STATUS_AT` DATETIME(6) NULL DEFAULT NULL
   AFTER `EQM_MVP_STATUS`');

CALL `_cmcmis_safe_alter`('COLUMN', 'cmms_eqip_mst', 'EQM_SECTION_ID',
  'ADD COLUMN `EQM_SECTION_ID` INT UNSIGNED NULL DEFAULT NULL
   COMMENT ''FK → sections.section_id (new MVP T&ME / F&PE)''
   AFTER `EQM_MVP_STATUS_AT`');

-- Indexes
CALL `_cmcmis_safe_alter`('INDEX', 'cmms_eqip_mst', 'idx_eqip_mvp_status',
  'ADD INDEX `idx_eqip_mvp_status` (`EQM_MVP_STATUS`)');

CALL `_cmcmis_safe_alter`('INDEX', 'cmms_eqip_mst', 'idx_eqip_cal_due',
  'ADD INDEX `idx_eqip_cal_due` (`EQM_CAL_DUE_DATE`)');

CALL `_cmcmis_safe_alter`('INDEX', 'cmms_eqip_mst', 'idx_eqip_div',
  'ADD INDEX `idx_eqip_div` (`EQM_DIVID`)');

CALL `_cmcmis_safe_alter`('INDEX', 'cmms_eqip_mst', 'idx_eqip_section_new',
  'ADD INDEX `idx_eqip_section_new` (`EQM_SECTION_ID`)');

CALL `_cmcmis_safe_alter`('INDEX', 'cmms_eqip_mst', 'idx_eqip_mfr',
  'ADD INDEX `idx_eqip_mfr` (`EQM_MFRID`)');

-- FK to new sections table
CALL `_cmcmis_safe_alter`('FK', 'cmms_eqip_mst', 'fk_eqip_section_new',
  'ADD CONSTRAINT `fk_eqip_section_new`
     FOREIGN KEY (`EQM_SECTION_ID`) REFERENCES `sections` (`section_id`)');

-- Backfill: existing 5,704 rows are already in production → ACTIVE
UPDATE `cmms_eqip_mst`
   SET `EQM_MVP_STATUS`    = 'ACTIVE',
       `EQM_MVP_STATUS_AT` = COALESCE(`EQM_UPDATED_ON`, `EQM_CREATED_ON`, NOW(6))
 WHERE `EQM_MVP_STATUS` = 'PENDING_VERIFICATION'
   AND `EQM_VERIFIED_ON` IS NULL;


-- ════════════════════════════════════════════════════════════════════
-- 2.3 — cmms_jobrequest_mst (8 new columns + 5 indexes)
-- ════════════════════════════════════════════════════════════════════

CALL `_cmcmis_safe_alter`('COLUMN', 'cmms_jobrequest_mst', 'JR_MVP_STATUS',
  'ADD COLUMN `JR_MVP_STATUS` ENUM(
     ''DRAFT'',''SUBMITTED'',''ASSIGNED'',
     ''IN_PROGRESS'',''COMPLETED'',''VERIFIED_CLOSED'',
     ''REJECTED'',''REOPENED''
   ) NOT NULL DEFAULT ''DRAFT''
   COMMENT ''FINAL-DESC §8.1 JR state machine''
   AFTER `JR_REQUEST_TYPE`');

CALL `_cmcmis_safe_alter`('COLUMN', 'cmms_jobrequest_mst', 'JR_MVP_STATUS_AT',
  'ADD COLUMN `JR_MVP_STATUS_AT` DATETIME(6) NULL DEFAULT NULL AFTER `JR_MVP_STATUS`');

CALL `_cmcmis_safe_alter`('COLUMN', 'cmms_jobrequest_mst', 'JR_APPROVED_BY',
  'ADD COLUMN `JR_APPROVED_BY` VARCHAR(7) NULL DEFAULT NULL');

CALL `_cmcmis_safe_alter`('COLUMN', 'cmms_jobrequest_mst', 'JR_APPROVED_ON',
  'ADD COLUMN `JR_APPROVED_ON` DATETIME(6) NULL DEFAULT NULL');

CALL `_cmcmis_safe_alter`('COLUMN', 'cmms_jobrequest_mst', 'JR_REJECTED_BY',
  'ADD COLUMN `JR_REJECTED_BY` VARCHAR(7) NULL DEFAULT NULL');

CALL `_cmcmis_safe_alter`('COLUMN', 'cmms_jobrequest_mst', 'JR_REJECTED_ON',
  'ADD COLUMN `JR_REJECTED_ON` DATETIME(6) NULL DEFAULT NULL');

CALL `_cmcmis_safe_alter`('COLUMN', 'cmms_jobrequest_mst', 'JR_REJECTION_REASON',
  'ADD COLUMN `JR_REJECTION_REASON` VARCHAR(500) NULL DEFAULT NULL
   COMMENT ''BR-JR-08: mandatory on reject''');

CALL `_cmcmis_safe_alter`('COLUMN', 'cmms_jobrequest_mst', 'JR_PRIORITY',
  'ADD COLUMN `JR_PRIORITY` ENUM(''LOW'',''NORMAL'',''HIGH'',''URGENT'')
   NOT NULL DEFAULT ''NORMAL''');

CALL `_cmcmis_safe_alter`('COLUMN', 'cmms_jobrequest_mst', 'JR_ASSIGNED_ENGINEER',
  'ADD COLUMN `JR_ASSIGNED_ENGINEER` VARCHAR(7) NULL DEFAULT NULL
   COMMENT ''Lab Engineer assigned by Lab In-Charge''');

CALL `_cmcmis_safe_alter`('INDEX', 'cmms_jobrequest_mst', 'idx_jr_status',
  'ADD INDEX `idx_jr_status` (`JR_MVP_STATUS`)');

CALL `_cmcmis_safe_alter`('INDEX', 'cmms_jobrequest_mst', 'idx_jr_priority',
  'ADD INDEX `idx_jr_priority` (`JR_PRIORITY`, `JR_MVP_STATUS`)');

CALL `_cmcmis_safe_alter`('INDEX', 'cmms_jobrequest_mst', 'idx_jr_submittedby',
  'ADD INDEX `idx_jr_submittedby` (`JR_SUBMITTEDBYID`)');

CALL `_cmcmis_safe_alter`('INDEX', 'cmms_jobrequest_mst', 'idx_jr_assigned_eng',
  'ADD INDEX `idx_jr_assigned_eng` (`JR_ASSIGNED_ENGINEER`)');

-- Backfill per M8: if SECTIONJOB_NO is set → ASSIGNED else SUBMITTED
UPDATE `cmms_jobrequest_mst`
   SET `JR_MVP_STATUS` = CASE
         WHEN `JR_SECTIONJOB_NO` IS NOT NULL AND `JR_SECTIONJOB_NO` <> ''
              THEN 'ASSIGNED'
         ELSE 'SUBMITTED'
       END,
       `JR_MVP_STATUS_AT` = `JR_JOBREQUESTDATE`
 WHERE `JR_MVP_STATUS` = 'DRAFT'
   AND `JR_MVP_STATUS_AT` IS NULL;


-- ════════════════════════════════════════════════════════════════════
-- 2.4 — cmms_jobcard_mst (4 new columns + 2 indexes)
-- ════════════════════════════════════════════════════════════════════

CALL `_cmcmis_safe_alter`('COLUMN', 'cmms_jobcard_mst', 'JM_MVP_STATUS',
  'ADD COLUMN `JM_MVP_STATUS` ENUM(
     ''ASSIGNED'',''IN_PROGRESS'',''COMPLETED'',
     ''VERIFIED_CLOSED'',''REOPENED''
   ) NOT NULL DEFAULT ''ASSIGNED''
   COMMENT ''FINAL-DESC §8 JC state machine''
   AFTER `JM_JobStatus`');

CALL `_cmcmis_safe_alter`('COLUMN', 'cmms_jobcard_mst', 'JM_VERIFIED_BY',
  'ADD COLUMN `JM_VERIFIED_BY` VARCHAR(7) NULL DEFAULT NULL');

CALL `_cmcmis_safe_alter`('COLUMN', 'cmms_jobcard_mst', 'JM_VERIFIED_ON',
  'ADD COLUMN `JM_VERIFIED_ON` DATETIME(6) NULL DEFAULT NULL');

CALL `_cmcmis_safe_alter`('COLUMN', 'cmms_jobcard_mst', 'JM_REOPENED_REASON',
  'ADD COLUMN `JM_REOPENED_REASON` VARCHAR(500) NULL DEFAULT NULL
   COMMENT ''BR-JC-05: mandatory on reopen''');

CALL `_cmcmis_safe_alter`('INDEX', 'cmms_jobcard_mst', 'idx_jc_status',
  'ADD INDEX `idx_jc_status` (`JM_MVP_STATUS`)');

CALL `_cmcmis_safe_alter`('INDEX', 'cmms_jobcard_mst', 'idx_jc_recd_date',
  'ADD INDEX `idx_jc_recd_date` (`JM_JCRecdDate`)');

-- Backfill per M7: assume all legacy job cards are closed
UPDATE `cmms_jobcard_mst`
   SET `JM_MVP_STATUS` = 'VERIFIED_CLOSED'
 WHERE `JM_MVP_STATUS` = 'ASSIGNED'
   AND `JM_VERIFIED_ON` IS NULL;


-- ════════════════════════════════════════════════════════════════════
-- 2.5 — cmms_parameter_master (add PK + audit cols)
-- ════════════════════════════════════════════════════════════════════
-- Special case: the legacy table has NO PK. Adding one via the helper
-- isn't ideal; we use explicit detection here.

SET @has_pk := (
  SELECT COUNT(*) FROM information_schema.table_constraints
   WHERE table_schema = DATABASE()
     AND table_name   = 'cmms_parameter_master'
     AND constraint_type = 'PRIMARY KEY'
);

-- Add columns first (helper-safe), THEN PK if missing
CALL `_cmcmis_safe_alter`('COLUMN', 'cmms_parameter_master', 'is_active',
  'ADD COLUMN `is_active` TINYINT(1) NOT NULL DEFAULT 1');

CALL `_cmcmis_safe_alter`('COLUMN', 'cmms_parameter_master', 'display_order',
  'ADD COLUMN `display_order` SMALLINT NOT NULL DEFAULT 0');

CALL `_cmcmis_safe_alter`('COLUMN', 'cmms_parameter_master', 'created_at',
  'ADD COLUMN `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)');

CALL `_cmcmis_safe_alter`('COLUMN', 'cmms_parameter_master', 'created_by',
  'ADD COLUMN `created_by` VARCHAR(7) NULL DEFAULT NULL');

CALL `_cmcmis_safe_alter`('COLUMN', 'cmms_parameter_master', 'updated_at',
  'ADD COLUMN `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
   ON UPDATE CURRENT_TIMESTAMP(6)');

CALL `_cmcmis_safe_alter`('COLUMN', 'cmms_parameter_master', 'updated_by',
  'ADD COLUMN `updated_by` VARCHAR(7) NULL DEFAULT NULL');

-- PK only if missing
SET @do_pk_sql := IF(@has_pk = 0,
  'ALTER TABLE `cmms_parameter_master` ADD PRIMARY KEY (`CategoryID`, `SrID`)',
  'SELECT ''  [SKIPPED] PRIMARY KEY on cmms_parameter_master (already exists)'' AS step'
);
PREPARE pk_stmt FROM @do_pk_sql;
EXECUTE pk_stmt;
DEALLOCATE PREPARE pk_stmt;

CALL `_cmcmis_safe_alter`('INDEX', 'cmms_parameter_master', 'idx_pm_category_order',
  'ADD INDEX `idx_pm_category_order` (`CategoryID`, `display_order`)');

CALL `_cmcmis_safe_alter`('INDEX', 'cmms_parameter_master', 'idx_pm_active',
  'ADD INDEX `idx_pm_active` (`is_active`)');


-- ════════════════════════════════════════════════════════════════════
-- 2.6 — cmms_checklist_mst (light audit cols)
-- The existing table already has CHKL_CREATED_BY/ON + CHKL_UPDATED_BY/ON,
-- so this section is intentionally a no-op pass-through, kept for
-- future column additions during build.
-- ════════════════════════════════════════════════════════════════════
SELECT '  [NOOP]    cmms_checklist_mst already has audit columns' AS step;


-- ════════════════════════════════════════════════════════════════════
-- 2.7 — users → sections FK (deferred from 001 because sections didn't
--                            exist when users was created)
-- ════════════════════════════════════════════════════════════════════
CALL `_cmcmis_safe_alter`('FK', 'users', 'fk_users_section',
  'ADD CONSTRAINT `fk_users_section`
     FOREIGN KEY (`section_id`) REFERENCES `sections` (`section_id`)');


-- ════════════════════════════════════════════════════════════════════
-- Clean up the helper procedure
-- ════════════════════════════════════════════════════════════════════
DROP PROCEDURE IF EXISTS `_cmcmis_safe_alter`;

SELECT '✓ Migration 002 complete — all ALTERs applied idempotently' AS result;
