-- CMCMIS dump90tables schema-only extraction
-- Source: dump90tables.sql inside dump90tables.zip
-- Extracted: 2026-05-18 15:10:22
-- Source SHA256: dd57e353524636a960f04c0fcd658fb8428ecd6e88e653e52a399b81381ffc6a
-- Note: data INSERT statements intentionally removed. Review before running in production.

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

CREATE TABLE `equipment_status_history` (
  `history_id` bigint(20) UNSIGNED NOT NULL,
  `eqm_type` varchar(15) NOT NULL,
  `eqm_id` int(11) NOT NULL,
  `from_status` varchar(30) DEFAULT NULL COMMENT 'NULL on first row (initial PENDING_VERIFICATION)',
  `to_status` varchar(30) NOT NULL,
  `transitioned_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `transitioned_by` varchar(7) NOT NULL,
  `reason` varchar(500) DEFAULT NULL,
  `related_job_card` varchar(9) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci COMMENT='Cluster 3: equipment state machine transitions';

ALTER TABLE `equipment_status_history`
  ADD PRIMARY KEY (`history_id`),
  ADD KEY `fk_esh_jc` (`related_job_card`),
  ADD KEY `idx_esh_eqip_time` (`eqm_type`,`eqm_id`,`transitioned_at`),
  ADD KEY `idx_esh_time` (`transitioned_at`),
  ADD KEY `idx_esh_actor` (`transitioned_by`);
ALTER TABLE `equipment_status_history`
  MODIFY `history_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;
ALTER TABLE `equipment_status_history`
  ADD CONSTRAINT `fk_esh_actor` FOREIGN KEY (`transitioned_by`) REFERENCES `cmms_emp_mst` (`EMM_ID`),
  ADD CONSTRAINT `fk_esh_eqip` FOREIGN KEY (`eqm_type`,`eqm_id`) REFERENCES `cmms_eqip_mst` (`EQM_TYPE`, `EQM_ID`),
  ADD CONSTRAINT `fk_esh_jc` FOREIGN KEY (`related_job_card`) REFERENCES `cmms_jobcard_mst` (`JM_SectionJobNo`);
