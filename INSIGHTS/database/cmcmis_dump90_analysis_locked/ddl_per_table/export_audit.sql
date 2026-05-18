-- CMCMIS dump90tables schema-only extraction
-- Source: dump90tables.sql inside dump90tables.zip
-- Extracted: 2026-05-18 15:10:22
-- Source SHA256: dd57e353524636a960f04c0fcd658fb8428ecd6e88e653e52a399b81381ffc6a
-- Note: data INSERT statements intentionally removed. Review before running in production.

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

CREATE TABLE `export_audit` (
  `export_id` bigint(20) UNSIGNED NOT NULL,
  `actor_employee_id` varchar(7) NOT NULL,
  `export_type` enum('JOB_CARD_PDF','CAL_CERT_PDF','JOB_REQUEST_PDF','EXCEL_EQUIPMENT','EXCEL_JOB_CARDS') NOT NULL,
  `record_ids` text NOT NULL COMMENT 'JSON array or CSV of PK(s) exported',
  `occurred_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `ip_address` varchar(45) DEFAULT NULL,
  `byte_count` int(10) UNSIGNED DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci COMMENT='Cluster 10: PDF/Excel export audit trail';

ALTER TABLE `export_audit`
  ADD PRIMARY KEY (`export_id`),
  ADD KEY `idx_ea_actor` (`actor_employee_id`,`occurred_at`),
  ADD KEY `idx_ea_type` (`export_type`,`occurred_at`),
  ADD KEY `idx_ea_time` (`occurred_at`);
ALTER TABLE `export_audit`
  MODIFY `export_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;
