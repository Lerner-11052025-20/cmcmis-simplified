-- ════════════════════════════════════════════════════════════════════
-- CMCMIS_SIMPLIFIED — Migration 501 (Phase 13 · Procurement sub-module)
-- File:     501__phase13_procurement_tables.sql
-- Purpose:  Create three NET-NEW tables backing Procurement:
--             • spare_parts            — inventory rows (one per part)
--             • purchase_orders        — PO header (vendor + totals + status)
--             • purchase_order_items   — PO line items (FK to PO header)
--
-- DOCTRINE
--   ADDITIVE ONLY. The legacy schema stores PO fragments AS COLUMNS on
--   the equipment row (po_number, po_date, mivr_number, cost) — that is
--   inadequate for a real Procurement module which needs multi-item POs,
--   spare-part inventory, and lifecycle status. So we add the three
--   tables below; vendor remains a SOFT reference to cmms_cont_mst.
--
-- TOTALS DOCTRINE
--   purchase_orders.total_cost AND purchase_order_items.line_total are
--   SERVER-COMPUTED inside the create/update transaction. The DB just
--   stores them; the application is the source of truth (we never trust
--   the client-submitted total).
--
-- ROLLBACK
--   DROP TABLE IF EXISTS `purchase_order_items`;
--   DROP TABLE IF EXISTS `purchase_orders`;
--   DROP TABLE IF EXISTS `spare_parts`;
-- ════════════════════════════════════════════════════════════════════

SET NAMES utf8mb4;

-- ── 501.1  spare_parts ────────────────────────────────────────────────
-- One row per inventoried spare. equipment_ref is a free-text soft ref
-- (model code or composite EQM_TYPE-EQM_ID) — the procurement clerk may
-- type "TS-450" or pick from the equipment typeahead.
CREATE TABLE IF NOT EXISTS `spare_parts` (
  `id`                       BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `part_code`                VARCHAR(24)  NOT NULL,         -- SP-001 …
  `part_name`                VARCHAR(160) NOT NULL,
  `equipment_ref`            VARCHAR(80)  NULL DEFAULT NULL,
  -- Soft ref → cmms_cont_mst.CMM_CONT_ID. INT in the legacy table; we
  -- store as VARCHAR(20) for symmetry with the rest of Phase 13 (no
  -- hard FK to legacy by doctrine).
  `vendor_id`                VARCHAR(20)  NULL DEFAULT NULL,
  -- Denormalised vendor label so the list does not need to JOIN.
  `vendor_label`             VARCHAR(160) NULL DEFAULT NULL,
  `stock_qty`                INT          NOT NULL DEFAULT 0,
  `min_stock`                INT          NOT NULL DEFAULT 0,
  `unit_cost`                DECIMAL(14,2) NULL DEFAULT NULL,
  `last_ordered_date`        DATE         NULL DEFAULT NULL,
  `notes`                    VARCHAR(1000) NULL DEFAULT NULL,
  `created_by_employee_id`   VARCHAR(7)   NOT NULL,
  `created_at`               DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_by_employee_id`   VARCHAR(7)   NULL DEFAULT NULL,
  `updated_at`               DATETIME(6)  NULL DEFAULT NULL,

  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_spare_code` (`part_code`),
  -- Hot path: low-stock report (stock_qty <= min_stock) + lookups by vendor.
  KEY `idx_spare_vendor`   (`vendor_id`),
  KEY `idx_spare_stock`    (`stock_qty`, `min_stock`)

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Phase 13 — spare-parts inventory. Soft FK to cmms_cont_mst (vendor).';


-- ── 501.2  purchase_orders (header) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS `purchase_orders` (
  `id`                       BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `po_number`                VARCHAR(24)  NOT NULL,         -- PO-2026-0045
  `vendor_id`                VARCHAR(20)  NOT NULL,         -- soft ref
  `vendor_label`             VARCHAR(160) NULL DEFAULT NULL,
  `po_date`                  DATE         NOT NULL,
  `warranty_months`          INT          NULL DEFAULT NULL,
  -- SERVER-COMPUTED. UPDATE inside the txn after each item insert.
  `total_cost`               DECIMAL(16,2) NOT NULL DEFAULT 0,
  `status`                   ENUM('ACTIVE','COMPLETED','EXPIRED') NOT NULL DEFAULT 'ACTIVE',
  `notes`                    VARCHAR(1000) NULL DEFAULT NULL,
  `created_by_employee_id`   VARCHAR(7)   NOT NULL,
  `created_at`               DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_by_employee_id`   VARCHAR(7)   NULL DEFAULT NULL,
  `updated_at`               DATETIME(6)  NULL DEFAULT NULL,

  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_po_number` (`po_number`),
  KEY `idx_po_vendor` (`vendor_id`),
  KEY `idx_po_status` (`status`, `po_date`),
  KEY `idx_po_date`   (`po_date`)

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Phase 13 — purchase order header. Server-computed totals.';


-- ── 501.3  purchase_order_items (line items) ─────────────────────────
-- Hard FK to purchase_orders (parent inside Phase-13 island; safe). NO FK
-- to spare_parts because spare deletions should NOT block historical POs.
CREATE TABLE IF NOT EXISTS `purchase_order_items` (
  `id`               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `po_id`            BIGINT UNSIGNED NOT NULL,
  `item_name`        VARCHAR(200) NOT NULL,
  `spare_part_id`    BIGINT UNSIGNED NULL DEFAULT NULL,
  `quantity`         INT          NOT NULL,
  `unit_cost`        DECIMAL(14,2) NOT NULL,
  -- SERVER-COMPUTED. quantity * unit_cost, stamped at insert time.
  `line_total`       DECIMAL(16,2) NOT NULL,

  PRIMARY KEY (`id`),
  KEY `idx_poi_po`    (`po_id`),
  KEY `idx_poi_spare` (`spare_part_id`),

  CONSTRAINT `fk_poi_po`
    FOREIGN KEY (`po_id`) REFERENCES `purchase_orders`(`id`) ON DELETE CASCADE

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Phase 13 — PO line items. FK to PO header; soft ref to spare_parts.';


-- ── 501.4  Verify ─────────────────────────────────────────────────────
SELECT TABLE_NAME, TABLE_ROWS, ENGINE, TABLE_COLLATION
  FROM information_schema.TABLES
 WHERE TABLE_SCHEMA = DATABASE()
   AND TABLE_NAME IN ('spare_parts', 'purchase_orders', 'purchase_order_items')
 ORDER BY TABLE_NAME;

SELECT TABLE_NAME, INDEX_NAME,
       GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS columns
  FROM information_schema.STATISTICS
 WHERE TABLE_SCHEMA = DATABASE()
   AND TABLE_NAME IN ('spare_parts', 'purchase_orders', 'purchase_order_items')
 GROUP BY TABLE_NAME, INDEX_NAME
 ORDER BY TABLE_NAME, INDEX_NAME;

SELECT '✓ Migration 501 complete — Phase 13 procurement tables ready' AS result;
