-- ════════════════════════════════════════════════════════════════════
-- CMCMIS_SIMPLIFIED — Migration 431 (Phase 12)
-- File:     431__phase12_notifications_permissions.sql
-- Purpose:  Idempotent ADD-only seed for notification permission codes.
--
-- ROLE SCOPE — STRICT
--   SUPER_ADMIN, LAB_IN_CHARGE, LAB_ENGINEER, NORMAL_USER  → ALL perms
--   VIEW_ONLY                                              → NONE
--
-- The View-Only exclusion is the entire point of these permissions
-- existing. The bell + dropdown + page are gated by `notifications:
-- read-own`; the backend rejects calls without it. No special-casing
-- by role-name anywhere — the permission set IS the source of truth.
--
-- IDEMPOTENT: INSERT IGNORE on the unique permission_code + on the
-- role_permissions composite PK.
-- ════════════════════════════════════════════════════════════════════

SET NAMES utf8mb4;

-- ── 431.1  Permission codes ───────────────────────────────────────────
INSERT IGNORE INTO `permissions`
  (`permission_code`,              `resource`,       `action`,      `description`,                                                        `is_system`, `created_at`)
VALUES
  ('notifications:read-own',       'notifications',  'read-own',    'List and read your own in-app notifications',                       1, NOW(6)),
  ('notifications:mark-own',       'notifications',  'mark-own',    'Mark your own notifications as read (single + bulk)',               1, NOW(6));


-- ── 431.2  Grant matrix ──────────────────────────────────────────────
-- VIEW_ONLY is INTENTIONALLY OMITTED. The grant is the *only* place
-- where the exclusion lives — no role-name check elsewhere in the code.

INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`, `granted_at`, `granted_by`)
SELECT r.role_id, p.permission_id, NOW(6), 'BOOTSTRAP'
  FROM `roles` r
  CROSS JOIN `permissions` p
 WHERE r.role_code IN ('SUPER_ADMIN','LAB_IN_CHARGE','LAB_ENGINEER','NORMAL_USER')
   AND p.permission_code IN ('notifications:read-own','notifications:mark-own');


-- ── 431.3  Verify (and explicitly confirm View-Only has NEITHER) ──────
SELECT
  p.permission_code,
  COUNT(rp.role_id)                            AS granted_roles,
  GROUP_CONCAT(r.role_code ORDER BY r.role_id) AS roles
  FROM `permissions` p
  LEFT JOIN `role_permissions` rp ON rp.permission_id = p.permission_id
  LEFT JOIN `roles`            r  ON r.role_id        = rp.role_id
 WHERE p.permission_code LIKE 'notifications:%'
 GROUP BY p.permission_code
 ORDER BY p.permission_code;

-- Explicit View-Only proof — should return 0 rows.
SELECT 'VIEW_ONLY notification perms (must be 0)' AS check_name,
       COUNT(*) AS row_count
  FROM role_permissions rp
  JOIN roles r ON r.role_id = rp.role_id
  JOIN permissions p ON p.permission_id = rp.permission_id
 WHERE r.role_code = 'VIEW_ONLY'
   AND p.permission_code LIKE 'notifications:%';

SELECT '✓ Migration 431 complete — notification perms granted (View-Only excluded)' AS result;
