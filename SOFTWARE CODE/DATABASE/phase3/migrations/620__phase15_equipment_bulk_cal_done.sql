-- ════════════════════════════════════════════════════════════════════
-- CMCMIS_SIMPLIFIED — Migration 620 (Phase 15 · Bulk Calibration Done)
-- File:     620__phase15_equipment_bulk_cal_done.sql
-- Purpose:  Idempotent ADD-only seed for the equipment bulk-calibration
--           permission.
--
-- WHAT THIS ENABLES
--   A SUPER_ADMIN can fire POST /api/v1/equipment/bulk-cal-done to mark
--   every equipment row whose EQM_CAL_DUE_DATE is in the past (and whose
--   status is neither CONDEMNED nor RETIRED) as ACTIVE and clear the
--   overdue calibration date (set to NULL). This is a one-time legacy-data
--   migration helper that clears the inherited backlog of 5 700+ historical
--   calibration records whose due dates were never updated in the pre-
--   software era.
--
-- ROLE MATRIX
--   ╔══════════════╦═══════════════════════════════╗
--   ║              ║ equipment:bulk-cal-done       ║
--   ╠══════════════╬═══════════════════════════════╣
--   ║ SUPER_ADMIN  ║            ✓                  ║
--   ║ everyone else║            ✗                  ║
--   ╚══════════════╩═══════════════════════════════╝
--
-- IDEMPOTENT: INSERT IGNORE everywhere.
-- ════════════════════════════════════════════════════════════════════

SET NAMES utf8mb4;

-- ── 620.1  Permission code ───────────────────────────────────────────
INSERT IGNORE INTO `permissions`
  (`permission_code`,              `resource`,    `action`,         `description`,                                                                    `is_system`, `created_at`)
VALUES
  ('equipment:bulk-cal-done',      'equipment',   'bulk-cal-done',  'Bulk-mark all overdue equipment calibrations as done (SUPER_ADMIN only)',         1, NOW(6));


-- ── 620.2  Grant to SUPER_ADMIN ──────────────────────────────────────
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`, `granted_at`, `granted_by`)
SELECT r.role_id, p.permission_id, NOW(6), 'BOOTSTRAP'
  FROM `roles` r
  CROSS JOIN `permissions` p
 WHERE r.role_code       = 'SUPER_ADMIN'
   AND p.permission_code = 'equipment:bulk-cal-done';


-- ── 620.3  Verify ────────────────────────────────────────────────────
SELECT
  p.permission_code,
  COUNT(rp.role_id)                            AS granted_roles,
  GROUP_CONCAT(r.role_code ORDER BY r.role_id) AS roles
  FROM `permissions` p
  LEFT JOIN `role_permissions` rp ON rp.permission_id = p.permission_id
  LEFT JOIN `roles`            r  ON r.role_id        = rp.role_id
 WHERE p.permission_code = 'equipment:bulk-cal-done'
 GROUP BY p.permission_code;

SELECT '✓ Migration 620 complete — equipment:bulk-cal-done granted to SUPER_ADMIN' AS result;
