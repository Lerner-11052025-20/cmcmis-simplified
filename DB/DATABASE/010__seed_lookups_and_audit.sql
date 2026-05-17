-- ════════════════════════════════════════════════════════════════════
-- CMCMIS_SIMPLIFIED — Migration 010
-- File:     010__seed_lookups_and_audit.sql
-- Purpose:  Seed 28 MVP lookup values + final bootstrap audit markers
-- Per:      v2.0 §12.3
-- Idempotent: YES — uses INSERT … ON DUPLICATE KEY UPDATE
-- ════════════════════════════════════════════════════════════════════

SET NAMES utf8mb4;

-- ────────────────────────────────────────────────────────────────────
-- 10.1 — Lookup values in cmms_parameter_master
-- PK = (CategoryID, SrID); upsert pattern handles re-runs cleanly.
-- ────────────────────────────────────────────────────────────────────

INSERT INTO `cmms_parameter_master`
  (`CategoryID`, `CategoryDescription`, `SrID`, `Value`,
   `is_active`, `display_order`, `created_at`, `created_by`,
   `updated_at`, `updated_by`)
VALUES
  -- CategoryID 100 → JobRequest MVP Status
  (100, 'JobRequest MVP Status', 'DRAFT',           'Draft',             1, 10, NOW(6), 'BOOTSTRAP', NOW(6), 'BOOTSTRAP'),
  (100, 'JobRequest MVP Status', 'SUBMITTED',       'Submitted',         1, 20, NOW(6), 'BOOTSTRAP', NOW(6), 'BOOTSTRAP'),
  (100, 'JobRequest MVP Status', 'ASSIGNED',        'Assigned',          1, 30, NOW(6), 'BOOTSTRAP', NOW(6), 'BOOTSTRAP'),
  (100, 'JobRequest MVP Status', 'IN_PROGRESS',     'In Progress',       1, 40, NOW(6), 'BOOTSTRAP', NOW(6), 'BOOTSTRAP'),
  (100, 'JobRequest MVP Status', 'COMPLETED',       'Completed',         1, 50, NOW(6), 'BOOTSTRAP', NOW(6), 'BOOTSTRAP'),
  (100, 'JobRequest MVP Status', 'VERIFIED_CLOSED', 'Verified / Closed', 1, 60, NOW(6), 'BOOTSTRAP', NOW(6), 'BOOTSTRAP'),
  (100, 'JobRequest MVP Status', 'REJECTED',        'Rejected',          1, 70, NOW(6), 'BOOTSTRAP', NOW(6), 'BOOTSTRAP'),
  (100, 'JobRequest MVP Status', 'REOPENED',        'Reopened',          1, 80, NOW(6), 'BOOTSTRAP', NOW(6), 'BOOTSTRAP'),

  -- CategoryID 101 → Equipment MVP Status
  (101, 'Equipment MVP Status', 'PENDING_VERIFICATION', 'Pending Verification', 1, 10, NOW(6), 'BOOTSTRAP', NOW(6), 'BOOTSTRAP'),
  (101, 'Equipment MVP Status', 'ACTIVE',               'Active',               1, 20, NOW(6), 'BOOTSTRAP', NOW(6), 'BOOTSTRAP'),
  (101, 'Equipment MVP Status', 'UNDER_CALIBRATION',    'Under Calibration',    1, 30, NOW(6), 'BOOTSTRAP', NOW(6), 'BOOTSTRAP'),
  (101, 'Equipment MVP Status', 'UNDER_REPAIR',         'Under Repair',         1, 40, NOW(6), 'BOOTSTRAP', NOW(6), 'BOOTSTRAP'),
  (101, 'Equipment MVP Status', 'OUT_OF_TOLERANCE',     'Out of Tolerance',     1, 50, NOW(6), 'BOOTSTRAP', NOW(6), 'BOOTSTRAP'),
  (101, 'Equipment MVP Status', 'QUARANTINED',          'Quarantined',          1, 60, NOW(6), 'BOOTSTRAP', NOW(6), 'BOOTSTRAP'),
  (101, 'Equipment MVP Status', 'CONDEMNED',            'Condemned',            1, 70, NOW(6), 'BOOTSTRAP', NOW(6), 'BOOTSTRAP'),
  (101, 'Equipment MVP Status', 'RETIRED',              'Retired',              1, 80, NOW(6), 'BOOTSTRAP', NOW(6), 'BOOTSTRAP'),

  -- CategoryID 102 → Calibration Status
  (102, 'Calibration Status', 'VALID',            'Valid',            1, 10, NOW(6), 'BOOTSTRAP', NOW(6), 'BOOTSTRAP'),
  (102, 'Calibration Status', 'DUE_SOON',         'Due Soon',         1, 20, NOW(6), 'BOOTSTRAP', NOW(6), 'BOOTSTRAP'),
  (102, 'Calibration Status', 'OVERDUE',          'Overdue',          1, 30, NOW(6), 'BOOTSTRAP', NOW(6), 'BOOTSTRAP'),
  (102, 'Calibration Status', 'OUT_OF_TOLERANCE', 'Out of Tolerance', 1, 40, NOW(6), 'BOOTSTRAP', NOW(6), 'BOOTSTRAP'),
  (102, 'Calibration Status', 'NOT_REQUIRED',     'Not Required',     1, 50, NOW(6), 'BOOTSTRAP', NOW(6), 'BOOTSTRAP'),

  -- CategoryID 103 → JobRequest Priority
  (103, 'JobRequest Priority', 'LOW',    'Low',     1, 10, NOW(6), 'BOOTSTRAP', NOW(6), 'BOOTSTRAP'),
  (103, 'JobRequest Priority', 'NORMAL', 'Normal',  1, 20, NOW(6), 'BOOTSTRAP', NOW(6), 'BOOTSTRAP'),
  (103, 'JobRequest Priority', 'HIGH',   'High',    1, 30, NOW(6), 'BOOTSTRAP', NOW(6), 'BOOTSTRAP'),
  (103, 'JobRequest Priority', 'URGENT', 'Urgent',  1, 40, NOW(6), 'BOOTSTRAP', NOW(6), 'BOOTSTRAP'),

  -- CategoryID 104 → Equipment Category
  (104, 'Equipment Category', 'TME', 'Test & Measurement (T&ME)',        1, 10, NOW(6), 'BOOTSTRAP', NOW(6), 'BOOTSTRAP'),
  (104, 'Equipment Category', 'FPE', 'Fabrication & Production (F&PE)',  1, 20, NOW(6), 'BOOTSTRAP', NOW(6), 'BOOTSTRAP'),

  -- CategoryID 105 → JobRequest Type
  (105, 'JobRequest Type', 'CALIBRATION',  'Calibration',  1, 10, NOW(6), 'BOOTSTRAP', NOW(6), 'BOOTSTRAP'),
  (105, 'JobRequest Type', 'REPAIR',       'Repair',       1, 20, NOW(6), 'BOOTSTRAP', NOW(6), 'BOOTSTRAP'),
  (105, 'JobRequest Type', 'REGISTRATION', 'Registration', 1, 30, NOW(6), 'BOOTSTRAP', NOW(6), 'BOOTSTRAP')
