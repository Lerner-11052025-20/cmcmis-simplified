-- ════════════════════════════════════════════════════════════════════
-- CMCMIS_SIMPLIFIED — Migration 100 (Phase 6 Slice 1)
-- File:     100__phase6_jr_columns.sql
-- Purpose:  Additive ALTER TABLE on cmms_jobrequest_mst to support the
--           Phase 6 Job Request module. Adds:
--             - JR_JOB_CATEGORY   ENUM('TME','FPE')         NULL
--             - JR_JOB_TYPE       ENUM('CALIBRATION','REPAIR','REGISTRATION') NULL
--             - JR_TNC_ACCEPTED_AT  DATETIME(6)             NULL
--             - JR_TNC_VERSION    VARCHAR(10)               NULL DEFAULT 'v1'
--             - JR_CREATED_AT     DATETIME(6) NOT NULL DEFAULT NOW(6)
--             - JR_UPDATED_AT     DATETIME(6) NOT NULL DEFAULT NOW(6) ON UPDATE
--
-- WHY each column (see SCHEMA_PHASE6.md decisions register):
--   • JOB_CATEGORY / JOB_TYPE — strict enums for FE filter dropdowns
--   • TNC_*                   — BR-AUD-01 compliance audit
--   • CREATED_AT / UPDATED_AT — index-friendly list sort (JR_JOBREQUESTDATE
--                               has no DATETIME(6) precision and was NULL
--                               for some legacy rows). Backfilled in this
--                               migration from JR_JOBREQUESTDATE.
--
-- ADD-only. No DROP, no MODIFY-NULL flip. Idempotent via
-- information_schema.columns existence checks (same pattern as
-- 002__alter_legacy_tables.sql).
--
-- Author:    Claude (AI engineering pair) for Deep Sorathiya (DS)
-- Version:   Phase 6 Slice 1
-- ════════════════════════════════════════════════════════════════════

SET NAMES utf8mb4;
SET sql_mode = 'STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';

-- ── 100.1  JR_JOB_CATEGORY ─────────────────────────────────────────
-- Enum because the legacy JR_REQUEST_TYPE is varchar(25) free-form;
-- enforcing the canonical 2-value enum at the DB level gives us
-- deterministic FE filter dropdowns.
SET @c := (SELECT COUNT(*) FROM information_schema.columns
            WHERE table_schema=DATABASE() AND table_name='cmms_jobrequest_mst'
              AND column_name='JR_JOB_CATEGORY');
