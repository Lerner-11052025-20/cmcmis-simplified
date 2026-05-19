-- ════════════════════════════════════════════════════════════════════
-- CMCMIS_SIMPLIFIED — Migration 304 (Phase 9)
-- File:     304__phase9_indexes.sql
-- Purpose:  ADD a few targeted indexes to support Phase 9 queries.
--
-- Indexes:
--   1. idx_jc_completion — covers Dashboard "completed today" KPI
--      and Closure-tab queries.
--   2. idx_jr_cancelled  — covers the list-endpoint filter that hides
--      cancelled DRAFTs from default list view.
--
-- Other child-table indexes were inlined into migration 301 (CREATE
-- TABLE statements). No need to re-create them here.
--
-- Idempotent: YES — INFORMATION_SCHEMA-guarded.
-- ════════════════════════════════════════════════════════════════════

SET NAMES utf8mb4;
SET sql_mode = 'STRICT_TRANS_TABLES';

-- 1) idx_jc_completion — supports queries like
--    "COUNT(*) FROM cmms_jobcard_mst WHERE marked_complete_at >= today"
SET @idx_exists := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME   = 'cmms_jobcard_mst'
     AND INDEX_NAME   = 'idx_jc_completion'
);
SET @ddl := IF(
  @idx_exists = 0,
  'CREATE INDEX `idx_jc_completion` ON `cmms_jobcard_mst` (`JM_MVP_STATUS`, `marked_complete_at` DESC)',
  'SELECT ''skip: idx_jc_completion already present'' AS note'
);
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2) idx_jr_cancelled — fast filter for hiding logically-cancelled
--    DRAFTs in the list endpoint.
SET @idx_exists := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME   = 'cmms_jobrequest_mst'
     AND INDEX_NAME   = 'idx_jr_cancelled'
);
SET @ddl := IF(
  @idx_exists = 0,
  'CREATE INDEX `idx_jr_cancelled` ON `cmms_jobrequest_mst` (`JR_CANCELLED_AT`)',
  'SELECT ''skip: idx_jr_cancelled already present'' AS note'
);
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3) idx_jc_verified_close — supports closure-tab queries against the
--    verified_closed_at column.
SET @idx_exists := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME   = 'cmms_jobcard_mst'
     AND INDEX_NAME   = 'idx_jc_verified_close_at'
);
SET @ddl := IF(
  @idx_exists = 0,
  'CREATE INDEX `idx_jc_verified_close_at` ON `cmms_jobcard_mst` (`verified_closed_at`)',
  'SELECT ''skip: idx_jc_verified_close_at already present'' AS note'
);
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Verify
SELECT '✓ Migration 304 complete' AS status;
SELECT INDEX_NAME, TABLE_NAME, GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS cols
  FROM information_schema.STATISTICS
 WHERE TABLE_SCHEMA = DATABASE()
   AND INDEX_NAME IN ('idx_jc_completion','idx_jr_cancelled','idx_jc_verified_close_at')
 GROUP BY INDEX_NAME, TABLE_NAME
 ORDER BY INDEX_NAME;
