-- CMCMIS dump90tables schema-only extraction
-- Source: dump90tables.sql inside dump90tables.zip
-- Extracted: 2026-05-18 15:10:22
-- Source SHA256: dd57e353524636a960f04c0fcd658fb8428ecd6e88e653e52a399b81381ffc6a
-- Note: data INSERT statements intentionally removed. Review before running in production.

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

CREATE TABLE `roles` (
  `role_id` tinyint(3) UNSIGNED NOT NULL COMMENT 'Hard-coded 1..5 for deterministic seeds',
  `role_code` varchar(30) NOT NULL COMMENT 'SUPER_ADMIN | LAB_IN_CHARGE | LAB_ENGINEER | NORMAL_USER | VIEW_ONLY',
  `role_name` varchar(60) NOT NULL,
  `role_description` varchar(255) DEFAULT NULL,
  `is_system` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci COMMENT='Cluster 1: 5 system roles';

ALTER TABLE `roles`
  ADD PRIMARY KEY (`role_id`),
  ADD UNIQUE KEY `uk_roles_code` (`role_code`);
