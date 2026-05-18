-- ════════════════════════════════════════════════════════════════════
-- CMCMIS_SIMPLIFIED — Migration 101 (Phase 6 Slice 1)
-- File:     101__phase6_accessories_table.sql
-- Purpose:  Create the job_request_accessories child table.
--           Each Job Request may carry 0..20 accessory rows (type, name,
--           serial_no). Storage decision P6-D2 in SCHEMA_PHASE6.md: a
--           normalised child table (not a JSON column) so individual
--           accessories are queryable in future slices.
--
-- IDEMPOTENT: CREATE TABLE IF NOT EXISTS — safe to re-run.
-- ADD-only:   no relationship to existing rows is altered.
--
-- Author:   Claude (AI engineering pair) for Deep Sorathiya (DS)
-- Version:  Phase 6 Slice 1
-- ════════════════════════════════════════════════════════════════════

SET NAMES utf8mb4;
SET sql_mode = 'STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';

CREATE TABLE IF NOT EXISTS `job_request_accessories` (
  `acc_id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT
                   COMMENT 'Phase 6: row id',
  `jr_no`          INT             NOT NULL
                   COMMENT 'FK → cmms_jobrequest_mst.JR_JOBREQUESTNO',
  `accessory_type` VARCHAR(60)     NOT NULL
                   COMMENT 'Free-form category (probe, cable, adapter, …)',
  `accessory_name` VARCHAR(120)    NOT NULL,
  `serial_no`      VARCHAR(120)    NULL DEFAULT NULL,
  `position`       SMALLINT UNSIGNED NOT NULL DEFAULT 0
                   COMMENT 'UI ordering — render rows in this order',
  `created_at`     DATETIME(6)     NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`acc_id`),
  CONSTRAINT `fk_jra_jr`
    FOREIGN KEY (`jr_no`) REFERENCES `cmms_jobrequest_mst` (`JR_JOBREQUESTNO`)
    ON DELETE CASCADE,
  INDEX `idx_jra_jr_pos` (`jr_no`, `position`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci
  COMMENT='Phase 6: accessory child rows for a Job Request';


-- Verify
SELECT
  CONCAT('✓ Migration 101 complete — job_request_accessories ',
         CASE WHEN (SELECT COUNT(*) FROM information_schema.tables
                     WHERE table_schema=DATABASE()
                       AND table_name='job_request_accessories') = 1
              THEN 'present' ELSE 'MISSING (failure)' END) AS result;
