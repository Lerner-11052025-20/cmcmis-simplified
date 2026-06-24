-- ════════════════════════════════════════════════════════════════════
-- CMCMIS_SIMPLIFIED — Migration 301 (Phase 9)
-- File:     301__phase9_jc_child_tables.sql
-- Purpose:  CREATE the 5 child tables that hold multi-row data hanging
--           off a Job Card + a state-history table for the JC state
--           machine.
--
-- Tables (decision D-9.3):
--   jc_maintenance_details     (multi-row defect tracking)
--   jc_spares_used             (multi-row spare parts)
--   jc_task_checklist          (per-JC task instances, library + custom)
--   jc_documents               (file metadata; data on disk)
--   jc_observations_readings   (per-reading data points)
--   job_card_status_history    (state machine transition log)
--
-- All FKs reference cmms_jobcard_mst.JM_SectionJobNo (the JC PK, varchar 9).
-- All tables use snake_case naming (NEW-table doctrine).
-- Idempotent: YES (CREATE TABLE IF NOT EXISTS).
-- ════════════════════════════════════════════════════════════════════

SET NAMES utf8mb4;
SET sql_mode = 'STRICT_TRANS_TABLES';

-- ─────────────────────────────────────────────────────────────────────
-- 1. jc_maintenance_details — multi-row defect/observation/action table
--    rendered in Tab 4 (image 12). Hard-delete on row removal (Q-5).
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `jc_maintenance_details` (
  `id`                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `jc_section_no`     VARCHAR(9)    NOT NULL,
  `sr_no`             SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  `defect_description` TEXT         NOT NULL,
  `observation`       TEXT          NULL,
  `action_taken`      TEXT          NULL,
  `remarks`           TEXT          NULL,
  `created_by_employee_id` VARCHAR(7) NULL,
  `created_at`        DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at`        DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  KEY `idx_jcm_jc`            (`jc_section_no`, `sr_no`),
  CONSTRAINT `fk_jcm_jc`      FOREIGN KEY (`jc_section_no`) REFERENCES `cmms_jobcard_mst`(`JM_SectionJobNo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci
  COMMENT='Phase 9: Tab 4 — Maintenance Details child rows';

-- ─────────────────────────────────────────────────────────────────────
-- 2. jc_spares_used — multi-row spare-parts table rendered in Tab 7
--    (image 4). source ENUM matches the dropdown values in the mockup.
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `jc_spares_used` (
  `id`              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `jc_section_no`   VARCHAR(9)    NOT NULL,
  `sr_no`           SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  `spare_type`      VARCHAR(120)  NULL,
  `source`          ENUM('CASH_PURCHASE','INVENTORY','LOAN','REPLACED_VENDOR_REPAIR_CONTRACT','REPLACED_UNDER_WARRANTY','SPARE_NEED_BASED_REPAIRS','TIMCD_INVENTORY','OTHERS','VENDOR','STOCK','WARRANTY','OTHER')
                                  NOT NULL DEFAULT 'CASH_PURCHASE',
  `part_no`         VARCHAR(120)  NULL,
  `part_description` TEXT         NULL,
  `quantity`        DECIMAL(10,2) NULL,
  `cost`            DECIMAL(12,2) NULL,
  `created_by_employee_id` VARCHAR(7) NULL,
  `created_at`      DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at`      DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  KEY `idx_jcs_jc`         (`jc_section_no`, `sr_no`),
  CONSTRAINT `fk_jcs_jc`   FOREIGN KEY (`jc_section_no`) REFERENCES `cmms_jobcard_mst`(`JM_SectionJobNo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci
  COMMENT='Phase 9: Tab 7 — Spares Used child rows';

-- ─────────────────────────────────────────────────────────────────────
-- 3. jc_task_checklist — per-JC task instances (Tab 10, image 15).
--    Engineer adds library tasks (task_id populated, is_custom=0) OR
--    custom tasks (task_id NULL, is_custom=1). Toggling a checkbox sets
--    is_completed=1 + completed_by + completed_at.
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `jc_task_checklist` (
  `id`              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `jc_section_no`   VARCHAR(9)    NOT NULL,
  `task_id`         BIGINT UNSIGNED NULL COMMENT 'FK to task_library.id when is_custom=0; NULL when is_custom=1',
  `task_text`       VARCHAR(500)  NOT NULL COMMENT 'Snapshot of the text at add time — survives library edits',
  `is_custom`       TINYINT(1)    NOT NULL DEFAULT 0,
  `is_completed`    TINYINT(1)    NOT NULL DEFAULT 0,
  `completed_by_employee_id` VARCHAR(7) NULL,
  `completed_at`    DATETIME(6)   NULL,
  `order_index`     SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  `created_by_employee_id` VARCHAR(7) NULL,
  `created_at`      DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  KEY `idx_jct_jc`         (`jc_section_no`, `order_index`),
  KEY `idx_jct_jc_done`    (`jc_section_no`, `is_completed`),
  CONSTRAINT `fk_jct_jc`   FOREIGN KEY (`jc_section_no`) REFERENCES `cmms_jobcard_mst`(`JM_SectionJobNo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci
  COMMENT='Phase 9: Tab 10 — Task Checklist instances per JC';

-- ─────────────────────────────────────────────────────────────────────
-- 4. jc_documents — file metadata (Tab 11). Files on disk under
--    storage/job-cards/<section_job_no>/<storage_filename>. Soft-delete
--    via deleted_at so admin can audit deletions later (Q-5 documents).
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `jc_documents` (
  `id`              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `jc_section_no`   VARCHAR(9)    NOT NULL,
  `filename`        VARCHAR(255)  NOT NULL COMMENT 'Original client filename',
  `storage_filename` VARCHAR(255) NOT NULL COMMENT 'On-disk name (uuid + ext)',
  `mimetype`        VARCHAR(100)  NOT NULL,
  `size_bytes`      INT UNSIGNED  NOT NULL,
  `storage_path`    VARCHAR(500)  NOT NULL COMMENT 'Path under storage/ (relative)',
  `doc_type`        ENUM('CALIBRATION_CERT','INSPECTION_REPORT','PHOTO_BEFORE','PHOTO_AFTER','VENDOR_INVOICE','REQUIRED','OTHER')
                                  NOT NULL DEFAULT 'OTHER',
  `uploaded_by_employee_id` VARCHAR(7) NOT NULL,
  `uploaded_at`     DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `deleted_at`      DATETIME(6)   NULL,
  `deleted_by_employee_id` VARCHAR(7) NULL,
  KEY `idx_jcd_jc`         (`jc_section_no`, `doc_type`),
  KEY `idx_jcd_active`     (`jc_section_no`, `deleted_at`),
  CONSTRAINT `fk_jcd_jc`   FOREIGN KEY (`jc_section_no`) REFERENCES `cmms_jobcard_mst`(`JM_SectionJobNo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci
  COMMENT='Phase 9: Tab 11 — Document metadata for files on disk';

-- ─────────────────────────────────────────────────────────────────────
-- 5. jc_observations_readings — structured reading rows (Tab 9 sub-
--    section, image 19). One row per parameter/value pair. Used by the
--    "Mark Complete" gate that requires recorded observations.
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `jc_observations_readings` (
  `id`              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `jc_section_no`   VARCHAR(9)    NOT NULL,
  `parameter`       VARCHAR(255)  NOT NULL COMMENT 'e.g. Frequency accuracy @ 1 GHz',
  `value`           VARCHAR(255)  NOT NULL COMMENT 'e.g. ±0.5 ppm',
  `unit`            VARCHAR(30)   NULL,
  `reading_type`    ENUM('PRE_CAL','POST_CAL','INSPECTION','OTHER') NOT NULL DEFAULT 'OTHER',
  `notes`           TEXT          NULL,
  `recorded_by_employee_id` VARCHAR(7) NOT NULL,
  `recorded_at`     DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  KEY `idx_jcr_jc`        (`jc_section_no`, `recorded_at`),
  CONSTRAINT `fk_jcr_jc`  FOREIGN KEY (`jc_section_no`) REFERENCES `cmms_jobcard_mst`(`JM_SectionJobNo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci
  COMMENT='Phase 9: Tab 9 — Observations & Readings (structured)';

-- ─────────────────────────────────────────────────────────────────────
-- 6. job_card_status_history — mirrors job_request_status_history.
--    One row per state-machine transition (audit pairing doctrine 6).
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `job_card_status_history` (
  `history_id`      BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `jc_section_no`   VARCHAR(9)    NOT NULL,
  `from_status`     VARCHAR(30)   NULL,
  `to_status`       VARCHAR(30)   NOT NULL,
  `transitioned_at` DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `transitioned_by` VARCHAR(7)    NOT NULL COMMENT 'employee_id of the actor',
  `reason`          VARCHAR(1000) NULL,
  KEY `idx_jcsh_jc`       (`jc_section_no`, `transitioned_at`),
  KEY `idx_jcsh_actor`    (`transitioned_by`),
  KEY `idx_jcsh_time`     (`transitioned_at`),
  CONSTRAINT `fk_jcsh_jc` FOREIGN KEY (`jc_section_no`) REFERENCES `cmms_jobcard_mst`(`JM_SectionJobNo`),
  CONSTRAINT `fk_jcsh_actor` FOREIGN KEY (`transitioned_by`) REFERENCES `cmms_emp_mst`(`EMM_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci
  COMMENT='Phase 9: JC state machine transition log';

SELECT '✓ Migration 301 complete (6 tables ensured)' AS status;
SELECT TABLE_NAME, TABLE_ROWS
  FROM information_schema.TABLES
 WHERE TABLE_SCHEMA = DATABASE()
   AND TABLE_NAME IN ('jc_maintenance_details','jc_spares_used','jc_task_checklist',
                      'jc_documents','jc_observations_readings','job_card_status_history')
 ORDER BY TABLE_NAME;