SET @sql := IF(@c>0,
  'SELECT 1',
  "ALTER TABLE `cmms_jobrequest_mst`
     ADD COLUMN `JR_JOB_CATEGORY` ENUM('TME','FPE') NULL DEFAULT NULL
     COMMENT 'Phase 6: TME (Test&Measurement) vs FPE (Fabrication&ProcessEquipment)'");
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;


-- ── 100.2  JR_JOB_TYPE ─────────────────────────────────────────────
SET @c := (SELECT COUNT(*) FROM information_schema.columns
            WHERE table_schema=DATABASE() AND table_name='cmms_jobrequest_mst'
              AND column_name='JR_JOB_TYPE');
SET @sql := IF(@c>0,
  'SELECT 1',
  "ALTER TABLE `cmms_jobrequest_mst`
     ADD COLUMN `JR_JOB_TYPE` ENUM('CALIBRATION','REPAIR','REGISTRATION') NULL DEFAULT NULL
     COMMENT 'Phase 6: kind of work requested'");
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;


-- ── 100.3  JR_TNC_ACCEPTED_AT ──────────────────────────────────────
-- NULL until DRAFT→SUBMITTED. Service writes NOW(6) on the transition.
SET @c := (SELECT COUNT(*) FROM information_schema.columns
            WHERE table_schema=DATABASE() AND table_name='cmms_jobrequest_mst'
              AND column_name='JR_TNC_ACCEPTED_AT');
SET @sql := IF(@c>0,
  'SELECT 1',
  "ALTER TABLE `cmms_jobrequest_mst`
     ADD COLUMN `JR_TNC_ACCEPTED_AT` DATETIME(6) NULL DEFAULT NULL
     COMMENT 'Phase 6: when the requester accepted all 6 T&C checkboxes'");
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;


-- ── 100.4  JR_TNC_VERSION ──────────────────────────────────────────
SET @c := (SELECT COUNT(*) FROM information_schema.columns
            WHERE table_schema=DATABASE() AND table_name='cmms_jobrequest_mst'
              AND column_name='JR_TNC_VERSION');
SET @sql := IF(@c>0,
  'SELECT 1',
  "ALTER TABLE `cmms_jobrequest_mst`
     ADD COLUMN `JR_TNC_VERSION` VARCHAR(10) NULL DEFAULT 'v1'
     COMMENT 'Phase 6: version string of the T&C set that was accepted'");
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;


-- ── 100.5  JR_CREATED_AT ───────────────────────────────────────────
-- Default current timestamp so backfill (below) and new inserts both work.
-- Legacy rows get backfilled from JR_JOBREQUESTDATE.
SET @c := (SELECT COUNT(*) FROM information_schema.columns
            WHERE table_schema=DATABASE() AND table_name='cmms_jobrequest_mst'
              AND column_name='JR_CREATED_AT');
SET @sql := IF(@c>0,
  'SELECT 1',
  "ALTER TABLE `cmms_jobrequest_mst`
     ADD COLUMN `JR_CREATED_AT` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
     COMMENT 'Phase 6: deterministic creation timestamp; index-friendly'");
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;


-- ── 100.6  JR_UPDATED_AT ───────────────────────────────────────────
SET @c := (SELECT COUNT(*) FROM information_schema.columns
            WHERE table_schema=DATABASE() AND table_name='cmms_jobrequest_mst'
              AND column_name='JR_UPDATED_AT');
SET @sql := IF(@c>0,
  'SELECT 1',
  "ALTER TABLE `cmms_jobrequest_mst`
     ADD COLUMN `JR_UPDATED_AT` DATETIME(6) NOT NULL
       DEFAULT CURRENT_TIMESTAMP(6)
       ON UPDATE CURRENT_TIMESTAMP(6)
     COMMENT 'Phase 6: auto-touched on every row update'");
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;


-- ── 100.7  Backfill JR_CREATED_AT from JR_JOBREQUESTDATE ───────────
-- Idempotent: only rows whose JR_CREATED_AT is "default-fresh" (within 5
-- minutes of NOW(6)) get backfilled. After the first run, JR_CREATED_AT
-- holds the real legacy timestamp; subsequent runs see those rows as
-- "old" and skip them.
--
-- We only touch rows where JR_JOBREQUESTDATE is not NULL — for the
-- handful of NULL legacy rows we leave the auto-default NOW() value
-- in place rather than guess.
UPDATE `cmms_jobrequest_mst`
   SET `JR_CREATED_AT` = `JR_JOBREQUESTDATE`,
       `JR_UPDATED_AT` = COALESCE(`JR_MVP_STATUS_AT`, `JR_JOBREQUESTDATE`)
 WHERE `JR_JOBREQUESTDATE` IS NOT NULL
   AND `JR_CREATED_AT` > DATE_SUB(NOW(6), INTERVAL 5 MINUTE);


-- ── 100.8  Verify ──────────────────────────────────────────────────
SELECT
  CONCAT('✓ Migration 100 complete — added ',
         SUM(CASE WHEN column_name IN
             ('JR_JOB_CATEGORY','JR_JOB_TYPE','JR_TNC_ACCEPTED_AT',
              'JR_TNC_VERSION','JR_CREATED_AT','JR_UPDATED_AT')
             THEN 1 ELSE 0 END),
         ' / 6 Phase-6 columns on cmms_jobrequest_mst') AS result
  FROM information_schema.columns
 WHERE table_schema=DATABASE()
   AND table_name='cmms_jobrequest_mst';
