-- CMCMIS dump90tables schema-only extraction
-- Source: dump90tables.sql inside dump90tables.zip
-- Extracted: 2026-05-18 15:10:22
-- Source SHA256: dd57e353524636a960f04c0fcd658fb8428ecd6e88e653e52a399b81381ffc6a
-- Note: data INSERT statements intentionally removed. Review before running in production.

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

CREATE TABLE `users` (
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `employee_id` varchar(7) NOT NULL COMMENT 'Matches cmms_emp_mst.EMM_ID',
  `password_hash` varchar(60) NOT NULL COMMENT 'bcrypt(employee_id) at seed; bcrypt(new_pwd) if Super Admin resets',
  `section_id` int(10) UNSIGNED DEFAULT NULL COMMENT 'FK → sections.section_id; NULL allowed for unassigned',
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `is_locked` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Auto-set TRUE after N failed logins; only Super Admin unlocks',
  `failed_login_count` smallint(5) UNSIGNED NOT NULL DEFAULT 0,
  `last_login_at` datetime(6) DEFAULT NULL,
  `last_login_ip` varchar(45) DEFAULT NULL COMMENT 'IPv6-ready',
  `password_hash_set_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `created_by` varchar(20) DEFAULT NULL,
  `updated_at` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  `updated_by` varchar(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci COMMENT='Cluster 1: auth identity (one row per loginable user)';

ALTER TABLE `users`
  ADD PRIMARY KEY (`user_id`),
  ADD UNIQUE KEY `uk_users_employee_id` (`employee_id`),
  ADD KEY `idx_users_active` (`is_active`,`is_locked`),
  ADD KEY `idx_users_section` (`section_id`),
  ADD KEY `idx_users_created_at` (`created_at`);
ALTER TABLE `users`
  MODIFY `user_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=61;
ALTER TABLE `users`
  ADD CONSTRAINT `fk_users_employee` FOREIGN KEY (`employee_id`) REFERENCES `cmms_emp_mst` (`EMM_ID`),
  ADD CONSTRAINT `fk_users_section` FOREIGN KEY (`section_id`) REFERENCES `sections` (`section_id`);
