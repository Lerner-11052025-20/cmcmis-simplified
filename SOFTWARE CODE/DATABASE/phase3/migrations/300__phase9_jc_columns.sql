-- ════════════════════════════════════════════════════════════════════
-- CMCMIS_SIMPLIFIED — Migration 300 (Phase 9)
-- File:     300__phase9_jc_columns.sql
-- Purpose:  ADD 53 NULLable columns to cmms_jobcard_mst so the new MVP
--           Job Card detail page (13 tabs) can persist all of the
--           engineer's tab data + completion metadata + closure form.
--
-- NAMING CONVENTION (decision D-9.10 LOCKED 2026-05-19):
--   New columns use canonical snake_case (e.g. plug_in_accessories),
--   NOT the legacy JM_* upper-prefix style. See SCHEMA_PHASE9.md for
--   the rationale and authority chain.
--
-- WHY ADDITIVE-ONLY:
--   19,432 legacy VERIFIED_CLOSED rows live in cmms_jobcard_mst from
--   prior CMMS imports. NOT NULL on any new column would 1-shot crash
--   on apply. Every column here is NULL, so legacy rows pass validation
--   untouched and new MVP rows populate them explicitly.
--
-- LEGACY READ-ONLY GUARANTEE (D-9.14):
--   With every Phase 9 column NULL on legacy rows, the FE detail page
--   detects "all-Phase-9-cols-NULL" and renders a read-only banner.
--   The data tabs render in disabled state. No transitions are
--   permitted on legacy JCs.
--
-- Idempotent: YES via ADD COLUMN IF NOT EXISTS (MariaDB 10.0+ / MySQL 8.0.16+).
-- Single ALTER statement (faster than 53 separate ALTERs).
-- ════════════════════════════════════════════════════════════════════

SET NAMES utf8mb4;
SET sql_mode = 'STRICT_TRANS_TABLES';

