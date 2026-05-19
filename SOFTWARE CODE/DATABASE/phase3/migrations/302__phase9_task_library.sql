-- ════════════════════════════════════════════════════════════════════
-- CMCMIS_SIMPLIFIED — Migration 302 (Phase 9)
-- File:     302__phase9_task_library.sql
-- Purpose:  CREATE task_library reference table and seed ~45 standard
--           calibration / inspection / maintenance tasks.
--
-- Engineer-flow (decision D-9.7):
--   Tab 10 dropdown shows tasks from this library, pre-filtered by the
--   JC's workflow_type's category. Engineer clicks "+ Add" to copy the
--   task text into jc_task_checklist (is_custom=0, task_id populated).
--
-- Custom tasks the engineer types live in jc_task_checklist with
-- is_custom=1 and task_id=NULL. They are NEVER promoted to this library
-- (avoids spam — library is curated).
--
-- Idempotent: YES — INSERT IGNORE on the seed.
-- ════════════════════════════════════════════════════════════════════

SET NAMES utf8mb4;
SET sql_mode = 'STRICT_TRANS_TABLES';

-- ─────────────────────────────────────────────────────────────────────
-- 1. task_library table
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `task_library` (
  `id`              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `category`        ENUM('CALIBRATION','INSPECTION','MAINTENANCE') NOT NULL,
  `task_text`       VARCHAR(500)  NOT NULL,
  `display_order`   SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  `is_active`       TINYINT(1)    NOT NULL DEFAULT 1,
  `created_at`      DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  UNIQUE KEY `uk_task_lib_cat_text` (`category`, `task_text`),
  KEY `idx_tlib_cat` (`category`, `is_active`, `display_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci
  COMMENT='Phase 9: standard task library, seeded once; Super-Admin-managed in future phase';

-- ─────────────────────────────────────────────────────────────────────
-- 2. SEED — CALIBRATION category (15 tasks)
-- ─────────────────────────────────────────────────────────────────────
INSERT IGNORE INTO `task_library` (`category`, `task_text`, `display_order`) VALUES
  ('CALIBRATION', 'Initial inspection and documentation',                            10),
  ('CALIBRATION', 'Visual check for physical damage',                                20),
  ('CALIBRATION', 'Verify equipment serial number against records',                  30),
  ('CALIBRATION', 'Pre-calibration verification (warm-up + reference check)',        40),
  ('CALIBRATION', 'Connect equipment to calibrated reference standards',             50),
  ('CALIBRATION', 'Record ambient temperature and humidity',                         60),
  ('CALIBRATION', 'Perform calibration procedure',                                   70),
  ('CALIBRATION', 'Take measurements at specified frequency / amplitude points',     80),
  ('CALIBRATION', 'Record observed vs. specified values',                            90),
  ('CALIBRATION', 'Apply calibration corrections / adjustments if within tolerance', 100),
  ('CALIBRATION', 'Post-calibration verification',                                   110),
  ('CALIBRATION', 'Generate calibration certificate (PDF)',                          120),
  ('CALIBRATION', 'Affix calibration sticker on equipment',                          130),
  ('CALIBRATION', 'Update equipment master with new calibration date',               140),
  ('CALIBRATION', 'Final documentation and customer handover',                       150);

-- ─────────────────────────────────────────────────────────────────────
-- 3. SEED — INSPECTION category (15 tasks)
-- ─────────────────────────────────────────────────────────────────────
INSERT IGNORE INTO `task_library` (`category`, `task_text`, `display_order`) VALUES
  ('INSPECTION', 'Receive equipment and verify accessories list',                    10),
  ('INSPECTION', 'Visual inspection — exterior / casing / cables',                   20),
  ('INSPECTION', 'Verify model number and serial number',                            30),
  ('INSPECTION', 'Power-on self-test (POST) check',                                  40),
  ('INSPECTION', 'Functional test — primary functions',                              50),
  ('INSPECTION', 'Functional test — secondary functions',                            60),
  ('INSPECTION', 'Performance check against datasheet specifications',               70),
  ('INSPECTION', 'Verify all I/O ports and connectors',                              80),
  ('INSPECTION', 'Check firmware / software version',                                90),
  ('INSPECTION', 'Run diagnostic / built-in self-test',                              100),
  ('INSPECTION', 'Document any observed defects with photographs',                   110),
  ('INSPECTION', 'Recommend repair / refurbish / condemn',                           120),
  ('INSPECTION', 'Cross-verify findings with supervisor (if defects found)',         130),
  ('INSPECTION', 'Generate inspection report',                                       140),
  ('INSPECTION', 'Tag equipment with inspection status sticker',                     150);

-- ─────────────────────────────────────────────────────────────────────
-- 4. SEED — MAINTENANCE category (15 tasks)
-- ─────────────────────────────────────────────────────────────────────
INSERT IGNORE INTO `task_library` (`category`, `task_text`, `display_order`) VALUES
  ('MAINTENANCE', 'Document defect symptoms reported by user',                       10),
  ('MAINTENANCE', 'Initial diagnosis and fault identification',                      20),
  ('MAINTENANCE', 'Disassemble equipment per service manual',                        30),
  ('MAINTENANCE', 'Clean internal components (dust, oxidation)',                     40),
  ('MAINTENANCE', 'Inspect PCBs for damage / burn marks / loose joints',             50),
  ('MAINTENANCE', 'Identify faulty component(s)',                                    60),
  ('MAINTENANCE', 'Order / pick replacement spares',                                 70),
  ('MAINTENANCE', 'Replace faulty component(s)',                                     80),
  ('MAINTENANCE', 'Re-assemble equipment',                                           90),
  ('MAINTENANCE', 'Power-on test after repair',                                      100),
  ('MAINTENANCE', 'Functional verification of repaired function',                    110),
  ('MAINTENANCE', 'Burn-in test (if applicable)',                                    120),
  ('MAINTENANCE', 'Update maintenance log',                                          130),
  ('MAINTENANCE', 'Apply PM (preventive maintenance) tasks if scheduled',            140),
  ('MAINTENANCE', 'Customer handover with repair summary',                           150);

-- ─────────────────────────────────────────────────────────────────────
-- Verify
-- ─────────────────────────────────────────────────────────────────────
SELECT '✓ Migration 302 complete' AS status;
SELECT `category`, COUNT(*) AS task_count
  FROM `task_library`
 WHERE `is_active` = 1
 GROUP BY `category`
 ORDER BY `category`;
