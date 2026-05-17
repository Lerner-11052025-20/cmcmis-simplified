-- ════════════════════════════════════════════════════════════════════
-- CMCMIS_SIMPLIFIED — Migration 005
-- File:     005__seed_roles.sql
-- Purpose:  Seed the exactly-5 system roles (per locked C1)
-- Idempotent: YES — INSERT IGNORE on duplicate PK
-- ════════════════════════════════════════════════════════════════════

SET NAMES utf8mb4;

INSERT IGNORE INTO `roles` (`role_id`, `role_code`, `role_name`, `role_description`, `is_system`, `created_at`) VALUES
  (1, 'SUPER_ADMIN',   'Super Admin',
   'Master data + RBAC management + system integrity oversight (top tier admin)',
   1, NOW(6)),
  (2, 'LAB_IN_CHARGE', 'Lab In-Charge',
   'Approve job requests, assign engineers, verify completed work, manage schedules',
   1, NOW(6)),
  (3, 'LAB_ENGINEER',  'Lab Engineer',
   'Execute assigned jobs, fill job cards, record observations, generate PDFs',
   1, NOW(6)),
  (4, 'NORMAL_USER',   'Normal User',
   'Raise job requests, register equipment, track own requests',
   1, NOW(6)),
  (5, 'VIEW_ONLY',     'View-Only User',
   'Read all data; no write actions ever; auditor / management oversight',
   1, NOW(6));

-- Verify
SELECT '✓ Migration 005 complete (5 roles seeded)' AS status;
SELECT `role_id`, `role_code`, `role_name` FROM `roles` ORDER BY `role_id`;
