-- ════════════════════════════════════════════════════════════════════
-- CMCMIS_SIMPLIFIED — Migration 773 (Phase 16 · Dynamic Tasks CRUD)
-- File:     773__dynamic_tasks_crud.sql
-- Purpose:  Seed administrative permission code granted strictly to SUPER_ADMIN role.
-- ════════════════════════════════════════════════════════════════════

SET NAMES utf8mb4;

-- ── 773.1  Seed tasks:manage permission ──────────────────────────────
INSERT IGNORE INTO `permissions`
  (`permission_code`,    `resource`,  `action`,    `description`,                                              `is_system`, `created_at`)
VALUES
  ('tasks:manage',       'tasks',     'manage',    'Manage legacy tasks master (CRUD)',                        1, NOW(6));

-- ── 773.2  Grant tasks:manage to SUPER_ADMIN role ────────────────────
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`, `granted_at`, `granted_by`)
SELECT r.role_id, p.permission_id, NOW(6), 'BOOTSTRAP'
  FROM `roles` r
  CROSS JOIN `permissions` p
 WHERE r.role_code = 'SUPER_ADMIN'
   AND p.permission_code = 'tasks:manage';

-- ── 773.3  Verify ────────────────────────────────────────────────────
SELECT
  p.permission_code,
  COUNT(rp.role_id)                            AS granted_roles,
  GROUP_CONCAT(r.role_code ORDER BY r.role_id) AS roles
  FROM `permissions` p
  LEFT JOIN `role_permissions` rp ON rp.permission_id = p.permission_id
  LEFT JOIN `roles`            r  ON r.role_id        = rp.role_id
 WHERE p.permission_code = 'tasks:manage'
 GROUP BY p.permission_code;

SELECT '✓ Migration 773 complete — Tasks CRUD permission created & granted' AS result;