ON DUPLICATE KEY UPDATE
  `Value`        = VALUES(`Value`),
  `is_active`    = VALUES(`is_active`),
  `display_order`= VALUES(`display_order`),
  `updated_at`   = NOW(6),
  `updated_by`   = 'BOOTSTRAP';


-- ────────────────────────────────────────────────────────────────────
-- 10.2 — Final BOOTSTRAP audit marker
-- ────────────────────────────────────────────────────────────────────
INSERT INTO `audit_log`
  (`actor_employee_id`, `actor_role_code`, `action`,
   `entity_type`, `entity_id`, `occurred_at`, `notes`)
SELECT
  'BOOTSTRAP', 'BOOTSTRAP', 'BOOTSTRAP_COMPLETE',
  'system', 'phase3-v2.0', NOW(6),
  'Phase 3 v2.0 bootstrap complete — 15 NEW tables created, 6 ALTERed, 28 lookups seeded'
WHERE NOT EXISTS (
  SELECT 1 FROM `audit_log` WHERE `action` = 'BOOTSTRAP_COMPLETE' AND `entity_id` = 'phase3-v2.0'
);


-- Verify
SELECT '✓ Migration 010 complete' AS status;
SELECT `CategoryID`, `CategoryDescription`, COUNT(*) AS lookup_count
  FROM `cmms_parameter_master`
 WHERE `CategoryID` BETWEEN 100 AND 199
GROUP BY `CategoryID`, `CategoryDescription`
ORDER BY `CategoryID`;
