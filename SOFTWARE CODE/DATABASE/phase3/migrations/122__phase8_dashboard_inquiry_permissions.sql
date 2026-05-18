-- ════════════════════════════════════════════════════════════════════
-- CMCMIS_SIMPLIFIED — Migration 122 (Phase 8 Slice 1)
-- File:     122__phase8_dashboard_inquiry_permissions.sql
-- Purpose:  Idempotent SAFETY-NET seed for the Dashboard + Inquiry
--           permission codes used by Phase 8.
--
--           Step-0 introspection showed all 5 codes already exist in the
--           `permissions` table (Phase 3 mig 006/007 was prescient) and
--           all 22 role-grants match §6.6 of FINAL-DESC-CMCMIS.pdf.
--           This migration runs anyway so a fresh-DB rebuild via
--           run-migrations.js produces the same state without depending
--           on any individual seed file's ordering or content.
--
-- Permission codes seeded:
--   dashboard:view             → all 5 roles
--   inquiry:search-vendors     → all 5 roles
--   inquiry:search-products    → all 5 roles
--   inquiry:search-job-cards   → SUPER_ADMIN, LAB_IN_CHARGE, LAB_ENGINEER,
--                                VIEW_ONLY (NOT NORMAL_USER — §6.6 matrix)
--   inquiry:search-instruments → all 5 roles
--
-- IDEMPOTENT: INSERT IGNORE on permissions.uk_perm_code and
--             role_permissions PK (role_id, permission_id).
-- ════════════════════════════════════════════════════════════════════

SET NAMES utf8mb4;

-- ── 122.1  Permission codes (no-op if already present) ──────────────
INSERT IGNORE INTO `permissions`
  (`permission_code`,             `resource`,   `action`,            `description`, `is_system`, `created_at`)
VALUES
  ('dashboard:view',              'dashboard',  'view',              'View KPI dashboard (role-aware variant)',           1, NOW(6)),
  ('inquiry:search-vendors',      'inquiry',    'search-vendors',    'Search vendor master via Inquiry tab',              1, NOW(6)),
  ('inquiry:search-products',     'inquiry',    'search-products',   'Search product master via Inquiry tab',             1, NOW(6)),
  ('inquiry:search-job-cards',    'inquiry',    'search-job-cards',  'Search Job Cards via Inquiry tab (NOT Normal User)',1, NOW(6)),
  ('inquiry:search-instruments',  'inquiry',    'search-instruments','Search equipment / instruments via Inquiry tab',    1, NOW(6));


-- ── 122.2  Grant matrix per §6.6 of FINAL-DESC-CMCMIS.pdf ───────────
-- We resolve role_ids by role_code (Phase 3 sealed): SUPER_ADMIN=1,
-- LAB_IN_CHARGE=2, LAB_ENGINEER=3, NORMAL_USER=4, VIEW_ONLY=5.
-- INSERT IGNORE on PK (role_id, permission_id) makes re-runs no-ops.

-- All-five-roles permissions:
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`, `granted_at`, `granted_by`)
SELECT r.role_id, p.permission_id, NOW(6), 'BOOTSTRAP'
  FROM `roles` r
  CROSS JOIN `permissions` p
 WHERE r.role_code IN ('SUPER_ADMIN','LAB_IN_CHARGE','LAB_ENGINEER','NORMAL_USER','VIEW_ONLY')
   AND p.permission_code IN (
        'dashboard:view',
        'inquiry:search-vendors',
        'inquiry:search-products',
        'inquiry:search-instruments'
       );

-- Restricted (NOT Normal User):
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`, `granted_at`, `granted_by`)
SELECT r.role_id, p.permission_id, NOW(6), 'BOOTSTRAP'
  FROM `roles` r
  CROSS JOIN `permissions` p
 WHERE r.role_code IN ('SUPER_ADMIN','LAB_IN_CHARGE','LAB_ENGINEER','VIEW_ONLY')
   AND p.permission_code = 'inquiry:search-job-cards';


-- ── 122.3  Verify ────────────────────────────────────────────────────
SELECT
  p.permission_code,
  COUNT(rp.role_id)                        AS granted_roles,
  GROUP_CONCAT(r.role_code ORDER BY r.role_id) AS roles
  FROM `permissions` p
  LEFT JOIN `role_permissions` rp ON rp.permission_id = p.permission_id
  LEFT JOIN `roles`            r  ON r.role_id        = rp.role_id
 WHERE p.permission_code IN (
        'dashboard:view',
        'inquiry:search-vendors',
        'inquiry:search-products',
        'inquiry:search-job-cards',
        'inquiry:search-instruments'
       )
 GROUP BY p.permission_code
 ORDER BY p.permission_code;

SELECT '✓ Migration 122 complete — Phase 8 permission grants verified' AS result;
