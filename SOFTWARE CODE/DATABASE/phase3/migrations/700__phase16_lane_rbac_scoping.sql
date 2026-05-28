-- ============================================================================
-- CMCMIS_SIMPLIFIED - Migration 700 (Phase 16)
-- File:     700__phase16_lane_rbac_scoping.sql
-- Purpose:  Add row-level lane scoping for the four operational lanes:
--           TME_CAL, TME_REPAIR, FPE_CAL, FPE_REPAIR.
--
-- From: one global LAB_IN_CHARGE and one global LAB_ENGINEER role family
--       operating across all TME/FPE Calibration/Repair work.
-- To:   keep the global roles untouched and add eight lane-scoped roles
--       whose rows are filtered by lane_code on new Job Requests/Cards.
--
-- Additive only:
--   - No existing role, user, permission, equipment, JR, or JC row is removed.
--   - Existing global LAB_IN_CHARGE / LAB_ENGINEER users continue to see all.
--   - Legacy JR/JC rows without category+type remain visible to global roles.
-- ============================================================================

SET NAMES utf8;
SET sql_mode = 'STRICT_TRANS_TABLES';

-- 700.1 Lane master. This is intentionally small and stable.
CREATE TABLE IF NOT EXISTS `operational_lanes` (
  `lane_code`    VARCHAR(20) NOT NULL,
  `lane_name`    VARCHAR(80) NOT NULL,
  `job_category` ENUM('TME','FPE') NOT NULL,
  `job_type`     ENUM('CALIBRATION','REPAIR') NOT NULL,
  `is_active`    TINYINT(1) NOT NULL DEFAULT 1,
  `created_at`   DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by`   VARCHAR(20) NULL,
  PRIMARY KEY (`lane_code`),
  UNIQUE KEY `uk_operational_lanes_category_type` (`job_category`, `job_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci
  COMMENT='Phase 16: four row-level operational lanes for JR/JC scope';

INSERT INTO `operational_lanes`
  (`lane_code`, `lane_name`, `job_category`, `job_type`, `is_active`, `created_by`)
VALUES
  ('TME_CAL',    'T&ME Calibration', 'TME', 'CALIBRATION', 1, 'MIGRATION_700'),
  ('TME_REPAIR', 'T&ME Repair',      'TME', 'REPAIR',      1, 'MIGRATION_700'),
  ('FPE_CAL',    'F&PE Calibration', 'FPE', 'CALIBRATION', 1, 'MIGRATION_700'),
  ('FPE_REPAIR', 'F&PE Repair',      'FPE', 'REPAIR',      1, 'MIGRATION_700')
ON DUPLICATE KEY UPDATE
  `lane_name` = VALUES(`lane_name`),
  `job_category` = VALUES(`job_category`),
  `job_type` = VALUES(`job_type`),
  `is_active` = 1;

-- 700.2 Per-user lane scope. One row is enough for the current roles, but
-- the PK supports multiple scopes later without changing user_roles.
CREATE TABLE IF NOT EXISTS `user_lane_scopes` (
  `user_id`     BIGINT(20) UNSIGNED NOT NULL,
  `lane_code`   VARCHAR(20) NOT NULL,
  `assigned_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `assigned_by` VARCHAR(20) NULL,
  PRIMARY KEY (`user_id`, `lane_code`),
  KEY `idx_user_lane_scopes_lane` (`lane_code`, `user_id`),
  CONSTRAINT `fk_user_lane_scopes_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_user_lane_scopes_lane`
    FOREIGN KEY (`lane_code`) REFERENCES `operational_lanes` (`lane_code`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci
  COMMENT='Phase 16: row-level lane scopes attached to login users';

-- 700.3 Add the eight new roles. Old five roles are untouched.
INSERT IGNORE INTO `roles`
  (`role_id`, `role_code`, `role_name`, `role_description`, `is_system`, `created_at`)
VALUES
  (6,  'TME_REPAIR_LAB_IN_CHARGE', 'T&ME Repair Lab In-Charge',
   'Lane-scoped Lab In-Charge for TME_REPAIR job requests/cards', 1, NOW(6)),
  (7,  'TME_CAL_LAB_IN_CHARGE',    'T&ME Calibration Lab In-Charge',
   'Lane-scoped Lab In-Charge for TME_CAL job requests/cards', 1, NOW(6)),
  (8,  'FPE_REPAIR_LAB_IN_CHARGE', 'F&PE Repair Lab In-Charge',
   'Lane-scoped Lab In-Charge for FPE_REPAIR job requests/cards', 1, NOW(6)),
  (9,  'FPE_CAL_LAB_IN_CHARGE',    'F&PE Calibration Lab In-Charge',
   'Lane-scoped Lab In-Charge for FPE_CAL job requests/cards', 1, NOW(6)),
  (10, 'TME_REPAIR_LAB_ENG',       'T&ME Repair Lab Engineer',
   'Lane-scoped Lab Engineer for TME_REPAIR job cards', 1, NOW(6)),
  (11, 'TME_CAL_LAB_ENG',          'T&ME Calibration Lab Engineer',
   'Lane-scoped Lab Engineer for TME_CAL job cards', 1, NOW(6)),
  (12, 'FPE_REPAIR_LAB_ENG',       'F&PE Repair Lab Engineer',
   'Lane-scoped Lab Engineer for FPE_REPAIR job cards', 1, NOW(6)),
  (13, 'FPE_CAL_LAB_ENG',          'F&PE Calibration Lab Engineer',
   'Lane-scoped Lab Engineer for FPE_CAL job cards', 1, NOW(6));

-- 700.4 Permission inheritance:
-- In-charge lane roles get the current LAB_IN_CHARGE permission set.
-- Engineer lane roles get the current LAB_ENGINEER permission set.
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`, `granted_at`, `granted_by`)
SELECT scoped.role_id, rp.permission_id, NOW(6), 'MIGRATION_700'
  FROM `roles` base
  JOIN `role_permissions` rp ON rp.role_id = base.role_id
  JOIN `roles` scoped ON scoped.role_code IN (
       'TME_REPAIR_LAB_IN_CHARGE',
       'TME_CAL_LAB_IN_CHARGE',
       'FPE_REPAIR_LAB_IN_CHARGE',
       'FPE_CAL_LAB_IN_CHARGE'
  )
 WHERE base.role_code = 'LAB_IN_CHARGE';

INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`, `granted_at`, `granted_by`)
SELECT scoped.role_id, rp.permission_id, NOW(6), 'MIGRATION_700'
  FROM `roles` base
  JOIN `role_permissions` rp ON rp.role_id = base.role_id
  JOIN `roles` scoped ON scoped.role_code IN (
       'TME_REPAIR_LAB_ENG',
       'TME_CAL_LAB_ENG',
       'FPE_REPAIR_LAB_ENG',
       'FPE_CAL_LAB_ENG'
  )
 WHERE base.role_code = 'LAB_ENGINEER';

-- 700.5 JR lane storage. Category/type already exist; lane_code is the
-- indexed "materialized scope" so every list/detail gate avoids CASE work.
ALTER TABLE `cmms_jobrequest_mst`
  ADD COLUMN IF NOT EXISTS `JR_LANE_CODE` VARCHAR(20) NULL
    COMMENT 'Phase 16: derived row-level lane from JR_JOB_CATEGORY + JR_JOB_TYPE (TME_CAL/TME_REPAIR/FPE_CAL/FPE_REPAIR)'
    AFTER `JR_JOB_TYPE`;

-- 700.6 JC category/type/lane storage. New Job Cards copy this from the
-- parent JR at Convert time so JC queries do not need to join JR for scope.
ALTER TABLE `cmms_jobcard_mst`
  ADD COLUMN IF NOT EXISTS `JM_JOB_CATEGORY` ENUM('TME','FPE') NULL
    COMMENT 'Phase 16: copied from parent JR_JOB_CATEGORY for lane-scoped JC reads'
    AFTER `JM_FNPETYPE`,
  ADD COLUMN IF NOT EXISTS `JM_JOB_TYPE` ENUM('CALIBRATION','REPAIR') NULL
    COMMENT 'Phase 16: copied from parent JR_JOB_TYPE for lane-scoped JC reads'
    AFTER `JM_JOB_CATEGORY`,
  ADD COLUMN IF NOT EXISTS `JM_LANE_CODE` VARCHAR(20) NULL
    COMMENT 'Phase 16: derived row-level lane for Job Cards'
    AFTER `JM_JOB_TYPE`;

-- 700.7 Backfill known new-format JRs only. Registration and legacy NULLs
-- stay NULL because they do not map to the four requested lanes.
UPDATE `cmms_jobrequest_mst`
   SET `JR_LANE_CODE` = CASE
         WHEN `JR_JOB_CATEGORY` = 'TME' AND `JR_JOB_TYPE` = 'CALIBRATION' THEN 'TME_CAL'
         WHEN `JR_JOB_CATEGORY` = 'TME' AND `JR_JOB_TYPE` = 'REPAIR'      THEN 'TME_REPAIR'
         WHEN `JR_JOB_CATEGORY` = 'FPE' AND `JR_JOB_TYPE` = 'CALIBRATION' THEN 'FPE_CAL'
         WHEN `JR_JOB_CATEGORY` = 'FPE' AND `JR_JOB_TYPE` = 'REPAIR'      THEN 'FPE_REPAIR'
         ELSE NULL
       END
 WHERE `JR_JOB_CATEGORY` IN ('TME','FPE')
   AND `JR_JOB_TYPE` IN ('CALIBRATION','REPAIR');

-- 700.8 Backfill JCs from parent JR when the linkage is available.
UPDATE `cmms_jobcard_mst` jc
JOIN `cmms_jobrequest_mst` jr ON jr.`JR_JOBREQUESTNO` = jc.`JM_PARENT_JR_NO`
   SET jc.`JM_JOB_CATEGORY` = jr.`JR_JOB_CATEGORY`,
       jc.`JM_JOB_TYPE` = CASE
         WHEN jr.`JR_JOB_TYPE` IN ('CALIBRATION','REPAIR') THEN jr.`JR_JOB_TYPE`
         ELSE NULL
       END,
       jc.`JM_LANE_CODE` = jr.`JR_LANE_CODE`
 WHERE jr.`JR_LANE_CODE` IS NOT NULL;

UPDATE `cmms_jobcard_mst` jc
JOIN `cmms_jobrequest_mst` jr ON jr.`JR_SECTIONJOB_NO` = jc.`JM_SectionJobNo`
   SET jc.`JM_JOB_CATEGORY` = jr.`JR_JOB_CATEGORY`,
       jc.`JM_JOB_TYPE` = CASE
         WHEN jr.`JR_JOB_TYPE` IN ('CALIBRATION','REPAIR') THEN jr.`JR_JOB_TYPE`
         ELSE NULL
       END,
       jc.`JM_LANE_CODE` = jr.`JR_LANE_CODE`
 WHERE jc.`JM_LANE_CODE` IS NULL
   AND jr.`JR_LANE_CODE` IS NOT NULL;

-- 700.9 Indexes for fast row-level lane filters.
SET @idx_exists := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'cmms_jobrequest_mst'
     AND INDEX_NAME = 'idx_jr_lane_created'
);
SET @ddl := IF(
  @idx_exists = 0,
  'CREATE INDEX `idx_jr_lane_created` ON `cmms_jobrequest_mst` (`JR_LANE_CODE`, `JR_CREATED_AT` DESC, `JR_JOBREQUESTNO` DESC)',
  'SELECT ''skip: idx_jr_lane_created already present'' AS note'
);
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_exists := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'cmms_jobrequest_mst'
     AND INDEX_NAME = 'idx_jr_category_type_created'
);
SET @ddl := IF(
  @idx_exists = 0,
  'CREATE INDEX `idx_jr_category_type_created` ON `cmms_jobrequest_mst` (`JR_JOB_CATEGORY`, `JR_JOB_TYPE`, `JR_CREATED_AT` DESC)',
  'SELECT ''skip: idx_jr_category_type_created already present'' AS note'
);
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_exists := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'cmms_jobcard_mst'
     AND INDEX_NAME = 'idx_jc_lane_status_created'
);
SET @ddl := IF(
  @idx_exists = 0,
  'CREATE INDEX `idx_jc_lane_status_created` ON `cmms_jobcard_mst` (`JM_LANE_CODE`, `JM_MVP_STATUS`, `JM_CREATED_ON` DESC, `JM_JobCardNO` DESC)',
  'SELECT ''skip: idx_jc_lane_status_created already present'' AS note'
);
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Verify.
SELECT 'Migration 700 complete - lane RBAC scaffolding added' AS status;
SELECT `role_id`, `role_code` FROM `roles` WHERE `role_id` BETWEEN 6 AND 13 ORDER BY `role_id`;
SELECT `lane_code`, `job_category`, `job_type` FROM `operational_lanes` ORDER BY `lane_code`;
SELECT `JR_LANE_CODE`, COUNT(*) AS jr_count
  FROM `cmms_jobrequest_mst`
 GROUP BY `JR_LANE_CODE`
 ORDER BY `JR_LANE_CODE`;
SELECT `JM_LANE_CODE`, COUNT(*) AS jc_count
  FROM `cmms_jobcard_mst`
 GROUP BY `JM_LANE_CODE`
 ORDER BY `JM_LANE_CODE`;
