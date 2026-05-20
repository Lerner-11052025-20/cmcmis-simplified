-- ════════════════════════════════════════════════════════════════════
-- CMCMIS_SIMPLIFIED — Migration 600 (Phase 14 · Audit Log Viewer)
-- File:     600__phase14_audit_permissions.sql
-- Purpose:  Idempotent ADD-only seed for the Audit Log Viewer's two
--           permission codes.
--
-- DOCTRINE
--   Phase 14 is STRICTLY READ-ONLY — no new tables, no ALTERs anywhere.
--   The viewer reads from existing audit_log + user_role_history +
--   job_request_status_history + job_card_status_history +
--   schedule_status_history (all sealed by earlier phases).
--
--   We seed TWO new permission codes (audit:read-list / audit:export)
--   to match the Phase-13 naming convention. The legacy mig-006 code
--   `audit_log:read` is kept untouched (still granted to SUPER_ADMIN)
--   so any historical reference doesn't break — Phase 14 only consults
--   the new codes.
--
-- ROLE MATRIX (Phase 14 §3 — TIGHT; audit trails are sensitive):
--   ╔══════════════╦═════════════════╦═════════════════╗
--   ║              ║ audit:read-list ║ audit:export    ║
--   ╠══════════════╬═════════════════╬═════════════════╣
--   ║ SUPER_ADMIN  ║      ✓          ║      ✓          ║
--   ║ everyone else║      ✗          ║      ✗          ║
--   ╚══════════════╩═════════════════╩═════════════════╝
--
--   The user explicitly asked for the Audit Log entry under the Admin
--   panel "AS SUPER ADMIN" — so default is SA-only. Lab-In-Charge /
--   auditor expansions can be added later via a second migration if org
--   policy decides to widen access.
--
-- IDEMPOTENT: INSERT IGNORE everywhere.
-- ════════════════════════════════════════════════════════════════════

SET NAMES utf8mb4;

-- ── 600.1  Permission codes ──────────────────────────────────────────
INSERT IGNORE INTO `permissions`
  (`permission_code`,    `resource`,  `action`,    `description`,                                              `is_system`, `created_at`)
VALUES
  ('audit:read-list',    'audit',     'read-list', 'View the Audit Log Viewer (list + detail + filters)',     1, NOW(6)),
  ('audit:export',       'audit',     'export',    'Export filtered audit log data (CSV; row-capped)',         1, NOW(6));


-- ── 600.2  Grant to SUPER_ADMIN ──────────────────────────────────────
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`, `granted_at`, `granted_by`)
SELECT r.role_id, p.permission_id, NOW(6), 'BOOTSTRAP'
  FROM `roles` r
  CROSS JOIN `permissions` p
 WHERE r.role_code = 'SUPER_ADMIN'
   AND p.permission_code IN ('audit:read-list', 'audit:export');


-- ── 600.3  Verify ─────────────────────────────────────────────────────
SELECT
  p.permission_code,
  COUNT(rp.role_id)                            AS granted_roles,
  GROUP_CONCAT(r.role_code ORDER BY r.role_id) AS roles
  FROM `permissions` p
  LEFT JOIN `role_permissions` rp ON rp.permission_id = p.permission_id
  LEFT JOIN `roles`            r  ON r.role_id        = rp.role_id
 WHERE p.permission_code LIKE 'audit:%'
 GROUP BY p.permission_code
 ORDER BY p.permission_code;

SELECT '✓ Migration 600 complete — Phase 14 audit permissions granted (SA-only)' AS result;
