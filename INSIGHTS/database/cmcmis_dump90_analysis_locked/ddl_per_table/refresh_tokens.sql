-- CMCMIS dump90tables schema-only extraction
-- Source: dump90tables.sql inside dump90tables.zip
-- Extracted: 2026-05-18 15:10:22
-- Source SHA256: dd57e353524636a960f04c0fcd658fb8428ecd6e88e653e52a399b81381ffc6a
-- Note: data INSERT statements intentionally removed. Review before running in production.

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

CREATE TABLE `refresh_tokens` (
  `token_id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `token_hash` varchar(64) NOT NULL COMMENT 'sha256 hex (64 chars); raw token never persisted',
  `issued_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `expires_at` datetime(6) NOT NULL,
  `revoked_at` datetime(6) DEFAULT NULL,
  `revoked_reason` enum('LOGOUT','ROTATED','ADMIN_REVOKE','PASSWORD_CHANGE','EXPIRY_CLEANUP') DEFAULT NULL,
  `user_agent` varchar(500) DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci COMMENT='Cluster 1: 7-day refresh token store (D17)';

ALTER TABLE `refresh_tokens`
  ADD PRIMARY KEY (`token_id`),
  ADD UNIQUE KEY `uk_rt_hash` (`token_hash`),
  ADD KEY `idx_rt_user_expires` (`user_id`,`expires_at`),
  ADD KEY `idx_rt_expires` (`expires_at`);
ALTER TABLE `refresh_tokens`
  MODIFY `token_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=44;
ALTER TABLE `refresh_tokens`
  ADD CONSTRAINT `fk_rt_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE;
