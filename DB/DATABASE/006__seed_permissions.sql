-- ════════════════════════════════════════════════════════════════════
-- CMCMIS_SIMPLIFIED — Migration 006
-- File:     006__seed_permissions.sql
-- Purpose:  Seed all atomic resource:action permissions (~40 rows)
-- Per:      FINAL-DESC §6 permission matrix
-- Idempotent: YES — INSERT IGNORE on duplicate uk_perm_code
-- ════════════════════════════════════════════════════════════════════

SET NAMES utf8mb4;

INSERT IGNORE INTO `permissions`
  (`permission_code`, `resource`, `action`, `description`, `is_system`, `created_at`)
VALUES
  -- ─── Auth & Identity (4) ─────────────────────────────────────────
  ('auth:login',                  'auth',         'login',                 'Submit credentials',                       1, NOW(6)),
  ('auth:logout',                 'auth',         'logout',                'End session',                              1, NOW(6)),
  ('auth:refresh-token',          'auth',         'refresh-token',         'Refresh JWT via httpOnly cookie',          1, NOW(6)),
  ('me:read',                     'me',           'read',                  'Read own profile',                         1, NOW(6)),

  -- ─── User & Role management (3) ──────────────────────────────────
  ('user:read-list',              'user',         'read-list',             'List all users',                           1, NOW(6)),
  ('user:role-assign',            'user',         'role-assign',           'Assign or change a user role',             1, NOW(6)),
  ('user:activate-deactivate',    'user',         'activate-deactivate',   'Toggle user active status',                1, NOW(6)),

  -- ─── Equipment (7) ───────────────────────────────────────────────
  ('equipment:read-list',         'equipment',    'read-list',             'List equipment',                           1, NOW(6)),
  ('equipment:read-detail',       'equipment',    'read-detail',           'View equipment detail',                    1, NOW(6)),
  ('equipment:create',            'equipment',    'create',                'Register new equipment',                   1, NOW(6)),
  ('equipment:update',            'equipment',    'update',                'Edit equipment',                           1, NOW(6)),
  ('equipment:verify',            'equipment',    'verify',                'PENDING_VERIFICATION → ACTIVE',            1, NOW(6)),
  ('equipment:condemn',           'equipment',    'condemn',               'Flip to CONDEMNED',                        1, NOW(6)),
  ('equipment:delete',            'equipment',    'delete',                'Hard delete (Super Admin only)',           1, NOW(6)),

  -- ─── Job Requests (6) ────────────────────────────────────────────
  ('job_request:create',          'job_request',  'create',                'Create a job request',                     1, NOW(6)),
  ('job_request:read-own',        'job_request',  'read-own',              'List own job requests',                    1, NOW(6)),
  ('job_request:read-all',        'job_request',  'read-all',              'List all job requests',                    1, NOW(6)),
  ('job_request:approve',         'job_request',  'approve',               'Approve a job request',                    1, NOW(6)),
  ('job_request:reject',          'job_request',  'reject',                'Reject job request with reason',           1, NOW(6)),
  ('job_request:assign-engineer', 'job_request',  'assign-engineer',       'Assign to a Lab Engineer',                 1, NOW(6)),

  -- ─── Job Cards (8) ───────────────────────────────────────────────
  ('job_card:read-list',          'job_card',     'read-list',             'List job cards',                           1, NOW(6)),
  ('job_card:read-detail',        'job_card',     'read-detail',           'View job card detail',                     1, NOW(6)),
  ('job_card:start-work',         'job_card',     'start-work',            'ASSIGNED → IN_PROGRESS',                   1, NOW(6)),
  ('job_card:update-tasks',       'job_card',     'update-tasks',          'Update tasks and observations',            1, NOW(6)),
  ('job_card:complete',           'job_card',     'complete',              'IN_PROGRESS → COMPLETED',                  1, NOW(6)),
  ('job_card:verify-close',       'job_card',     'verify-close',          'COMPLETED → VERIFIED_CLOSED',              1, NOW(6)),
  ('job_card:reopen',             'job_card',     'reopen',                'Reopen closed job card with reason',       1, NOW(6)),
  ('job_card:generate-pdf',       'job_card',     'generate-pdf',          'Generate job card PDF on demand',          1, NOW(6)),

  -- ─── Dashboard & Inquiry (5) ─────────────────────────────────────
  ('dashboard:view',              'dashboard',    'view',                  'View dashboard',                           1, NOW(6)),
  ('inquiry:search-vendors',      'inquiry',      'search-vendors',        'Search vendors',                           1, NOW(6)),
  ('inquiry:search-products',     'inquiry',      'search-products',       'Search products',                          1, NOW(6)),
  ('inquiry:search-job-cards',    'inquiry',      'search-job-cards',      'Search job cards',                         1, NOW(6)),
  ('inquiry:search-instruments',  'inquiry',      'search-instruments',    'Search instruments',                       1, NOW(6)),

  -- ─── Master Data (Phase 2) (5) ───────────────────────────────────
  ('master:employees:manage',     'master',       'employees:manage',      'P2: CRUD on employees master',             1, NOW(6)),
  ('master:vendors:manage',       'master',       'vendors:manage',        'P2: CRUD on vendors',                      1, NOW(6)),
  ('master:equipment-types:manage','master',      'equipment-types:manage','P2: CRUD on equipment types',              1, NOW(6)),
  ('master:divisions:manage',     'master',       'divisions:manage',      'P2: CRUD on divisions/sections',           1, NOW(6)),
  ('master:lookup-values:manage', 'master',       'lookup-values:manage',  'P2: CRUD on lookup values',                1, NOW(6)),

  -- ─── Audit & Export (2) ──────────────────────────────────────────
  ('audit_log:read',              'audit_log',    'read',                  'Read audit log (Super Admin)',             1, NOW(6)),
  ('export:trigger',              'export',       'trigger',               'Trigger any export (PDF, future Excel)',   1, NOW(6));

-- Verify
SELECT '✓ Migration 006 complete (40 permissions seeded)' AS status;
SELECT COUNT(*) AS permission_count FROM `permissions`;
SELECT `resource`, COUNT(*) AS perm_count FROM `permissions` GROUP BY `resource` ORDER BY `resource`;
