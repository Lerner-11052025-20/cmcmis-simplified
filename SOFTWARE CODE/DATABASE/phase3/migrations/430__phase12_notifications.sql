-- ════════════════════════════════════════════════════════════════════
-- CMCMIS_SIMPLIFIED — Migration 430 (Phase 12)
-- File:     430__phase12_notifications.sql
-- Purpose:  Create the `notifications` table for in-app, role-scoped,
--           workflow-event notifications. Additive only — no ALTER of
--           any existing table.
--
-- ATOMICITY MODEL
--   Notifications are inserted INSIDE the same transaction as the
--   workflow state change + audit_log + status_history row that
--   triggered them (see notifications.emitter.js). If the transaction
--   rolls back, no notification row exists. Zero orphan rows.
--
-- RECIPIENT SCOPING
--   Every read query is keyed by `recipient_employee_id`. A user can
--   NEVER read another user's notifications — the SQL layer enforces
--   it (defense in depth: the service also filters, but the index +
--   WHERE clause is the source of truth).
--
-- INDEX STRATEGY
--   • `idx_notif_recipient_unread` covers the hot path: bell unread
--     count + "list my unread" newest-first.
--   • `idx_notif_entity` lets us answer "show me all notifications
--     for this Job Card / Job Request" — used by the entity detail
--     pages should we surface a "Recent activity" panel later.
--
-- ROLLBACK
--   DROP TABLE IF EXISTS notifications;
-- ════════════════════════════════════════════════════════════════════

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS `notifications` (
  `id`                    BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

  -- WHO sees the notification. Always the employee_id (VARCHAR(7))
  -- shape, matching audit_log.actor_employee_id and the JR/JC actor
  -- columns throughout the codebase. NOT NULL — every notification
  -- targets exactly ONE recipient (broadcast = one row per recipient).
  `recipient_employee_id` VARCHAR(7) NOT NULL,

  -- WHO caused the workflow event. NULL is allowed for system-driven
  -- events (e.g. a cron purge or a migration backfill). Normal flow
  -- always populates this.
  `actor_employee_id`     VARCHAR(7) NULL DEFAULT NULL,

  -- WHAT happened. UPPER_SNAKE for stability — used in switches on the
  -- FE to pick icons + accent colours. Examples:
  --   JR_SUBMITTED, JR_APPROVED_CONVERTED, JR_REJECTED, JR_CANCELLED,
  --   JC_CREATED, JC_START_WORK, JC_TAB_UPDATED, JC_MARKED_COMPLETE,
  --   JC_VERIFIED_CLOSED, JC_REOPENED, JC_CHILD_ROW_ADDED, …
  `event_type`            VARCHAR(60)  NOT NULL,

  -- WHICH entity. Three values cover Phase 12 scope; extensible
  -- without ALTER because new event_types can choose any of these
  -- (or we can grow this enum in a future additive ALTER).
  `entity_type`           ENUM('JOB_REQUEST','JOB_CARD','EQUIPMENT') NOT NULL,

  -- The entity's natural key for deep-linking. VARCHAR(20) covers:
  --   • JR_JOBREQUESTNO (INT cast to string)
  --   • JM_SectionJobNo (varchar(9))
  --   • EQM_TYPE-EQM_ID composite key
  -- Indexed below so we can fan out "all notifications for this card".
  `entity_id`             VARCHAR(20)  NOT NULL,

  -- USER-FACING text. The emitter builds these from a small template
  -- dictionary; we DENORMALISE here (rather than join later) so the
  -- bell dropdown is a single narrow SELECT. Body is optional.
  `title`                 VARCHAR(160) NOT NULL,
  `body`                  VARCHAR(500) NULL DEFAULT NULL,

  -- Front-end deep-link (relative path). Click → router.push().
  -- Example: "/job-cards/J00024219" or "/job-requests/24265".
  `deep_link`             VARCHAR(200) NULL DEFAULT NULL,

  -- READ FLAG. Tiny instead of bool — MySQL stores both as 1 byte but
  -- TINYINT(1) is the project convention.
  `is_read`               TINYINT(1)   NOT NULL DEFAULT 0,

  -- Timestamps. created_at uses NOW(6) for microsecond precision (matches
  -- the sealed audit_log + status_history clocks). read_at is NULL until
  -- the user explicitly marks read.
  `created_at`            DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `read_at`               DATETIME(6)  NULL DEFAULT NULL,

  PRIMARY KEY (`id`),

  -- HOT PATH: bell unread count + list-my-unread newest-first.
  -- Composite (recipient, is_read, created_at DESC) lets MySQL satisfy
  -- both `WHERE recipient=? AND is_read=0` count queries AND
  -- `ORDER BY created_at DESC` list queries from one index scan.
  KEY `idx_notif_recipient_unread` (`recipient_employee_id`, `is_read`, `created_at`),

  -- For "all activity on this entity" lookups (future Activity panel
  -- on the JC / JR detail pages — design only; no endpoint shipped this phase).
  KEY `idx_notif_entity` (`entity_type`, `entity_id`)

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Phase 12 — in-app notifications. Recipient-scoped. No email.';


-- ── Verify ────────────────────────────────────────────────────────────
SELECT
  TABLE_NAME,
  TABLE_ROWS,
  ENGINE,
  TABLE_COLLATION
  FROM information_schema.TABLES
 WHERE TABLE_SCHEMA = DATABASE()
   AND TABLE_NAME   = 'notifications';

SELECT INDEX_NAME, GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS columns
  FROM information_schema.STATISTICS
 WHERE TABLE_SCHEMA = DATABASE()
   AND TABLE_NAME   = 'notifications'
 GROUP BY INDEX_NAME
 ORDER BY INDEX_NAME;

SELECT '✓ Migration 430 complete — notifications table ready' AS result;
