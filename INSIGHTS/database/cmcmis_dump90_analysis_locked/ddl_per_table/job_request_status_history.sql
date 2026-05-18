-- CMCMIS dump90tables schema-only extraction
-- Source: dump90tables.sql inside dump90tables.zip
-- Extracted: 2026-05-18 15:10:22
-- Source SHA256: dd57e353524636a960f04c0fcd658fb8428ecd6e88e653e52a399b81381ffc6a
-- Note: data INSERT statements intentionally removed. Review before running in production.

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

CREATE TABLE `job_request_status_history` (
  `history_id` bigint(20) UNSIGNED NOT NULL,
  `jr_no` int(11) NOT NULL,
  `from_status` varchar(30) DEFAULT NULL,
  `to_status` varchar(30) NOT NULL,
  `transitioned_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `transitioned_by` varchar(7) NOT NULL,
  `reason` varchar(500) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci COMMENT='Cluster 4: JR state machine transitions';

ALTER TABLE `job_request_status_history`
  ADD PRIMARY KEY (`history_id`),
  ADD KEY `fk_jrsh_actor` (`transitioned_by`),
  ADD KEY `idx_jrsh_jr_time` (`jr_no`,`transitioned_at`),
  ADD KEY `idx_jrsh_time` (`transitioned_at`);
ALTER TABLE `job_request_status_history`
  MODIFY `history_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;
ALTER TABLE `job_request_status_history`
  ADD CONSTRAINT `fk_jrsh_actor` FOREIGN KEY (`transitioned_by`) REFERENCES `cmms_emp_mst` (`EMM_ID`),
  ADD CONSTRAINT `fk_jrsh_jr` FOREIGN KEY (`jr_no`) REFERENCES `cmms_jobrequest_mst` (`JR_JOBREQUESTNO`);
