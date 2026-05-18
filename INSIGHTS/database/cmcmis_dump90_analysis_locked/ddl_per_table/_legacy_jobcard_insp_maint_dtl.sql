-- CMCMIS dump90tables schema-only extraction
-- Source: dump90tables.sql inside dump90tables.zip
-- Extracted: 2026-05-18 15:10:22
-- Source SHA256: dd57e353524636a960f04c0fcd658fb8428ecd6e88e653e52a399b81381ffc6a
-- Note: data INSERT statements intentionally removed. Review before running in production.

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

CREATE TABLE `_legacy_jobcard_insp_maint_dtl` (
  `JMD_JobCardNo` varchar(9) NOT NULL,
  `JMD_JobStartDate` datetime(6) DEFAULT NULL,
  `JMD_JobCompleteDate` datetime(6) DEFAULT NULL,
  `JMD_AttendedBy` varchar(50) DEFAULT NULL,
  `JMD_EqAccepted` tinyint(1) NOT NULL,
  `JMD_NotAcceptedReason` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

ALTER TABLE `_legacy_jobcard_insp_maint_dtl`
  ADD PRIMARY KEY (`JMD_JobCardNo`);
ALTER TABLE `_legacy_jobcard_insp_maint_dtl`
  ADD CONSTRAINT `FK_CMMS_JOBCARD_INSP_MAINT_DTL_CMMS_JOBCARD_MST` FOREIGN KEY (`JMD_JobCardNo`) REFERENCES `cmms_jobcard_mst` (`JM_SectionJobNo`);