ALTER TABLE `cmms_jobcard_mst`
  -- ───── TAB 2: Plug-In / Accessories (image 13) ──────────────────────
  ADD COLUMN IF NOT EXISTS `plug_in_accessories` TEXT NULL
    COMMENT 'Phase 9: Plug-In/Accessories tab — list of accessories received with the equipment',
  -- ───── TAB 3: Submitted & Received (image 11) ───────────────────────
  ADD COLUMN IF NOT EXISTS `equipment_submitted_date` DATETIME(6) NULL
    COMMENT 'Phase 9: when the submitter handed over the equipment',
  ADD COLUMN IF NOT EXISTS `submitted_by` VARCHAR(255) NULL
    COMMENT 'Phase 9: free-text name of the person who submitted the equipment',
  ADD COLUMN IF NOT EXISTS `equipment_received_date_actual` DATETIME(6) NULL
    COMMENT 'Phase 9: actual date the lab received the equipment (distinct from JM_JCRecdDate, the planned date)',
  ADD COLUMN IF NOT EXISTS `received_by` VARCHAR(255) NULL
    COMMENT 'Phase 9: free-text name of the person at the lab who received the equipment',
  -- ───── TAB 1: Job Card Details (image 10) ───────────────────────────
  ADD COLUMN IF NOT EXISTS `instrument_received_date` DATE NULL
    COMMENT 'Phase 9: separate from JM_InstRecdDate — engineer-entered',
  ADD COLUMN IF NOT EXISTS `job_complete_planned_date` DATE NULL
    COMMENT 'Phase 9: engineer-revised planned completion date',
  ADD COLUMN IF NOT EXISTS `job_type` ENUM('IN_HOUSE','VENDOR') NULL
    COMMENT 'Phase 9: whether work is done in-house or sent to vendor',
  ADD COLUMN IF NOT EXISTS `repair_type` ENUM('BREAK_DOWN','WARRANTY','PM','NEED_BASED') NULL
    COMMENT 'Phase 9: classification of the repair work',
  ADD COLUMN IF NOT EXISTS `job_request_remarks` TEXT NULL
    COMMENT 'Phase 9: engineer remarks specific to handling this job request',
  -- ───── TAB 5: Equipments Used (image 9) ─────────────────────────────
  ADD COLUMN IF NOT EXISTS `equipments_used` TEXT NULL
    COMMENT 'Phase 9: free-form list of equipment/tools used by the engineer for this repair',
  -- ───── TAB 6: Awaiting Information (image 8) ────────────────────────
  ADD COLUMN IF NOT EXISTS `awaiting_for` VARCHAR(255) NULL
    COMMENT 'Phase 9: free-text descriptor of what we are waiting for',
  ADD COLUMN IF NOT EXISTS `awaiting_status` ENUM('AWAITING_FOR_SPARES','AWAITING_FOR_VENDOR','AWAITING_FOR_CUSTOMER','AWAITING_FOR_INFO','NONE') NULL DEFAULT 'NONE'
    COMMENT 'Phase 9: structured waiting state for the awaiting tab',
  ADD COLUMN IF NOT EXISTS `supplier_name` VARCHAR(255) NULL
    COMMENT 'Phase 9: supplier we are waiting on, if any',
  ADD COLUMN IF NOT EXISTS `awaiting_from_date` DATE NULL
    COMMENT 'Phase 9: date the waiting period started',
  ADD COLUMN IF NOT EXISTS `awaiting_clear_date` DATE NULL
    COMMENT 'Phase 9: date the wait was cleared (information arrived, vendor responded, etc.)',
  ADD COLUMN IF NOT EXISTS `attended_by` VARCHAR(255) NULL
    COMMENT 'Phase 9: person at the supplier or vendor who attended to our request',
  -- Procurement Details sub-block of Tab 6.
  ADD COLUMN IF NOT EXISTS `indent_no` VARCHAR(100) NULL
    COMMENT 'Phase 9: procurement indent reference number',
  ADD COLUMN IF NOT EXISTS `indent_date` DATE NULL
    COMMENT 'Phase 9: date the indent was raised',
  ADD COLUMN IF NOT EXISTS `mirv_no` VARCHAR(100) NULL
    COMMENT 'Phase 9: Material Inward Receipt Voucher number',
  ADD COLUMN IF NOT EXISTS `mirv_date` DATE NULL
    COMMENT 'Phase 9: MIRV date',
  ADD COLUMN IF NOT EXISTS `po_no` VARCHAR(100) NULL
    COMMENT 'Phase 9: Purchase Order number',
  ADD COLUMN IF NOT EXISTS `po_date` DATE NULL
    COMMENT 'Phase 9: PO date',
  ADD COLUMN IF NOT EXISTS `procurement_cost` DECIMAL(12,2) NULL
    COMMENT 'Phase 9: total procurement cost in INR',
  -- ───── TAB 8: Contract / Warranty (image 6) ─────────────────────────
  ADD COLUMN IF NOT EXISTS `vendor_supplier_name` VARCHAR(255) NULL
    COMMENT 'Phase 9: vendor or supplier providing the service',
  ADD COLUMN IF NOT EXISTS `intimation_sent_on` DATE NULL
    COMMENT 'Phase 9: when we first contacted the vendor',
  ADD COLUMN IF NOT EXISTS `sent_to_vendor_date` DATE NULL
    COMMENT 'Phase 9: date equipment was sent for repair (1st visit / ship)',
  ADD COLUMN IF NOT EXISTS `received_from_vendor_date` DATE NULL
    COMMENT 'Phase 9: date equipment came back from the vendor (completed)',
  ADD COLUMN IF NOT EXISTS `gate_pass_no` VARCHAR(100) NULL
    COMMENT 'Phase 9: security gate pass number for the equipment movement',
  ADD COLUMN IF NOT EXISTS `gate_pass_issued_date` DATE NULL
    COMMENT 'Phase 9: when the gate pass was issued',
  ADD COLUMN IF NOT EXISTS `cost_of_component` DECIMAL(12,2) NULL
    COMMENT 'Phase 9: cost of spare components in INR',
  ADD COLUMN IF NOT EXISTS `labour_charges` DECIMAL(12,2) NULL
    COMMENT 'Phase 9: labour/service charges in INR',
  ADD COLUMN IF NOT EXISTS `invoice_no` VARCHAR(100) NULL
    COMMENT 'Phase 9: vendor invoice reference number',
  ADD COLUMN IF NOT EXISTS `invoice_recd_on` DATE NULL
    COMMENT 'Phase 9: date the invoice was received',
  -- ───── TAB 9: Observations (image 2) ────────────────────────────────
  -- job_status_display is SEPARATE from system JM_MVP_STATUS (Q-8 LOCKED).
  ADD COLUMN IF NOT EXISTS `observations_text` TEXT NULL
    COMMENT 'Phase 9: engineer-entered observations free-text',
  ADD COLUMN IF NOT EXISTS `job_status_display` ENUM('AWAITING_FOR_VENDOR','AWAITING_FOR_SPARES','IN_PROGRESS_NORMAL','HOLD','RESUMED') NULL DEFAULT 'IN_PROGRESS_NORMAL'
    COMMENT 'Phase 9: engineer-facing status label, distinct from system JM_MVP_STATUS',
  -- ───── COMPLETION (Tab 12: Mark as Complete, image 18) ──────────────
  ADD COLUMN IF NOT EXISTS `completion_summary` TEXT NULL
    COMMENT 'Phase 9: engineer summary at mark-complete; min 20 chars enforced by validator',
  ADD COLUMN IF NOT EXISTS `actual_completion_date` DATE NULL
    COMMENT 'Phase 9: when the engineer actually finished the work',
  ADD COLUMN IF NOT EXISTS `total_hours_spent` DECIMAL(6,2) NULL
    COMMENT 'Phase 9: total hours spent on the job, manually entered (Q-6 locked)',
  ADD COLUMN IF NOT EXISTS `marked_complete_by_employee_id` VARCHAR(7) NULL
    COMMENT 'Phase 9: employee_id of the actor who marked the JC complete (D-9.12)',
  ADD COLUMN IF NOT EXISTS `marked_complete_at` DATETIME(6) NULL
    COMMENT 'Phase 9: when mark-complete was executed',
  -- ───── CLOSURE (Tab 13: Closure, images 16-17) ──────────────────────
  ADD COLUMN IF NOT EXISTS `reviewed_by` VARCHAR(255) NULL
    COMMENT 'Phase 9: closure form — name of the QA inspector',
  ADD COLUMN IF NOT EXISTS `review_date` DATE NULL
    COMMENT 'Phase 9: closure form — date of the quality review',
  ADD COLUMN IF NOT EXISTS `review_comments` TEXT NULL
    COMMENT 'Phase 9: closure form — review findings and approval notes',
  ADD COLUMN IF NOT EXISTS `equipment_received_by_customer` VARCHAR(255) NULL
    COMMENT 'Phase 9: closure form — name of the customer rep who received the equipment back',
  ADD COLUMN IF NOT EXISTS `customer_received_date` DATE NULL
    COMMENT 'Phase 9: closure form — date customer received the equipment',
  ADD COLUMN IF NOT EXISTS `customer_acknowledged` TINYINT(1) NOT NULL DEFAULT 0
    COMMENT 'Phase 9: closure form — equipment received in satisfactory condition checkbox; REQUIRED=1 to close per Q-9',
  ADD COLUMN IF NOT EXISTS `final_closure_notes` TEXT NULL
    COMMENT 'Phase 9: closure form — any additional notes for the job card closure',
  ADD COLUMN IF NOT EXISTS `verified_closed_by_employee_id` VARCHAR(7) NULL
    COMMENT 'Phase 9: employee_id of the LIC/SA who verified-closed the JC (D-9.12)',
  ADD COLUMN IF NOT EXISTS `verified_closed_at` DATETIME(6) NULL
    COMMENT 'Phase 9: when verify-close was executed',
  -- ───── REOPEN TRACKING (decision D-9.6) ─────────────────────────────
  ADD COLUMN IF NOT EXISTS `last_reopened_at` DATETIME(6) NULL
    COMMENT 'Phase 9: timestamp of the most recent reopen action',
  ADD COLUMN IF NOT EXISTS `last_reopened_by_employee_id` VARCHAR(7) NULL
    COMMENT 'Phase 9: employee_id of the LIC/SA who reopened the JC (D-9.12)',
  ADD COLUMN IF NOT EXISTS `reopen_count` INT UNSIGNED NOT NULL DEFAULT 0
    COMMENT 'Phase 9: total reopen actions on this JC (audit trail of how often this JC has been sent back)';

