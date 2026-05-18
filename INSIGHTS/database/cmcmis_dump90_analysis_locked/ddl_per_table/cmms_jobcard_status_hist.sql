-- CMCMIS dump90tables schema-only extraction
-- Source: dump90tables.sql inside dump90tables.zip
-- Extracted: 2026-05-18 15:10:22
-- Source SHA256: dd57e353524636a960f04c0fcd658fb8428ecd6e88e653e52a399b81381ffc6a
-- Note: data INSERT statements intentionally removed. Review before running in production.

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

CREATE TABLE `cmms_jobcard_status_hist` (
  `JH_SectionJobNo` varchar(9) NOT NULL,
  `JH_FNPETYPE` varchar(1) DEFAULT NULL,
  `JH_JobStatus` varchar(2) NOT NULL,
  `JH_StatusUpdatedOn` datetime(6) NOT NULL,
  `JH_StatusUpdatedBy` varchar(7) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

ALTER TABLE `cmms_jobcard_status_hist`
  ADD KEY `FK_CMMS_JOBCARD_STATUS_HIST_CMMS_JOBCARD_MST` (`JH_SectionJobNo`);
ALTER TABLE `cmms_jobcard_status_hist`
  ADD CONSTRAINT `FK_CMMS_JOBCARD_STATUS_HIST_CMMS_JOBCARD_MST` FOREIGN KEY (`JH_SectionJobNo`) REFERENCES `cmms_jobcard_mst` (`JM_SectionJobNo`);
