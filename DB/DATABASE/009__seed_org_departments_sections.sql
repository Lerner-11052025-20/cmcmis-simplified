-- ════════════════════════════════════════════════════════════════════
-- CMCMIS_SIMPLIFIED — Migration 009
-- File:     009__seed_org_departments_sections.sql
-- Purpose:  Seed TIMCD department + T&ME and F&PE sections (per Q8)
-- Idempotent: YES — INSERT IGNORE on duplicate UNIQUE key
-- ════════════════════════════════════════════════════════════════════

SET NAMES utf8mb4;

-- ────────────────────────────────────────────────────────────────────
-- 9.1 — Department: TIMCD
-- ────────────────────────────────────────────────────────────────────
INSERT IGNORE INTO `departments`
  (`department_code`, `department_name`, `department_description`,
   `is_active`, `created_at`, `created_by`, `updated_at`, `updated_by`)
VALUES
  ('TIMCD',
   'Test / Inspection / Maintenance / Calibration Division',
   'Parent department housing both T&ME and F&PE sections',
   1, NOW(6), 'BOOTSTRAP', NOW(6), 'BOOTSTRAP');

-- ────────────────────────────────────────────────────────────────────
-- 9.2 — Sections: T&ME and F&PE under TIMCD
-- ────────────────────────────────────────────────────────────────────
INSERT IGNORE INTO `sections`
  (`department_id`, `section_code`, `section_name`, `section_description`,
   `equipment_category`, `head_employee_id`,
   `is_active`, `created_at`, `created_by`, `updated_at`, `updated_by`)
VALUES
  ((SELECT `department_id` FROM `departments` WHERE `department_code` = 'TIMCD'),
   'TME',
   'Test & Measurement Equipment',
   'Section under TIMCD responsible for T&ME instruments (oscilloscopes, DMMs, etc.)',
   'TME', NULL,
   1, NOW(6), 'BOOTSTRAP', NOW(6), 'BOOTSTRAP'),

  ((SELECT `department_id` FROM `departments` WHERE `department_code` = 'TIMCD'),
   'FPE',
   'Fabrication & Production Equipment',
   'Section under TIMCD responsible for F&PE machines (presses, mills, etc.)',
   'FPE', NULL,
   1, NOW(6), 'BOOTSTRAP', NOW(6), 'BOOTSTRAP');


-- Audit-log entries
INSERT INTO `audit_log`
  (`actor_employee_id`, `actor_role_code`, `action`,
   `entity_type`, `entity_id`, `occurred_at`, `notes`)
SELECT
  'BOOTSTRAP', 'BOOTSTRAP', 'DEPARTMENT_CREATE',
  'departments', CAST(d.`department_id` AS CHAR), NOW(6),
  CONCAT('Bootstrap seed: ', d.`department_code`, ' / ', d.`department_name`)
FROM `departments` d
WHERE d.`department_code` = 'TIMCD'
  AND NOT EXISTS (
    SELECT 1 FROM `audit_log` al
     WHERE al.`action` = 'DEPARTMENT_CREATE'
       AND al.`entity_id` = CAST(d.`department_id` AS CHAR)
  );

INSERT INTO `audit_log`
  (`actor_employee_id`, `actor_role_code`, `action`,
   `entity_type`, `entity_id`, `occurred_at`, `notes`)
SELECT
  'BOOTSTRAP', 'BOOTSTRAP', 'SECTION_CREATE',
  'sections', CAST(s.`section_id` AS CHAR), NOW(6),
  CONCAT('Bootstrap seed: ', s.`section_code`, ' / ', s.`section_name`)
FROM `sections` s
WHERE s.`section_code` IN ('TME', 'FPE')
  AND NOT EXISTS (
    SELECT 1 FROM `audit_log` al
     WHERE al.`action` = 'SECTION_CREATE'
       AND al.`entity_id` = CAST(s.`section_id` AS CHAR)
  );


-- Verify
SELECT '✓ Migration 009 complete' AS status;
SELECT `department_code`, `department_name` FROM `departments`;
SELECT s.`section_code`, s.`section_name`, s.`equipment_category`,
       d.`department_code` AS parent_dept
  FROM `sections` s
  JOIN `departments` d ON d.`department_id` = s.`department_id`
ORDER BY s.`section_code`;
