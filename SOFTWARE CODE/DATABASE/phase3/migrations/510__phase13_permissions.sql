-- ════════════════════════════════════════════════════════════════════
-- CMCMIS_SIMPLIFIED — Migration 510 (Phase 13 · Permissions)
-- File:     510__phase13_permissions.sql
-- Purpose:  Idempotent ADD-only seed for 12 Schedule + Procurement
--           permission codes. Replaces the BORROWED equipment:read-list
--           gate that Schedule + Procurement nav items used since Phase 5.
--
-- ROLE MATRIX (Phase 13 §4, senior call):
--   ╔══════════════╦═══════════════════════╦══════════════════════════╗
--   ║              ║  SCHEDULE             ║  PROCUREMENT             ║
--   ╠══════════════╬═══════════════════════╬══════════════════════════╣
--   ║ SUPER_ADMIN  ║ ALL (5)               ║ ALL (7)                  ║
--   ║ LAB_IN_CHARGE║ ALL (5)               ║ ALL (7)                  ║
--   ║ LAB_ENGINEER ║ read-list, update     ║ read-list, order, export ║
--   ║              ║                       ║   (no PO/spare create)   ║
--   ║ NORMAL_USER  ║ read-list             ║ read-list                ║
--   ║ VIEW_ONLY    ║ read-list             ║ read-list                ║
--   ╚══════════════╩═══════════════════════╩══════════════════════════╝
--
--   View-Only gets read access on the two new pages so the sidebar entries
--   are reachable (they were already reachable via the borrowed equipment
--   gate). Write/order/export is strictly excluded — same pattern as
--   reports:export.
--
-- IDEMPOTENT: INSERT IGNORE on permissions.uk_perm_code and
--             role_permissions PK (role_id, permission_id).
-- ════════════════════════════════════════════════════════════════════

SET NAMES utf8mb4;

-- ── 510.1  Permission codes ──────────────────────────────────────────
INSERT IGNORE INTO `permissions`
  (`permission_code`,             `resource`,     `action`,        `description`,                                                          `is_system`, `created_at`)
VALUES
  -- Schedule (5)
  ('schedule:read-list',           'schedule',    'read-list',     'List + read PM and Calibration schedules',                              1, NOW(6)),
  ('schedule:create',              'schedule',    'create',        'Create a new PM or Calibration schedule',                               1, NOW(6)),
  ('schedule:update',              'schedule',    'update',        'Edit / transition / reassign engineer on a schedule',                   1, NOW(6)),
  ('schedule:delete',              'schedule',    'delete',        'Cancel (logical delete) a schedule',                                    1, NOW(6)),
  ('schedule:export',              'schedule',    'export',        'Download .ics feeds + CSV exports for schedules',                       1, NOW(6)),
  -- Procurement (7)
  ('procurement:read-list',        'procurement', 'read-list',     'List + read POs and spare parts',                                       1, NOW(6)),
  ('procurement:po-create',        'procurement', 'po-create',     'Create a Purchase Order',                                               1, NOW(6)),
  ('procurement:po-update',        'procurement', 'po-update',     'Edit a Purchase Order (status, notes, line items)',                     1, NOW(6)),
  ('procurement:spare-create',     'procurement', 'spare-create',  'Add a spare-part inventory row',                                        1, NOW(6)),
  ('procurement:spare-update',     'procurement', 'spare-update',  'Edit a spare-part inventory row',                                       1, NOW(6)),
  ('procurement:order',            'procurement', 'order',         'Trigger an Order from a spare row (creates / opens a PO)',              1, NOW(6)),
  ('procurement:export',           'procurement', 'export',        'Download CSV exports of PO and spare lists',                            1, NOW(6));


-- ── 510.2  Grant matrix per role ─────────────────────────────────────

-- SUPER_ADMIN + LAB_IN_CHARGE: every Phase-13 perm.
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`, `granted_at`, `granted_by`)
SELECT r.role_id, p.permission_id, NOW(6), 'BOOTSTRAP'
  FROM `roles` r
  CROSS JOIN `permissions` p
 WHERE r.role_code IN ('SUPER_ADMIN','LAB_IN_CHARGE')
   AND p.permission_code IN (
        'schedule:read-list',     'schedule:create',     'schedule:update',
        'schedule:delete',        'schedule:export',
        'procurement:read-list',  'procurement:po-create','procurement:po-update',
        'procurement:spare-create','procurement:spare-update',
        'procurement:order',      'procurement:export'
       );

-- LAB_ENGINEER: read both, can update assigned schedules (their PM work),
-- can order + export from procurement, but NO PO/spare create.
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`, `granted_at`, `granted_by`)
SELECT r.role_id, p.permission_id, NOW(6), 'BOOTSTRAP'
  FROM `roles` r
  CROSS JOIN `permissions` p
 WHERE r.role_code = 'LAB_ENGINEER'
   AND p.permission_code IN (
        'schedule:read-list',
        'schedule:update',
        'schedule:export',
        'procurement:read-list',
        'procurement:order',
        'procurement:export'
       );

-- NORMAL_USER: read-list on both.
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`, `granted_at`, `granted_by`)
SELECT r.role_id, p.permission_id, NOW(6), 'BOOTSTRAP'
  FROM `roles` r
  CROSS JOIN `permissions` p
 WHERE r.role_code = 'NORMAL_USER'
   AND p.permission_code IN (
        'schedule:read-list',
        'procurement:read-list'
       );

-- VIEW_ONLY: read-list on both. Strictly NO export/create/update/order.
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`, `granted_at`, `granted_by`)
SELECT r.role_id, p.permission_id, NOW(6), 'BOOTSTRAP'
  FROM `roles` r
  CROSS JOIN `permissions` p
 WHERE r.role_code = 'VIEW_ONLY'
   AND p.permission_code IN (
        'schedule:read-list',
        'procurement:read-list'
       );


-- ── 510.3  Verify ────────────────────────────────────────────────────
SELECT
  p.permission_code,
  COUNT(rp.role_id)                            AS granted_roles,
  GROUP_CONCAT(r.role_code ORDER BY r.role_id) AS roles
  FROM `permissions` p
  LEFT JOIN `role_permissions` rp ON rp.permission_id = p.permission_id
  LEFT JOIN `roles`            r  ON r.role_id        = rp.role_id
 WHERE p.permission_code LIKE 'schedule:%'
    OR p.permission_code LIKE 'procurement:%'
 GROUP BY p.permission_code
 ORDER BY p.permission_code;

-- Explicit View-Only proof — must have exactly 2 (the 2 read-list perms).
SELECT 'VIEW_ONLY phase-13 perms (must be 2)' AS check_name,
       COUNT(*) AS row_count
  FROM role_permissions rp
  JOIN roles r ON r.role_id = rp.role_id
  JOIN permissions p ON p.permission_id = rp.permission_id
 WHERE r.role_code = 'VIEW_ONLY'
   AND (p.permission_code LIKE 'schedule:%' OR p.permission_code LIKE 'procurement:%');

SELECT '✓ Migration 510 complete — Phase 13 permissions granted' AS result;
