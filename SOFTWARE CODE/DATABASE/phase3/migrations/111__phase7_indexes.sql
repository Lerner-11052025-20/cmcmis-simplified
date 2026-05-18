-- ════════════════════════════════════════════════════════════════════
-- CMCMIS_SIMPLIFIED — Migration 111 (Phase 7 Slice 1)
-- File:     111__phase7_indexes.sql
-- Purpose:  Covering indexes for the adminUsers + employees list queries.
--
-- Existing useful indexes already present (Phase 3):
--   users:        idx_users_active (is_active,is_locked),
--                 idx_users_section, idx_users_created_at, uk_users_employee_id
--   user_roles:   PK (user_id), idx_ur_role (role_id)
--   cmms_emp_mst: idx_emm_active (EMM_INACTIVE)
--
-- New (Phase 7):
--   idx_users_active_created   — default list sort (is_active DESC, created_at DESC, user_id)
--   idx_emm_dept               — division filter on the employees list
-- ════════════════════════════════════════════════════════════════════

SET NAMES utf8mb4;
SET sql_mode = 'STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';

-- ── 111.1  users — default list (is_active, created_at DESC, user_id) ─
-- Used by GET /admin/users default sort. Index-only scan when no other
-- filter is more selective.
SET @i := (SELECT COUNT(*) FROM information_schema.statistics
            WHERE table_schema=DATABASE() AND table_name='users'
              AND index_name='idx_users_active_created');
SET @sql := IF(@i>0, 'SELECT 1',
  'ALTER TABLE `users`
     ADD INDEX `idx_users_active_created`
         (`is_active`, `created_at` DESC, `user_id`)');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;


-- ── 111.2  cmms_emp_mst — division filter on employees list ─────────
-- Already FK-indexed (FK_CMMS_EMP_MST_CMMS_SECTION_MST on EMM_DEPT), but
-- that index doesn't carry the is_active leading column. This explicit
-- index speeds up "employees in division X, active only" lookups.
SET @i := (SELECT COUNT(*) FROM information_schema.statistics
            WHERE table_schema=DATABASE() AND table_name='cmms_emp_mst'
              AND index_name='idx_emm_active_dept');
SET @sql := IF(@i>0, 'SELECT 1',
  'ALTER TABLE `cmms_emp_mst`
     ADD INDEX `idx_emm_active_dept`
         (`EMM_INACTIVE`, `EMM_DEPT`)');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;


-- ── 111.3  users — section + role join optimisation ────────────────
-- For "all users in division X with role Y" queries (Phase 8 admin UI).
-- Slice 1 doesn't query this directly, but the index is cheap to add now.
-- Skipped if a covering index already exists.
-- (Phase 3 has idx_users_section already; no second index needed.)


-- ── 111.4  Verify ──────────────────────────────────────────────────
SELECT
  table_name, index_name,
  GROUP_CONCAT(column_name ORDER BY seq_in_index) AS columns
FROM information_schema.statistics
WHERE table_schema=DATABASE()
  AND ( (table_name='users' AND index_name='idx_users_active_created')
     OR (table_name='cmms_emp_mst' AND index_name='idx_emm_active_dept') )
GROUP BY table_name, index_name
ORDER BY table_name, index_name;

SELECT '✓ Migration 111 complete (Phase 7 indexes)' AS result;
