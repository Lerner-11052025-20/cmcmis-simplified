-- ════════════════════════════════════════════════════════════════════
-- CMCMIS_SIMPLIFIED — Migration 102 (Phase 6 Slice 1)
-- File:     102__phase6_indexes.sql
-- Purpose:  Add covering indexes for the JR/JC list queries so the
--           50ms p50 / 200ms p95 latency budget holds at 100k+ rows.
--
-- WHY each index (see SCHEMA_PHASE6.md §6):
--   idx_jr_list_default     Default list sort: ORDER BY status, created_at DESC,
--                            JR_JOBREQUESTNO. Used when no other filter is
--                            more selective. Index-only scan possible.
--   idx_jr_owner            Row-level scope for NORMAL_USER (read-own).
--                            (submitted_by_employee_id, created_at DESC).
--   idx_jr_division         Common LIC filter: division dropdown.
--   idx_jr_priority_status  Priority filter with status, e.g.
--                            "show me HIGH-priority pending requests".
--   idx_jc_list_default     Default JC list sort.
--   idx_jc_engineer         Engineer-scoped JC list (Lab Engineer's queue).
--
-- IDEMPOTENT: each CREATE INDEX is wrapped in an existence check
--             against information_schema.statistics, same pattern as
--             002__alter_legacy_tables.sql.
--
-- ADD-only:   never drops or rebuilds existing legacy indexes.
--
-- Author:   Claude (AI engineering pair) for Deep Sorathiya (DS)
-- Version:  Phase 6 Slice 1
-- ════════════════════════════════════════════════════════════════════

SET NAMES utf8mb4;
SET sql_mode = 'STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';

-- ── 102.1  cmms_jobrequest_mst — default list sort ─────────────────
SET @i := (SELECT COUNT(*) FROM information_schema.statistics
            WHERE table_schema=DATABASE() AND table_name='cmms_jobrequest_mst'
              AND index_name='idx_jr_list_default');
SET @sql := IF(@i>0, 'SELECT 1',
  'ALTER TABLE `cmms_jobrequest_mst`
     ADD INDEX `idx_jr_list_default`
         (`JR_MVP_STATUS`, `JR_CREATED_AT` DESC, `JR_JOBREQUESTNO`)');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;


-- ── 102.2  cmms_jobrequest_mst — owner scope (read-own) ────────────
SET @i := (SELECT COUNT(*) FROM information_schema.statistics
            WHERE table_schema=DATABASE() AND table_name='cmms_jobrequest_mst'
              AND index_name='idx_jr_owner_created');
SET @sql := IF(@i>0, 'SELECT 1',
  'ALTER TABLE `cmms_jobrequest_mst`
     ADD INDEX `idx_jr_owner_created`
         (`JR_SUBMITTEDBYID`, `JR_CREATED_AT` DESC)');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;


-- ── 102.3  cmms_jobrequest_mst — division filter ───────────────────
SET @i := (SELECT COUNT(*) FROM information_schema.statistics
            WHERE table_schema=DATABASE() AND table_name='cmms_jobrequest_mst'
              AND index_name='idx_jr_division_created');
SET @sql := IF(@i>0, 'SELECT 1',
  'ALTER TABLE `cmms_jobrequest_mst`
     ADD INDEX `idx_jr_division_created`
         (`JR_DIVISION`, `JR_CREATED_AT` DESC)');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;


-- ── 102.4  cmms_jobrequest_mst — priority + status ─────────────────
-- Phase 3 migration 002 already created idx_jr_priority on
-- (JR_PRIORITY, JR_MVP_STATUS). We additionally want created_at DESC
-- as the leading tie-break so we don't sort after the index scan.
SET @i := (SELECT COUNT(*) FROM information_schema.statistics
            WHERE table_schema=DATABASE() AND table_name='cmms_jobrequest_mst'
              AND index_name='idx_jr_priority_status_created');
SET @sql := IF(@i>0, 'SELECT 1',
  'ALTER TABLE `cmms_jobrequest_mst`
     ADD INDEX `idx_jr_priority_status_created`
         (`JR_PRIORITY`, `JR_MVP_STATUS`, `JR_CREATED_AT` DESC)');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;


-- ── 102.5  cmms_jobrequest_mst — job_type filter ───────────────────
SET @i := (SELECT COUNT(*) FROM information_schema.statistics
            WHERE table_schema=DATABASE() AND table_name='cmms_jobrequest_mst'
              AND index_name='idx_jr_jobtype_created');
SET @sql := IF(@i>0, 'SELECT 1',
  'ALTER TABLE `cmms_jobrequest_mst`
     ADD INDEX `idx_jr_jobtype_created`
         (`JR_JOB_TYPE`, `JR_CREATED_AT` DESC)');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;


-- ── 102.6  cmms_jobcard_mst — default list sort ────────────────────
-- JM_CREATED_ON is a legacy DATETIME(6) column; sort key works fine.
SET @i := (SELECT COUNT(*) FROM information_schema.statistics
            WHERE table_schema=DATABASE() AND table_name='cmms_jobcard_mst'
              AND index_name='idx_jc_list_default');
SET @sql := IF(@i>0, 'SELECT 1',
  'ALTER TABLE `cmms_jobcard_mst`
     ADD INDEX `idx_jc_list_default`
         (`JM_MVP_STATUS`, `JM_CREATED_ON` DESC, `JM_JobCardNO`)');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;


-- ── 102.7  cmms_jobcard_mst — recd-date sort (PlannedComletedDate) ─
-- Used by the JC list when sorted by due date.
SET @i := (SELECT COUNT(*) FROM information_schema.statistics
            WHERE table_schema=DATABASE() AND table_name='cmms_jobcard_mst'
              AND index_name='idx_jc_due_date');
SET @sql := IF(@i>0, 'SELECT 1',
  'ALTER TABLE `cmms_jobcard_mst`
     ADD INDEX `idx_jc_due_date`
         (`JM_PlannedComletedDate`, `JM_MVP_STATUS`)');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;


-- ── 102.8  Verify ──────────────────────────────────────────────────
SELECT
  table_name, index_name,
  GROUP_CONCAT(column_name ORDER BY seq_in_index) AS columns
FROM information_schema.statistics
WHERE table_schema=DATABASE()
  AND table_name IN ('cmms_jobrequest_mst', 'cmms_jobcard_mst')
  AND index_name LIKE 'idx_jr_%' OR index_name LIKE 'idx_jc_%'
GROUP BY table_name, index_name
ORDER BY table_name, index_name;

SELECT '✓ Migration 102 complete (Phase 6 indexes)' AS result;
