-- ════════════════════════════════════════════════════════════════════
-- CMCMIS_SIMPLIFIED — Phase 6 Slice 1 — DB Introspection Script
-- File:    0001_phase6_introspect.sql
-- Purpose: Read-only SHOW CREATE TABLE for every table this module
--          touches. Run BEFORE writing any repo code and BEFORE applying
--          the Phase 6 migrations. Output is used to verify that the
--          canonical-to-legacy mapping in SCHEMA_PHASE6.md still matches
--          what is actually on disk.
--
-- Usage:
--          mysql -u root final < 0001_phase6_introspect.sql > introspect_2026-05-18.out
--
-- Idempotent: YES (read-only).
-- ════════════════════════════════════════════════════════════════════

SET NAMES utf8mb4;
SET sql_mode = 'STRICT_TRANS_TABLES';

-- ─── Identity & RBAC ────────────────────────────────────────────────
SHOW CREATE TABLE `users`;
SHOW CREATE TABLE `user_roles`;
SHOW CREATE TABLE `roles`;
SHOW CREATE TABLE `permissions`;
SHOW CREATE TABLE `role_permissions`;

-- ─── Job Request universe ───────────────────────────────────────────
SHOW CREATE TABLE `cmms_jobrequest_mst`;
SHOW CREATE TABLE `job_request_status_history`;

-- This table may or may not exist; presence will be verified after
-- migration 101__phase6_accessories_table.sql is applied. Wrap in
-- IF EXISTS via a dummy SELECT so the script never fails the run.
SELECT '-- (job_request_accessories — created by 101__phase6_accessories_table.sql)' AS note;

-- ─── Job Card universe ──────────────────────────────────────────────
SHOW CREATE TABLE `cmms_jobcard_mst`;

-- ─── Master / lookup tables ─────────────────────────────────────────
SHOW CREATE TABLE `cmms_emp_mst`;
SHOW CREATE TABLE `cmms_eqip_mst`;
SHOW CREATE TABLE `cmms_section_mst`;
SHOW CREATE TABLE `cmms_cont_mst`;

-- ─── Audit log ──────────────────────────────────────────────────────
SHOW CREATE TABLE `audit_log`;

-- ─── Index inventory for the JR/JC tables ───────────────────────────
-- This proves whether the covering indexes we propose in
-- 102__phase6_indexes.sql already exist (some are seeded by Phase 3
-- migration 002__alter_legacy_tables.sql).
SELECT
  TABLE_NAME,
  INDEX_NAME,
  GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS columns,
  NON_UNIQUE
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN ('cmms_jobrequest_mst', 'cmms_jobcard_mst', 'job_request_accessories')
GROUP BY TABLE_NAME, INDEX_NAME, NON_UNIQUE
ORDER BY TABLE_NAME, INDEX_NAME;

-- ─── Quick row counts (for capacity planning) ───────────────────────
SELECT 'cmms_jobrequest_mst' AS tbl, COUNT(*) AS row_count FROM cmms_jobrequest_mst
UNION ALL
SELECT 'cmms_jobcard_mst',           COUNT(*) FROM cmms_jobcard_mst
UNION ALL
SELECT 'cmms_emp_mst',               COUNT(*) FROM cmms_emp_mst
UNION ALL
SELECT 'cmms_eqip_mst',              COUNT(*) FROM cmms_eqip_mst
UNION ALL
SELECT 'cmms_section_mst',           COUNT(*) FROM cmms_section_mst
UNION ALL
SELECT 'users',                      COUNT(*) FROM users
UNION ALL
SELECT 'audit_log',                  COUNT(*) FROM audit_log;

-- ────────────────────────────────────────────────────────────────────
-- DONE. Compare the output to SCHEMA_PHASE6.md sections 2 and 3.
-- Any divergence (renamed column, removed column, changed type)
-- MUST be reflected in repo aliases BEFORE writing service code.
-- ────────────────────────────────────────────────────────────────────
