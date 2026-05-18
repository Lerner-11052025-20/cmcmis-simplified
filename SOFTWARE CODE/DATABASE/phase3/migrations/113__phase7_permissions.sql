-- ════════════════════════════════════════════════════════════════════
-- CMCMIS_SIMPLIFIED — Migration 113 (Phase 7 Slice 1)
-- File:     113__phase7_permissions.sql
-- Purpose:  Seed three NEW permission codes (P7-D9) and grant them to
--           SUPER_ADMIN (role_id=1) only.
--
--             user:activate       — split out of legacy user:activate-deactivate
--             user:deactivate     — split out of legacy user:activate-deactivate
--             user:force-logout   — new (Q-5) bumps token_version only
--
--           Legacy `user:activate-deactivate` permission row is KEPT as-is
--           for backwards compat with any code that already checks it.
--
-- IDEMPOTENT: INSERT IGNORE on uk_perm_code and PK(role_id, permission_id).
-- ════════════════════════════════════════════════════════════════════

SET NAMES utf8mb4;

-- ── 113.1  INSERT IGNORE the 3 new permission rows ─────────────────
INSERT IGNORE INTO `permissions`
  (`permission_code`, `resource`, `action`, `description`, `is_system`, `created_at`)
VALUES
  ('user:activate',     'user', 'activate',     'Activate a user account (is_active 0→1)',   1, NOW(6)),
  ('user:deactivate',   'user', 'deactivate',   'Deactivate a user account with reason',     1, NOW(6)),
  ('user:force-logout', 'user', 'force-logout', 'Revoke all live sessions for a user',       1, NOW(6));


-- ── 113.2  Grant the new permissions to SUPER_ADMIN (role_id=1) ────
-- Sub-select resolves the permission_ids that were just inserted (or
-- already existed from a previous run). INSERT IGNORE on the PK
-- (role_id, permission_id) makes re-runs no-ops.
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`, `granted_at`, `granted_by`)
SELECT 1, p.permission_id, NOW(6), 'BOOTSTRAP'
  FROM `permissions` p
 WHERE p.permission_code IN ('user:activate', 'user:deactivate', 'user:force-logout');


-- Verify
SELECT '✓ Migration 113 complete — 3 new permissions' AS status;
SELECT p.permission_code, COUNT(rp.role_id) AS granted_to_roles
  FROM permissions p
  LEFT JOIN role_permissions rp ON rp.permission_id = p.permission_id
 WHERE p.permission_code IN ('user:activate', 'user:deactivate', 'user:force-logout')
 GROUP BY p.permission_code;
