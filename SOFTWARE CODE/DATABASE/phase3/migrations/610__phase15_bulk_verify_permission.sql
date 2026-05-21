-- ════════════════════════════════════════════════════════════════════
-- CMCMIS_SIMPLIFIED — Migration 610 (Phase 15 · Bulk Verify All JRs)
-- File:     610__phase15_bulk_verify_permission.sql
-- Purpose:  Idempotent ADD-only seed for the Bulk-Verify permission.
--
-- WHAT THIS ENABLES
--   A SUPER_ADMIN can fire POST /api/v1/job-requests/bulk-verify-all
--   to stamp ALL job requests that are not already VERIFIED_CLOSED (and
--   not logically cancelled) as VERIFIED_CLOSED in a single atomic txn.
--   This is a one-time legacy-data migration helper — it clears the
--   inherited backlog of historical requests from the pre-software era.
--
-- ROLE MATRIX
--   ╔══════════════╦════════════════════════════╗
--   ║              ║ job_request:bulk-verify    ║
--   ╠══════════════╬════════════════════════════╣
--   ║ SUPER_ADMIN  ║            ✓               ║
--   ║ everyone else║            ✗               ║
--   ╚══════════════╩════════════════════════════╝
--
-- IDEMPOTENT: INSERT IGNORE everywhere.
-- ════════════════════════════════════════════════════════════════════

SET NAMES utf8mb4;

-- ── 610.1  Permission code ───────────────────────────────────────────
INSERT IGNORE INTO `permissions`
  (`permission_code`,             `resource`,       `action`,        `description`,                                                     `is_system`, `created_at`)
VALUES
  ('job_request:bulk-verify',     'job_request',    'bulk-verify',   'Bulk-mark all legacy JRs as VERIFIED_CLOSED (SUPER_ADMIN only)',   1, NOW(6));


-- ── 610.2  Grant to SUPER_ADMIN ──────────────────────────────────────
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`, `granted_at`, `granted_by`)
SELECT r.role_id, p.permission_id, NOW(6), 'BOOTSTRAP'
  FROM `roles` r
  CROSS JOIN `permissions` p
 WHERE r.role_code    = 'SUPER_ADMIN'
   AND p.permission_code = 'job_request:bulk-verify';


-- ── 610.3  Verify ────────────────────────────────────────────────────
SELECT
  p.permission_code,
  COUNT(rp.role_id)                            AS granted_roles,
  GROUP_CONCAT(r.role_code ORDER BY r.role_id) AS roles
  FROM `permissions` p
  LEFT JOIN `role_permissions` rp ON rp.permission_id = p.permission_id
  LEFT JOIN `roles`            r  ON r.role_id        = rp.role_id
 WHERE p.permission_code = 'job_request:bulk-verify'
 GROUP BY p.permission_code;

SELECT '✓ Migration 610 complete — job_request:bulk-verify granted to SUPER_ADMIN' AS result;
