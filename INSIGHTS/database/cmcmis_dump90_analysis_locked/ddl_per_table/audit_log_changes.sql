-- CMCMIS dump90tables schema-only extraction
-- Source: dump90tables.sql inside dump90tables.zip
-- Extracted: 2026-05-18 15:10:22
-- Source SHA256: dd57e353524636a960f04c0fcd658fb8428ecd6e88e653e52a399b81381ffc6a
-- Note: data INSERT statements intentionally removed. Review before running in production.

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

CREATE TABLE `audit_log_changes` (
  `change_id` bigint(20) UNSIGNED NOT NULL,
  `audit_id` bigint(20) UNSIGNED NOT NULL,
  `field_name` varchar(80) NOT NULL,
  `before_value` text DEFAULT NULL,
  `after_value` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci COMMENT='Cluster 10: before/after field diffs';

ALTER TABLE `audit_log_changes`
  ADD PRIMARY KEY (`change_id`),
  ADD KEY `idx_alc_audit` (`audit_id`);
ALTER TABLE `audit_log_changes`
  MODIFY `change_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;
ALTER TABLE `audit_log_changes`
  ADD CONSTRAINT `fk_alc_audit` FOREIGN KEY (`audit_id`) REFERENCES `audit_log` (`audit_id`) ON DELETE CASCADE;
