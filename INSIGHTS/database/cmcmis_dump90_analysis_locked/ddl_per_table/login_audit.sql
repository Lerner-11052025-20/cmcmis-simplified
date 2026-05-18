-- CMCMIS dump90tables schema-only extraction
-- Source: dump90tables.sql inside dump90tables.zip
-- Extracted: 2026-05-18 15:10:22
-- Source SHA256: dd57e353524636a960f04c0fcd658fb8428ecd6e88e653e52a399b81381ffc6a
-- Note: data INSERT statements intentionally removed. Review before running in production.

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

CREATE TABLE `login_audit` (
  `audit_id` bigint(20) UNSIGNED NOT NULL,
  `employee_id` varchar(7) NOT NULL COMMENT 'What user typed; may not exist',
  `attempt_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `outcome` enum('SUCCESS','FAILED_BAD_PASSWORD','FAILED_USER_LOCKED','FAILED_USER_INACTIVE','FAILED_NOT_FOUND','FAILED_INVALID_FORMAT','LOGOUT','TOKEN_REFRESH') NOT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` varchar(500) DEFAULT NULL,
  `notes` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci COMMENT='Cluster 1: every login attempt logged (BR-AUTH-06)';

ALTER TABLE `login_audit`
  ADD PRIMARY KEY (`audit_id`),
  ADD KEY `idx_la_emp_time` (`employee_id`,`attempt_at`),
  ADD KEY `idx_la_time` (`attempt_at`),
  ADD KEY `idx_la_outcome` (`outcome`,`attempt_at`);
ALTER TABLE `login_audit`
  MODIFY `audit_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=58;
