-- CMCMIS dump90tables schema-only extraction
-- Source: dump90tables.sql inside dump90tables.zip
-- Extracted: 2026-05-18 15:10:22
-- Source SHA256: dd57e353524636a960f04c0fcd658fb8428ecd6e88e653e52a399b81381ffc6a
-- Note: data INSERT statements intentionally removed. Review before running in production.

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

CREATE TABLE `audit_log` (
  `audit_id` bigint(20) UNSIGNED NOT NULL,
  `actor_employee_id` varchar(20) NOT NULL,
  `actor_role_code` varchar(30) DEFAULT NULL,
  `action` varchar(60) NOT NULL,
  `entity_type` varchar(40) NOT NULL,
  `entity_id` varchar(50) NOT NULL,
  `occurred_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` varchar(500) DEFAULT NULL,
  `request_id` varchar(40) DEFAULT NULL,
  `notes` varchar(500) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci COMMENT='Cluster 10: generic write-audit log';

ALTER TABLE `audit_log`
  ADD PRIMARY KEY (`audit_id`),
  ADD KEY `idx_al_entity` (`entity_type`,`entity_id`,`occurred_at`),
  ADD KEY `idx_al_actor` (`actor_employee_id`,`occurred_at`),
  ADD KEY `idx_al_action` (`action`,`occurred_at`),
  ADD KEY `idx_al_time` (`occurred_at`);
ALTER TABLE `audit_log`
  MODIFY `audit_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=21;
