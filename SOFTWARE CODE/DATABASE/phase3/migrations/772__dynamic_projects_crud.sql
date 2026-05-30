-- ════════════════════════════════════════════════════════════════════
-- CMCMIS_SIMPLIFIED — Migration 772 (Phase 16 · Dynamic Projects CRUD)
-- File:     772__dynamic_projects_crud.sql
-- Purpose:  Seed administrative permission code granted strictly to SUPER_ADMIN role.
-- ════════════════════════════════════════════════════════════════════

SET NAMES utf8mb4;

-- ── 772.1  Seed projects:manage permission ──────────────────────────────
INSERT IGNORE INTO `permissions`
  (`permission_code`,    `resource`,  `action`,    `description`,                                              `is_system`, `created_at`)
VALUES
  ('projects:manage',    'projects',  'manage',    'Manage legacy projects master (CRUD)',                     1, NOW(6));

-- ── 772.2  Grant projects:manage to SUPER_ADMIN role ────────────────────
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`, `granted_at`, `granted_by`)
SELECT r.role_id, p.permission_id, NOW(6), 'BOOTSTRAP'
  FROM `roles` r
  CROSS JOIN `permissions` p
 WHERE r.role_code = 'SUPER_ADMIN'
   AND p.permission_code = 'projects:manage';

-- ── 772.3  Verify ────────────────────────────────────────────────────
SELECT
  p.permission_code,
  COUNT(rp.role_id)                            AS granted_roles,
  GROUP_CONCAT(r.role_code ORDER BY r.role_id) AS roles
  FROM `permissions` p
  LEFT JOIN `role_permissions` rp ON rp.permission_id = p.permission_id
  LEFT JOIN `roles`            r  ON r.role_id        = rp.role_id
 WHERE p.permission_code = 'projects:manage'
 GROUP BY p.permission_code;

SELECT '✓ Migration 772 complete — Projects CRUD permission created & granted' AS result;
