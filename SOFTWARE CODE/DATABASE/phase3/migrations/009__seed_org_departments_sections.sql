-- CMCMIS_SIMPLIFIED — Migration 009 (FIXED for MariaDB collation mix)
-- Uses user variables instead of subqueries to avoid collation coercion.
-- Idempotent: YES (INSERT IGNORE on UNIQUE)

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ── 9.1 Department: TIMCD ────────────────────────────────────────
INSERT IGNORE INTO `departments`
  (`department_code`, `department_name`, `department_description`,
   `is_active`, `created_at`, `created_by`, `updated_at`, `updated_by`)
VALUES
  ('TIMCD',
   'Test / Inspection / Maintenance / Calibration Division',
   'Parent department housing both T&ME and F&PE sections',
   1, NOW(6), 'BOOTSTRAP', NOW(6), 'BOOTSTRAP');

-- Capture department_id into a user variable (avoids subquery collation issues)
SELECT `department_id` INTO @dept_id
  FROM `departments`
 WHERE `department_code` = 'TIMCD' COLLATE utf8mb4_unicode_ci
 LIMIT 1;

-- ── 9.2 Sections: T&ME and F&PE under TIMCD ──────────────────────
INSERT IGNORE INTO `sections`
  (`department_id`, `section_code`, `section_name`, `section_description`,
   `equipment_category`, `head_employee_id`,
   `is_active`, `created_at`, `created_by`, `updated_at`, `updated_by`)
VALUES
  (@dept_id, 'TME',
   'Test & Measurement Equipment',
   'Section under TIMCD responsible for T&ME instruments (oscilloscopes, DMMs, etc.)',
   'TME', NULL,
   1, NOW(6), 'BOOTSTRAP', NOW(6), 'BOOTSTRAP'),

  (@dept_id, 'FPE',
   'Fabrication & Process Equipment',
   'Section under TIMCD responsible for F&PE machines (presses, mills, etc.)',
   'FPE', NULL,
   1, NOW(6), 'BOOTSTRAP', NOW(6), 'BOOTSTRAP');


-- ── 9.3 Audit log entries (simplified — uses variables, no NOT EXISTS) ─
-- Idempotency: we check via simple COUNT(*) against audit_log

SELECT COUNT(*) INTO @dept_audit_exists
  FROM `audit_log`
 WHERE `action` = 'DEPARTMENT_CREATE' COLLATE utf8mb4_unicode_ci
   AND `entity_id` = CAST(@dept_id AS CHAR) COLLATE utf8mb4_unicode_ci;

SET @sql := IF(@dept_audit_exists > 0, 'SELECT 1',
  CONCAT('INSERT INTO `audit_log`
            (`actor_employee_id`, `actor_role_code`, `action`,
             `entity_type`, `entity_id`, `occurred_at`, `notes`)
          VALUES (''BOOTSTRAP'', ''BOOTSTRAP'', ''DEPARTMENT_CREATE'',
                  ''departments'', ''', CAST(@dept_id AS CHAR), ''', NOW(6),
                  ''Bootstrap seed: TIMCD'')'));
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;


-- Section audit entries
SELECT `section_id` INTO @tme_id
  FROM `sections`
 WHERE `section_code` = 'TME' COLLATE utf8mb4_unicode_ci
 LIMIT 1;

SELECT COUNT(*) INTO @tme_audit_exists
  FROM `audit_log`
 WHERE `action` = 'SECTION_CREATE' COLLATE utf8mb4_unicode_ci
   AND `entity_id` = CAST(@tme_id AS CHAR) COLLATE utf8mb4_unicode_ci;

SET @sql := IF(@tme_audit_exists > 0, 'SELECT 1',
  CONCAT('INSERT INTO `audit_log`
            (`actor_employee_id`, `actor_role_code`, `action`,
             `entity_type`, `entity_id`, `occurred_at`, `notes`)
          VALUES (''BOOTSTRAP'', ''BOOTSTRAP'', ''SECTION_CREATE'',
                  ''sections'', ''', CAST(@tme_id AS CHAR), ''', NOW(6),
                  ''Bootstrap seed: TME / Test & Measurement Equipment'')'));
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;


SELECT `section_id` INTO @fpe_id
  FROM `sections`
 WHERE `section_code` = 'FPE' COLLATE utf8mb4_unicode_ci
 LIMIT 1;

SELECT COUNT(*) INTO @fpe_audit_exists
  FROM `audit_log`
 WHERE `action` = 'SECTION_CREATE' COLLATE utf8mb4_unicode_ci
   AND `entity_id` = CAST(@fpe_id AS CHAR) COLLATE utf8mb4_unicode_ci;

SET @sql := IF(@fpe_audit_exists > 0, 'SELECT 1',
  CONCAT('INSERT INTO `audit_log`
            (`actor_employee_id`, `actor_role_code`, `action`,
             `entity_type`, `entity_id`, `occurred_at`, `notes`)
          VALUES (''BOOTSTRAP'', ''BOOTSTRAP'', ''SECTION_CREATE'',
                  ''sections'', ''', CAST(@fpe_id AS CHAR), ''', NOW(6),
                  ''Bootstrap seed: FPE / Fabrication & Process Equipment'')'));
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;


-- Verify
SELECT '✓ Migration 009 complete' AS status;
SELECT `department_code`, `department_name` FROM `departments`;
SELECT s.`section_code`, s.`section_name`, s.`equipment_category`,
       d.`department_code` AS parent_dept
  FROM `sections` s
  JOIN `departments` d ON d.`department_id` = s.`department_id`
ORDER BY s.`section_code`;
