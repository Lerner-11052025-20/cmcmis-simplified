-- CMCMIS dump90tables schema-only extraction
-- Source: dump90tables.sql inside dump90tables.zip
-- Extracted: 2026-05-18 15:10:22
-- Source SHA256: dd57e353524636a960f04c0fcd658fb8428ecd6e88e653e52a399b81381ffc6a
-- Note: data INSERT statements intentionally removed. Review before running in production.

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

CREATE TABLE `job_request_accessories` (
  `acc_id` bigint(20) UNSIGNED NOT NULL COMMENT 'Phase 6: row id',
  `jr_no` int(11) NOT NULL COMMENT 'FK → cmms_jobrequest_mst.JR_JOBREQUESTNO',
  `accessory_type` varchar(60) NOT NULL COMMENT 'Free-form category (probe, cable, adapter, …)',
  `accessory_name` varchar(120) NOT NULL,
  `serial_no` varchar(120) DEFAULT NULL,
  `position` smallint(5) UNSIGNED NOT NULL DEFAULT 0 COMMENT 'UI ordering — render rows in this order',
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci COMMENT='Phase 6: accessory child rows for a Job Request';

ALTER TABLE `job_request_accessories`
  ADD PRIMARY KEY (`acc_id`),
  ADD KEY `idx_jra_jr_pos` (`jr_no`,`position`);
ALTER TABLE `job_request_accessories`
  MODIFY `acc_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Phase 6: row id', AUTO_INCREMENT=4;
ALTER TABLE `job_request_accessories`
  ADD CONSTRAINT `fk_jra_jr` FOREIGN KEY (`jr_no`) REFERENCES `cmms_jobrequest_mst` (`JR_JOBREQUESTNO`) ON DELETE CASCADE;
