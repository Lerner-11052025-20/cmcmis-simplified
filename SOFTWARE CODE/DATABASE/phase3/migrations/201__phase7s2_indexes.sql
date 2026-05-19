-- ════════════════════════════════════════════════════════════════════
-- CMCMIS_SIMPLIFIED — Migration 201 (Phase 7 Slice 2)
-- File:     201__phase7s2_indexes.sql
-- Purpose:  Index `(JM_ASSIGNED_ENGINEER, JM_MVP_STATUS)` so the engineer-
--           workload subquery used by GET /lookups/engineers can serve
--           5000 engineer rows in < 5 ms.
--
-- WHY THIS INDEX:
--   The dropdown query computes:
--       active_card_count = COUNT(*) FROM cmms_jobcard_mst
--                            WHERE JM_ASSIGNED_ENGINEER = ?
--                              AND JM_MVP_STATUS IN ('ASSIGNED','IN_PROGRESS')
--   Without this index, MySQL scans 19,432 rows per engineer per dropdown
--   render. With it: index seek → ~O(log n + matches) per engineer.
--
-- Idempotent: YES — DROP INDEX IF EXISTS pattern via INFORMATION_SCHEMA
--             guard (same pattern as Phase 8 migration 120).
-- ════════════════════════════════════════════════════════════════════

SET NAMES utf8mb4;
SET sql_mode = 'STRICT_TRANS_TABLES';

-- 1) idx_jc_engineer_status — composite BTREE on (engineer, status).
--    Leading column = engineer (high selectivity once we have many engineers);
--    trailing column = status (low cardinality but used in the WHERE).
SET @idx_exists := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME   = 'cmms_jobcard_mst'
     AND INDEX_NAME   = 'idx_jc_engineer_status'
);
SET @ddl := IF(
  @idx_exists = 0,
  'CREATE INDEX `idx_jc_engineer_status` ON `cmms_jobcard_mst` (`JM_ASSIGNED_ENGINEER`, `JM_MVP_STATUS`)',
  'SELECT ''skip: idx_jc_engineer_status already present'' AS note'
);
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2) idx_jc_parent_jr — supports "given a JR, find its JC" reverse lookup.
--    Useful in the Detail page's "linked Job Card" panel (alternative to
--    walking JR_SECTIONJOB_NO via JOIN). Single-column BTREE, narrow.
SET @idx_exists := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME   = 'cmms_jobcard_mst'
     AND INDEX_NAME   = 'idx_jc_parent_jr'
);
SET @ddl := IF(
  @idx_exists = 0,
  'CREATE INDEX `idx_jc_parent_jr` ON `cmms_jobcard_mst` (`JM_PARENT_JR_NO`)',
  'SELECT ''skip: idx_jc_parent_jr already present'' AS note'
);
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ─────────────────────────────────────────────────────────────────────
-- Verify
-- ─────────────────────────────────────────────────────────────────────
SELECT '✓ Migration 201 complete (2 indexes ensured)' AS status;
SELECT INDEX_NAME,
       GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS columns,
       INDEX_TYPE
  FROM information_schema.STATISTICS
 WHERE TABLE_SCHEMA = DATABASE()
   AND TABLE_NAME   = 'cmms_jobcard_mst'
   AND INDEX_NAME IN ('idx_jc_engineer_status','idx_jc_parent_jr')
 GROUP BY INDEX_NAME, INDEX_TYPE;
