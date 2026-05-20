-- ════════════════════════════════════════════════════════════════════
-- CMCMIS_SIMPLIFIED — Migration 400 (Phase 10 Reports & Analytics)
-- File:     400__phase10_reports_permissions.sql
-- Purpose:  Idempotent ADD-only seed for Reports + Analytics permission
--           codes used by Phase 10. Follows the additive seed pattern
--           established by migration 113 (Phase 7) and 122 (Phase 8).
--
--           NO ALTERs. NO DROPs. NO data writes outside the
--           permissions / role_permissions tables.
--
-- Permission codes seeded (8 total):
--   reports:view-calibration-due       — R1
--   reports:view-pending-jobs          — R2
--   reports:view-equipment-utilization — R3
--   reports:view-engineer-summary      — R4
--   reports:view-job-card-summary      — R5
--   reports:view-job-request-summary   — R6
--   reports:view-analytics             — analytics charts (G1..G8)
--   reports:export                     — gates all PDF / CSV downloads
--
-- Grant matrix (Phase 10 §5 of prompt; role_codes Phase-3 sealed):
--   SUPER_ADMIN    → ALL 8
--   LAB_IN_CHARGE  → ALL 8
--   LAB_ENGINEER   → engineer-summary, job-card-summary,
--                    calibration-due, analytics, export
--   NORMAL_USER    → pending-jobs, job-request-summary, analytics, export
--   VIEW_ONLY      → ALL 7 view perms (NO export)
--
-- IDEMPOTENT: INSERT IGNORE on permissions.uk_perm_code and
--             role_permissions PK (role_id, permission_id).
-- ════════════════════════════════════════════════════════════════════

SET NAMES utf8mb4;

-- ── 400.1  Permission codes (no-op if already present) ──────────────
INSERT IGNORE INTO `permissions`
  (`permission_code`,                       `resource`,  `action`,                       `description`,                                                 `is_system`, `created_at`)
VALUES
  ('reports:view-calibration-due',          'reports',   'view-calibration-due',          'View Calibration Due Report (R1)',                            1, NOW(6)),
  ('reports:view-pending-jobs',             'reports',   'view-pending-jobs',             'View Pending Jobs Report (R2)',                               1, NOW(6)),
  ('reports:view-equipment-utilization',    'reports',   'view-equipment-utilization',    'View Equipment Utilization Report (R3)',                      1, NOW(6)),
  ('reports:view-engineer-summary',         'reports',   'view-engineer-summary',         'View Engineer Summary Report (R4)',                           1, NOW(6)),
  ('reports:view-job-card-summary',         'reports',   'view-job-card-summary',         'View Job Card Summary Report (R5)',                           1, NOW(6)),
  ('reports:view-job-request-summary',      'reports',   'view-job-request-summary',      'View Job Request Summary Report (R6)',                        1, NOW(6)),
  ('reports:view-analytics',                'reports',   'view-analytics',                'View analytics charts on the Reports landing page',           1, NOW(6)),
  ('reports:export',                        'reports',   'export',                        'Download generated reports (PDF) and chart datasets (CSV)',   1, NOW(6));


-- ── 400.2  Grant matrix per Phase 10 §5 ────────────────────────────
-- We resolve role_ids by role_code (Phase 3 sealed): SUPER_ADMIN=1,
-- LAB_IN_CHARGE=2, LAB_ENGINEER=3, NORMAL_USER=4, VIEW_ONLY=5.
-- INSERT IGNORE on PK (role_id, permission_id) makes re-runs no-ops.

-- SUPER_ADMIN + LAB_IN_CHARGE get every permission, including export.
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`, `granted_at`, `granted_by`)
SELECT r.role_id, p.permission_id, NOW(6), 'BOOTSTRAP'
  FROM `roles` r
  CROSS JOIN `permissions` p
 WHERE r.role_code IN ('SUPER_ADMIN','LAB_IN_CHARGE')
   AND p.permission_code IN (
        'reports:view-calibration-due',
        'reports:view-pending-jobs',
        'reports:view-equipment-utilization',
        'reports:view-engineer-summary',
        'reports:view-job-card-summary',
        'reports:view-job-request-summary',
        'reports:view-analytics',
        'reports:export'
       );

-- LAB_ENGINEER: engineer-summary, job-card-summary, calibration-due,
-- analytics, AND export (engineers need to print their workload).
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`, `granted_at`, `granted_by`)
SELECT r.role_id, p.permission_id, NOW(6), 'BOOTSTRAP'
  FROM `roles` r
  CROSS JOIN `permissions` p
 WHERE r.role_code = 'LAB_ENGINEER'
   AND p.permission_code IN (
        'reports:view-calibration-due',
        'reports:view-engineer-summary',
        'reports:view-job-card-summary',
        'reports:view-analytics',
        'reports:export'
       );

-- NORMAL_USER: pending-jobs, job-request-summary (own scope governed by
-- row-level scope in service), analytics, export.
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`, `granted_at`, `granted_by`)
SELECT r.role_id, p.permission_id, NOW(6), 'BOOTSTRAP'
  FROM `roles` r
  CROSS JOIN `permissions` p
 WHERE r.role_code = 'NORMAL_USER'
   AND p.permission_code IN (
        'reports:view-pending-jobs',
        'reports:view-job-request-summary',
        'reports:view-analytics',
        'reports:export'
       );

-- VIEW_ONLY: every view permission (incl. analytics) but NO export.
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`, `granted_at`, `granted_by`)
SELECT r.role_id, p.permission_id, NOW(6), 'BOOTSTRAP'
  FROM `roles` r
  CROSS JOIN `permissions` p
 WHERE r.role_code = 'VIEW_ONLY'
   AND p.permission_code IN (
        'reports:view-calibration-due',
        'reports:view-pending-jobs',
        'reports:view-equipment-utilization',
        'reports:view-engineer-summary',
        'reports:view-job-card-summary',
        'reports:view-job-request-summary',
        'reports:view-analytics'
       );


-- ── 400.3  Verify ────────────────────────────────────────────────────
SELECT
  p.permission_code,
  COUNT(rp.role_id)                            AS granted_roles,
  GROUP_CONCAT(r.role_code ORDER BY r.role_id) AS roles
  FROM `permissions` p
  LEFT JOIN `role_permissions` rp ON rp.permission_id = p.permission_id
  LEFT JOIN `roles`            r  ON r.role_id        = rp.role_id
 WHERE p.permission_code LIKE 'reports:%'
 GROUP BY p.permission_code
 ORDER BY p.permission_code;

SELECT '✓ Migration 400 complete — Phase 10 report + analytics permissions granted' AS result;
