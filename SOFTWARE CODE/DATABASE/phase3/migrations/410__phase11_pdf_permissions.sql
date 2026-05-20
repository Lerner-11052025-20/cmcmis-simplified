-- ════════════════════════════════════════════════════════════════════
-- CMCMIS_SIMPLIFIED — Migration 410 (Phase 11 PDF Generation)
-- File:     410__phase11_pdf_permissions.sql
-- Purpose:  Idempotent ADD-only seed for the 3 NEW PDF download
--           permissions used by Phase 11. Follows the same additive
--           seed pattern as mig 122 (Phase 8) + 400 (Phase 10).
--
--           NOTE on naming: existing Phase-3 permissions use the
--           `job_card:*` / `job_request:*` snake_case-with-colon
--           convention (e.g. `job_card:read-detail`, `job_card:
--           generate-pdf`, `job_request:approve`). Phase 11 follows
--           the SAME convention for consistency — the Phase 11 prompt's
--           hyphenated `jobcard:*` shorthand is treated as the same
--           concept, just spelled in the project's permanent style.
--
-- NEW PERMISSIONS (3):
--   job_card:download-certificate     — PDF #1 (LOCKED layout, single page,
--                                       only for status COMPLETED / VERIFIED_CLOSED)
--   job_card:download-details         — PDF #2 (full multi-page details)
--   job_request:download-details      — PDF #3 (multi-page JR details)
--
-- GRANT MATRIX (Phase 11 §3, senior call on VIEW_ONLY):
--   SUPER_ADMIN     → all 3
--   LAB_IN_CHARGE   → all 3
--   LAB_ENGINEER    → certificate + JC details + JR details (all 3)
--   NORMAL_USER     → JR details only (own-scope handled at row-level)
--   VIEW_ONLY       → JC details + JR details (NO certificate — internal
--                     calibration document; org default deny)
--
-- LEGACY: `job_card:generate-pdf` (Phase 3) is retained for backwards
-- compatibility on the legacy `/job-cards/:id/pdf` stub. New code uses
-- the granular permissions above.
--
-- IDEMPOTENT: INSERT IGNORE on permissions.uk_perm_code and
--             role_permissions PK (role_id, permission_id).
-- ════════════════════════════════════════════════════════════════════

SET NAMES utf8mb4;

-- ── 410.1  Permission codes (no-op if already present) ─────────────────
INSERT IGNORE INTO `permissions`
  (`permission_code`,                  `resource`,    `action`,              `description`,                                                                          `is_system`, `created_at`)
VALUES
  ('job_card:download-certificate',    'job_card',    'download-certificate','Download Job Card Certificate PDF (locked single-page TIMCD layout)',                  1, NOW(6)),
  ('job_card:download-details',        'job_card',    'download-details',    'Download full multi-page Job Card Details PDF (every tab)',                            1, NOW(6)),
  ('job_request:download-details',     'job_request', 'download-details',    'Download multi-page Job Request Details PDF',                                          1, NOW(6));


-- ── 410.2  Grant matrix per Phase 11 §3 ────────────────────────────────
-- Resolve role_ids by role_code (Phase 3 sealed): SUPER_ADMIN=1,
-- LAB_IN_CHARGE=2, LAB_ENGINEER=3, NORMAL_USER=4, VIEW_ONLY=5.
-- INSERT IGNORE on the (role_id, permission_id) PK makes re-runs no-ops.

-- SUPER_ADMIN + LAB_IN_CHARGE + LAB_ENGINEER → all 3 PDF perms.
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`, `granted_at`, `granted_by`)
SELECT r.role_id, p.permission_id, NOW(6), 'BOOTSTRAP'
  FROM `roles` r
  CROSS JOIN `permissions` p
 WHERE r.role_code IN ('SUPER_ADMIN', 'LAB_IN_CHARGE', 'LAB_ENGINEER')
   AND p.permission_code IN (
        'job_card:download-certificate',
        'job_card:download-details',
        'job_request:download-details'
       );

-- NORMAL_USER → JR details only (own-scope governed by row-level scope).
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`, `granted_at`, `granted_by`)
SELECT r.role_id, p.permission_id, NOW(6), 'BOOTSTRAP'
  FROM `roles` r
  CROSS JOIN `permissions` p
 WHERE r.role_code = 'NORMAL_USER'
   AND p.permission_code = 'job_request:download-details';

-- VIEW_ONLY → JC details + JR details (NO certificate — senior decision).
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`, `granted_at`, `granted_by`)
SELECT r.role_id, p.permission_id, NOW(6), 'BOOTSTRAP'
  FROM `roles` r
  CROSS JOIN `permissions` p
 WHERE r.role_code = 'VIEW_ONLY'
   AND p.permission_code IN (
        'job_card:download-details',
        'job_request:download-details'
       );


-- ── 410.3  Verify ──────────────────────────────────────────────────────
SELECT
  p.permission_code,
  COUNT(rp.role_id)                            AS granted_roles,
  GROUP_CONCAT(r.role_code ORDER BY r.role_id) AS roles
  FROM `permissions` p
  LEFT JOIN `role_permissions` rp ON rp.permission_id = p.permission_id
  LEFT JOIN `roles`            r  ON r.role_id        = rp.role_id
 WHERE p.permission_code IN (
        'job_card:download-certificate',
        'job_card:download-details',
        'job_request:download-details'
       )
 GROUP BY p.permission_code
 ORDER BY p.permission_code;

SELECT '✓ Migration 410 complete — Phase 11 PDF permissions granted' AS result;