-- Verify
SELECT '✓ Migration 300 complete' AS status;
SELECT COUNT(*) AS phase9_columns_present
  FROM information_schema.COLUMNS
 WHERE TABLE_SCHEMA = DATABASE()
   AND TABLE_NAME   = 'cmms_jobcard_mst'
   AND COLUMN_NAME IN (
     'plug_in_accessories', 'equipment_submitted_date', 'submitted_by',
     'equipment_received_date_actual', 'received_by',
     'instrument_received_date', 'job_complete_planned_date', 'job_type',
     'repair_type', 'job_request_remarks', 'equipments_used',
     'awaiting_for', 'awaiting_status', 'supplier_name',
     'awaiting_from_date', 'awaiting_clear_date', 'attended_by',
     'indent_no', 'indent_date', 'mirv_no', 'mirv_date', 'po_no', 'po_date',
     'procurement_cost', 'vendor_supplier_name', 'intimation_sent_on',
     'sent_to_vendor_date', 'received_from_vendor_date', 'gate_pass_no',
     'gate_pass_issued_date', 'cost_of_component', 'labour_charges',
     'invoice_no', 'invoice_recd_on', 'observations_text',
     'job_status_display', 'completion_summary', 'actual_completion_date',
     'total_hours_spent', 'marked_complete_by_employee_id',
     'marked_complete_at', 'reviewed_by', 'review_date', 'review_comments',
     'equipment_received_by_customer', 'customer_received_date',
     'customer_acknowledged', 'final_closure_notes',
     'verified_closed_by_employee_id', 'verified_closed_at',
     'last_reopened_at', 'last_reopened_by_employee_id', 'reopen_count');
