-- ════════════════════════════════════════════════════════════════════
-- CMCMIS_SIMPLIFIED — Migration 007
-- File:     007__seed_role_permissions.sql
-- Purpose:  Grant matrix — which role gets which permission
-- Per:      FINAL-DESC §6 + v2.0 §7.5
-- Idempotent: YES — INSERT IGNORE on duplicate PK
-- ════════════════════════════════════════════════════════════════════

SET NAMES utf8;

-- ────────────────────────────────────────────────────────────────────
-- 7.A — SUPER_ADMIN (role_id=1) gets EVERY permission
-- ────────────────────────────────────────────────────────────────────
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`, `granted_at`, `granted_by`)
SELECT 1, p.`permission_id`, NOW(6), 'BOOTSTRAP'
  FROM `permissions` p;


-- ────────────────────────────────────────────────────────────────────
-- 7.B — LAB_IN_CHARGE (role_id=2)
-- ────────────────────────────────────────────────────────────────────
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`, `granted_at`, `granted_by`)
SELECT 2, p.`permission_id`, NOW(6), 'BOOTSTRAP'
  FROM `permissions` p
 WHERE p.`permission_code` IN (
   -- Auth & self
   'auth:login', 'auth:logout', 'auth:refresh-token', 'me:read',
   -- Equipment (read + create + update + verify + condemn)
   'equipment:read-list', 'equipment:read-detail',
   'equipment:create',    'equipment:update',
   'equipment:verify',    'equipment:condemn',
   -- Job Requests (full lifecycle)
   'job_request:create', 'job_request:read-own', 'job_request:read-all',
   'job_request:approve','job_request:reject',  'job_request:assign-engineer',
   -- Job Cards (full lifecycle)
   'job_card:read-list',  'job_card:read-detail',
   'job_card:start-work', 'job_card:update-tasks',
   'job_card:complete',   'job_card:verify-close',
   'job_card:reopen',     'job_card:generate-pdf',
   -- Dashboard + Inquiry
   'dashboard:view',
   'inquiry:search-vendors',     'inquiry:search-products',
   'inquiry:search-job-cards',   'inquiry:search-instruments',
   -- Export
   'export:trigger'
 );


-- ────────────────────────────────────────────────────────────────────
-- 7.C — LAB_ENGINEER (role_id=3)
-- ────────────────────────────────────────────────────────────────────
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`, `granted_at`, `granted_by`)
SELECT 3, p.`permission_id`, NOW(6), 'BOOTSTRAP'
  FROM `permissions` p
 WHERE p.`permission_code` IN (
   'auth:login', 'auth:logout', 'auth:refresh-token', 'me:read',
   -- Equipment (read + create + update; NO verify/condemn/delete)
   'equipment:read-list', 'equipment:read-detail',
   'equipment:create',    'equipment:update',
   -- Job Requests (read own + read all + create own)
   'job_request:create', 'job_request:read-own', 'job_request:read-all',
   -- Job Cards (execute lifecycle, NO verify-close, NO reopen)
   'job_card:read-list',   'job_card:read-detail',
   'job_card:start-work',  'job_card:update-tasks', 'job_card:complete',
   'job_card:generate-pdf',
   -- Dashboard + Inquiry
   'dashboard:view',
   'inquiry:search-vendors',     'inquiry:search-products',
   'inquiry:search-job-cards',   'inquiry:search-instruments',
   -- Export
   'export:trigger'
 );


-- ────────────────────────────────────────────────────────────────────
-- 7.D — NORMAL_USER (role_id=4)
-- ────────────────────────────────────────────────────────────────────
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`, `granted_at`, `granted_by`)
SELECT 4, p.`permission_id`, NOW(6), 'BOOTSTRAP'
  FROM `permissions` p
 WHERE p.`permission_code` IN (
   'auth:login', 'auth:logout', 'auth:refresh-token', 'me:read',
   -- Equipment (read + create only)
   'equipment:read-list', 'equipment:read-detail', 'equipment:create',
   -- Job Requests (create own + read own)
   'job_request:create', 'job_request:read-own',
   -- Dashboard
   'dashboard:view',
   -- Inquiry (limited)
   'inquiry:search-vendors',  'inquiry:search-products',
   'inquiry:search-instruments'
 );


-- ────────────────────────────────────────────────────────────────────
-- 7.E — VIEW_ONLY (role_id=5)
-- ────────────────────────────────────────────────────────────────────
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`, `granted_at`, `granted_by`)
SELECT 5, p.`permission_id`, NOW(6), 'BOOTSTRAP'
  FROM `permissions` p
 WHERE p.`permission_code` IN (
   'auth:login', 'auth:logout', 'auth:refresh-token', 'me:read',
   -- Equipment (read only)
   'equipment:read-list', 'equipment:read-detail',
   -- Job Requests (read all + own)
   'job_request:read-own', 'job_request:read-all',
   -- Job Cards (read only + generate PDF for audit)
   'job_card:read-list', 'job_card:read-detail', 'job_card:generate-pdf',
   -- Dashboard
   'dashboard:view',
   -- Inquiry (all)
   'inquiry:search-vendors',     'inquiry:search-products',
   'inquiry:search-job-cards',   'inquiry:search-instruments'
 );


-- Verify
SELECT '✓ Migration 007 complete (role-permissions matrix seeded)' AS status;

SELECT
  r.`role_code`,
  COUNT(rp.`permission_id`) AS permission_count
FROM `roles` r
LEFT JOIN `role_permissions` rp ON rp.`role_id` = r.`role_id`
GROUP BY r.`role_id`, r.`role_code`
ORDER BY r.`role_id`;
