-- ════════════════════════════════════════════════════════════════════
-- CMCMIS_SIMPLIFIED — Migration 790
-- File:     790__optimize_search_indexes.sql
-- Purpose:  Create B-Tree indexes for sorting columns to prevent filesorts
--           on list pagination views (job requests, job cards, equipment).
-- Idempotent: YES
-- ════════════════════════════════════════════════════════════════════

SET NAMES utf8mb4;
SET sql_mode = 'STRICT_TRANS_TABLES';

-- 1) idx_jc_created_on — composite BTREE on (JM_CREATED_ON, JM_JobCardNO).
--    Prevents filesorts when listing and sorting job cards by newest-first.
SET @idx_exists := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME   = 'cmms_jobcard_mst'
     AND INDEX_NAME   = 'idx_jc_created_on'
);
SET @ddl := IF(
  @idx_exists = 0,
  'CREATE INDEX `idx_jc_created_on` ON `cmms_jobcard_mst` (`JM_CREATED_ON`, `JM_JobCardNO`)',
  'SELECT ''skip: idx_jc_created_on already present'' AS note'
);
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2) idx_jr_created_at — composite BTREE on (JR_CREATED_AT, JR_JOBREQUESTNO).
--    Prevents filesorts when listing and sorting job requests by newest-first.
SET @idx_exists := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME   = 'cmms_jobrequest_mst'
     AND INDEX_NAME   = 'idx_jr_created_at'
);
SET @ddl := IF(
  @idx_exists = 0,
  'CREATE INDEX `idx_jr_created_at` ON `cmms_jobrequest_mst` (`JR_CREATED_AT`, `JR_JOBREQUESTNO`)',
  'SELECT ''skip: idx_jr_created_at already present'' AS note'
);
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3) idx_eqip_id_alone — BTREE on (EQM_ID).
--    Accelerates sorting by Equipment ID on equipment list view.
SET @idx_exists := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME   = 'cmms_eqip_mst'
     AND INDEX_NAME   = 'idx_eqip_id_alone'
);
SET @ddl := IF(
  @idx_exists = 0,
  'CREATE INDEX `idx_eqip_id_alone` ON `cmms_eqip_mst` (`EQM_ID`)',
  'SELECT ''skip: idx_eqip_id_alone already present'' AS note'
);
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ─────────────────────────────────────────────────────────────────────
-- Verify
-- ─────────────────────────────────────────────────────────────────────
SELECT '✓ Migration 790 complete (3 indexes ensured)' AS status;
