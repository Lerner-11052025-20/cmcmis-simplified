-- ════════════════════════════════════════════════════════════════════
-- CMCMIS_SIMPLIFIED — Migration 420 (Phase 11 Slice 2)
-- File:     420__phase11s2_analytics_permission.sql
-- Purpose:  Add a NEW top-level `analytics:view` permission to power
--           the dedicated /analytics sidebar page (charts-only view).
--
--           Why a new permission code, when `reports:view-analytics`
--           (Phase 10 mig 400) already gates the same chart endpoints?
--           → SEMANTIC SEPARATION. Phase 10 bundled the chart grid
--             under the Reports page; admins who deny "Reports" today
--             also lose the charts. With a standalone /analytics page
--             we want fine-grained control:
--               • A user can have analytics:view  WITHOUT reports:view-*
--                 (charts-only dashboard for ops staff).
--               • A user can have reports:view-* WITHOUT analytics:view
--                 (reports only, no separate analytics page in nav).
--           Backend routes accept EITHER permission (authorizeAny) so
--           the existing Reports-page chart grid keeps working.
--
-- GRANT MATRIX (matches the existing reports:view-analytics matrix —
-- all 5 roles, since charts are non-sensitive aggregates with no PII):
--   SUPER_ADMIN, LAB_IN_CHARGE, LAB_ENGINEER, NORMAL_USER, VIEW_ONLY
--
-- IDEMPOTENT: INSERT IGNORE on permissions.uk_perm_code + on the
-- role_permissions PK (role_id, permission_id).
-- ════════════════════════════════════════════════════════════════════

SET NAMES utf8mb4;

-- ── 420.1  Permission code (no-op if already present) ─────────────────
INSERT IGNORE INTO `permissions`
  (`permission_code`, `resource`,   `action`, `description`,                                                       `is_system`, `created_at`)
VALUES
  ('analytics:view',  'analytics',  'view',   'View the standalone Analytics dashboard (8 chart cards)',           1, NOW(6));


-- ── 420.2  Grant to all 5 roles (charts have no PII) ──────────────────
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`, `granted_at`, `granted_by`)
SELECT r.role_id, p.permission_id, NOW(6), 'BOOTSTRAP'
  FROM `roles` r
  CROSS JOIN `permissions` p
 WHERE r.role_code IN ('SUPER_ADMIN','LAB_IN_CHARGE','LAB_ENGINEER','NORMAL_USER','VIEW_ONLY')
   AND p.permission_code = 'analytics:view';


-- ── 420.3  Verify ─────────────────────────────────────────────────────
SELECT
  p.permission_code,
  COUNT(rp.role_id)                            AS granted_roles,
  GROUP_CONCAT(r.role_code ORDER BY r.role_id) AS roles
  FROM `permissions` p
  LEFT JOIN `role_permissions` rp ON rp.permission_id = p.permission_id
  LEFT JOIN `roles`            r  ON r.role_id        = rp.role_id
 WHERE p.permission_code = 'analytics:view'
 GROUP BY p.permission_code;

SELECT '✓ Migration 420 complete — analytics:view granted to all 5 roles' AS result;
