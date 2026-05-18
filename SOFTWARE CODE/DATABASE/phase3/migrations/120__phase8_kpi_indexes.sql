-- ════════════════════════════════════════════════════════════════════
-- CMCMIS_SIMPLIFIED — Migration 120 (Phase 8 Slice 1)
-- File:     120__phase8_kpi_indexes.sql
-- Purpose:  Add 4 covering indexes to keep Dashboard KPI aggregation
--           queries off the table-scan path.
--
--   1. cmms_eqip_mst.idx_eqip_status_caldue
--        (EQM_MVP_STATUS, EQM_CAL_DUE_DATE)
--        Drives ORG "Calibration Due" KPI:
--          WHERE EQM_MVP_STATUS='ACTIVE' AND EQM_CAL_DUE_DATE <= today+7d
--
--   2. cmms_eqip_mst.idx_eqip_creator_caldue
--        (EQM_CREATED_BY, EQM_CAL_DUE_DATE)
--        Drives PERSONAL "Due for Calibration" KPI:
--          WHERE EQM_CREATED_BY=? AND EQM_CAL_DUE_DATE <= today+30d
--
--   3. cmms_jobcard_mst.idx_jc_status_verified
--        (JM_MVP_STATUS, JM_VERIFIED_ON)
--        Drives ORG "Completed This Week" KPI (verified rows):
--          WHERE JM_MVP_STATUS IN ('VERIFIED_CLOSED','COMPLETED')
--            AND JM_VERIFIED_ON >= start_of_iso_week()
--
--   4. cmms_jobcard_mst.idx_jc_status_ended
--        (JM_MVP_STATUS, JM_JobEndDate)
--        Fallback for COMPLETED rows that don't yet have JM_VERIFIED_ON.
--
-- ADD-only. NO DROP / RENAME / MODIFY. Idempotent via information_schema
-- guard pattern from Phase 6 mig 102 + Phase 7 mig 111.
-- ════════════════════════════════════════════════════════════════════

SET NAMES utf8mb4;
SET sql_mode = 'STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';

-- ── 120.1  cmms_eqip_mst (EQM_MVP_STATUS, EQM_CAL_DUE_DATE) ──────────
-- Composite covers the ORG dashboard's "Calibration Due" card. The
-- single-column idx_eqip_cal_due is left in place — it still helps when
-- the filter is *only* on date with no status predicate.
SET @i := (SELECT COUNT(*) FROM information_schema.statistics
            WHERE table_schema=DATABASE() AND table_name='cmms_eqip_mst'
              AND index_name='idx_eqip_status_caldue');
SET @sql := IF(@i>0, 'SELECT 1',
  'ALTER TABLE `cmms_eqip_mst`
     ADD INDEX `idx_eqip_status_caldue`
         (`EQM_MVP_STATUS`, `EQM_CAL_DUE_DATE`)');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;


-- ── 120.2  cmms_eqip_mst (EQM_CREATED_BY, EQM_CAL_DUE_DATE) ──────────
-- Personal scope: "equipment that I (employee_id) registered, calibration
-- due in next 30 days". EQM_CREATED_BY is a varchar(7) employee_id —
-- repeat-scan friendly when each Normal User has ≤ a few hundred rows.
SET @i := (SELECT COUNT(*) FROM information_schema.statistics
            WHERE table_schema=DATABASE() AND table_name='cmms_eqip_mst'
              AND index_name='idx_eqip_creator_caldue');
SET @sql := IF(@i>0, 'SELECT 1',
  'ALTER TABLE `cmms_eqip_mst`
     ADD INDEX `idx_eqip_creator_caldue`
         (`EQM_CREATED_BY`, `EQM_CAL_DUE_DATE`)');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;


-- ── 120.3  cmms_jobcard_mst (JM_MVP_STATUS, JM_VERIFIED_ON) ──────────
-- "Completed This Week" — primary index for VERIFIED_CLOSED rows.
SET @i := (SELECT COUNT(*) FROM information_schema.statistics
            WHERE table_schema=DATABASE() AND table_name='cmms_jobcard_mst'
              AND index_name='idx_jc_status_verified');
SET @sql := IF(@i>0, 'SELECT 1',
  'ALTER TABLE `cmms_jobcard_mst`
     ADD INDEX `idx_jc_status_verified`
         (`JM_MVP_STATUS`, `JM_VERIFIED_ON`)');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;


-- ── 120.4  cmms_jobcard_mst (JM_MVP_STATUS, JM_JobEndDate) ───────────
-- Fallback for rows that have left the bench but not yet been verified
-- (status='COMPLETED' but JM_VERIFIED_ON IS NULL).
SET @i := (SELECT COUNT(*) FROM information_schema.statistics
            WHERE table_schema=DATABASE() AND table_name='cmms_jobcard_mst'
              AND index_name='idx_jc_status_ended');
SET @sql := IF(@i>0, 'SELECT 1',
  'ALTER TABLE `cmms_jobcard_mst`
     ADD INDEX `idx_jc_status_ended`
         (`JM_MVP_STATUS`, `JM_JobEndDate`)');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;


-- ── 120.5  Verify ────────────────────────────────────────────────────
SELECT
  table_name, index_name,
  GROUP_CONCAT(column_name ORDER BY seq_in_index) AS columns
  FROM information_schema.statistics
 WHERE table_schema=DATABASE()
   AND index_name IN (
        'idx_eqip_status_caldue',
        'idx_eqip_creator_caldue',
        'idx_jc_status_verified',
        'idx_jc_status_ended'
       )
 GROUP BY table_name, index_name
 ORDER BY table_name, index_name;

SELECT '✓ Migration 120 complete — Phase 8 KPI indexes' AS result;
