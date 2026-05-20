-- ════════════════════════════════════════════════════════════════════
-- CMCMIS_SIMPLIFIED — Migration 500 (Phase 13 · Schedule sub-module)
-- File:     500__phase13_schedule_tables.sql
-- Purpose:  Create the two NET-NEW tables that back the Schedule module:
--             • schedules                  — PM + Calibration plan rows
--             • schedule_status_history    — per-transition audit trail
--
-- DOCTRINE
--   ADDITIVE ONLY. Phase 13 is the first phase legitimately needing
--   write tables of its own — the legacy cmms_eqip_mst stores calibration
--   dates but has NO concept of "an editable, assignable, schedulable
--   PM/Cal event with a lifecycle". So we add two new tables and keep
--   the equipment row as a SOFT REFERENCE (no hard FK). The service
--   layer validates equipment_id against cmms_eqip_mst.
--
-- ROLLBACK
--   DROP TABLE IF EXISTS `schedule_status_history`;
--   DROP TABLE IF EXISTS `schedules`;
-- ════════════════════════════════════════════════════════════════════

SET NAMES utf8mb4;

-- ── 500.1  schedules ──────────────────────────────────────────────────
-- One row per PM or Calibration plan. `schedule_code` is the human
-- display id ("CAL-2026-04-01" / "PM-2026-Q2-01") generated atomically
-- by the service using a FOR UPDATE-locked count query on the year +
-- type slice. Stored (not derived) so it survives equipment renames.
CREATE TABLE IF NOT EXISTS `schedules` (
  `id`                            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

  -- Display id used in the UI + ICS UID. Stored so the FE never has to
  -- recompute it. NULL during the brief window between INSERT and the
  -- service's UPDATE that stamps the code — application layer keeps the
  -- transaction so external readers never see a NULL.
  `schedule_code`                 VARCHAR(24)  NOT NULL,

  -- PM vs Calibration. Drives the FE tab + chip colour + ICS SUMMARY prefix.
  `schedule_type`                 ENUM('PREVENTIVE_MAINTENANCE','CALIBRATION') NOT NULL,

  -- SOFT REFERENCE to cmms_eqip_mst. We store the composite
  -- "{EQM_TYPE}-{EQM_ID}" key the rest of the codebase uses (see
  -- lookups.repo.js searchEquipment). VARCHAR(40) is comfortable: legacy
  -- EQM_TYPE varchar(20) + EQM_ID varchar(20) + dash.
  `equipment_id`                  VARCHAR(40)  NOT NULL,

  -- Denormalised display name — captured at create time. Avoids the
  -- N+1 equipment JOIN on every calendar repaint. Refreshed on edit.
  `equipment_label`               VARCHAR(160) NULL DEFAULT NULL,

  -- The actual date the work is planned for. DATE, not DATETIME — the
  -- spec shows day-grain only (calendar grid + list view). DTSTART for
  -- the ICS export becomes 00:00:00 UTC on this date.
  `scheduled_date`                DATE         NOT NULL,

  `priority`                      ENUM('LOW','MEDIUM','HIGH') NOT NULL DEFAULT 'MEDIUM',

  -- Lifecycle. Derivable values (DUE) are also PERSISTED so the calendar
  -- can paint them without recomputing per row. The service refreshes
  -- DUE-ness on every status read AND every transition.
  `status`                        ENUM('PLANNED','SCHEDULED','DUE','COMPLETED','CANCELLED')
                                  NOT NULL DEFAULT 'PLANNED',

  -- Soft reference to cmms_emp_mst.EMM_ID (VARCHAR(7)). NULL ⇒ Unassigned.
  `assigned_engineer_employee_id` VARCHAR(7)   NULL DEFAULT NULL,

  -- Recurrence is informational in Phase 13 (no cron rebuilder yet). It
  -- is preserved so a Phase-14 worker can generate "next" rows.
  `recurrence`                    ENUM('NONE','MONTHLY','QUARTERLY','HALF_YEARLY','YEARLY')
                                  NOT NULL DEFAULT 'NONE',

  `notes`                         VARCHAR(1000) NULL DEFAULT NULL,

  -- WHO made the row. employee_id (VARCHAR(7)) shape matches every other
  -- audit column in the project.
  `created_by_employee_id`        VARCHAR(7)   NOT NULL,
  `created_at`                    DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

  `updated_by_employee_id`        VARCHAR(7)   NULL DEFAULT NULL,
  `updated_at`                    DATETIME(6)  NULL DEFAULT NULL,

  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_schedule_code` (`schedule_code`),

  -- HOT PATH: list + calendar fetch by (type, date-range). The (type,
  -- date) composite lets MySQL satisfy `WHERE schedule_type=? AND
  -- scheduled_date BETWEEN ? AND ?` from one index range scan.
  KEY `idx_sched_type_date`  (`schedule_type`, `scheduled_date`),
  -- Status filter (e.g. "Due / Planned" tab badges).
  KEY `idx_sched_status`     (`status`, `scheduled_date`),
  -- Cross-equipment lookup — "all schedules for this equipment".
  KEY `idx_sched_equipment`  (`equipment_id`, `scheduled_date`),
  -- Engineer workload — "my schedules" sort.
  KEY `idx_sched_engineer`   (`assigned_engineer_employee_id`, `scheduled_date`)

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Phase 13 — PM + Calibration schedule rows. Soft FK to equipment.';


-- ── 500.2  schedule_status_history ────────────────────────────────────
-- Append-only audit trail for every status transition. Joins to the
-- general audit_log row via (entity_type='schedule', entity_id=schedule_id)
-- but is denormalised here for fast Timeline rendering on the detail panel.
CREATE TABLE IF NOT EXISTS `schedule_status_history` (
  `id`                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `schedule_id`       BIGINT UNSIGNED NOT NULL,
  -- NULL for the very first row (NULL→PLANNED on create).
  `from_status`       VARCHAR(20)  NULL DEFAULT NULL,
  `to_status`         VARCHAR(20)  NOT NULL,
  `actor_employee_id` VARCHAR(7)   NOT NULL,
  `reason`            VARCHAR(500) NULL DEFAULT NULL,
  `created_at`        DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

  PRIMARY KEY (`id`),
  KEY `idx_sched_hist_schedule` (`schedule_id`, `created_at`)

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Phase 13 — schedule status transition log.';


-- ── 500.3  Verify ─────────────────────────────────────────────────────
SELECT TABLE_NAME, TABLE_ROWS, ENGINE, TABLE_COLLATION
  FROM information_schema.TABLES
 WHERE TABLE_SCHEMA = DATABASE()
   AND TABLE_NAME IN ('schedules', 'schedule_status_history')
 ORDER BY TABLE_NAME;

SELECT TABLE_NAME, INDEX_NAME,
       GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS columns
  FROM information_schema.STATISTICS
 WHERE TABLE_SCHEMA = DATABASE()
   AND TABLE_NAME IN ('schedules', 'schedule_status_history')
 GROUP BY TABLE_NAME, INDEX_NAME
 ORDER BY TABLE_NAME, INDEX_NAME;

SELECT '✓ Migration 500 complete — Phase 13 schedule tables ready' AS result;
