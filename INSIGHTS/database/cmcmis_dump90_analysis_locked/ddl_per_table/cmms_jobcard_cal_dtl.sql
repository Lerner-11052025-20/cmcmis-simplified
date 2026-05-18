-- CMCMIS dump90tables schema-only extraction
-- Source: dump90tables.sql inside dump90tables.zip
-- Extracted: 2026-05-18 15:10:22
-- Source SHA256: dd57e353524636a960f04c0fcd658fb8428ecd6e88e653e52a399b81381ffc6a
-- Note: data INSERT statements intentionally removed. Review before running in production.

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

CREATE TABLE `cmms_jobcard_cal_dtl` (
  `JCD_JobCardNo` varchar(9) NOT NULL,
  `JCD_RecdWith` int(11) DEFAULT NULL,
  `JCD_RecdOn` datetime(6) DEFAULT NULL,
  `JCD_JobStartedOn` datetime(6) DEFAULT NULL,
  `JCD_JobCompletedOn` datetime(6) DEFAULT NULL,
  `JCD_CalDueDate` datetime(6) DEFAULT NULL,
  `JCD_CALRefNo` varchar(50) DEFAULT NULL,
  `JCD_CalBy` varchar(100) DEFAULT NULL,
  `JCD_CALStatus` varchar(50) DEFAULT NULL,
  `JCD_ReasonForNoCAL` varchar(50) DEFAULT NULL,
  `JCD_EQStatusAsRecd` varchar(50) DEFAULT NULL,
  `JCD_Adjustments` varchar(100) DEFAULT NULL,
  `JCD_WorkThruContract` tinyint(1) NOT NULL,
  `JCD_RepairedBy` varchar(50) DEFAULT NULL,
  `JCD_SentToInstLabOn` datetime(6) DEFAULT NULL,
  `JCD_RecdFromInstLabOn` datetime(6) DEFAULT NULL,
  `JCD_Temprature` smallint(6) DEFAULT NULL,
  `JCD_RH` smallint(6) DEFAULT NULL,
  `JCD_RH2` smallint(6) DEFAULT NULL,
  `JCD_TempraturePM` decimal(18,2) DEFAULT NULL,
  `JM_CalProcedureRef` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

ALTER TABLE `cmms_jobcard_cal_dtl`
  ADD PRIMARY KEY (`JCD_JobCardNo`);
ALTER TABLE `cmms_jobcard_cal_dtl`
  ADD CONSTRAINT `FK_CMMS_JOBCARD_CAL_DTL_CMMS_JOBCARD_MST` FOREIGN KEY (`JCD_JobCardNo`) REFERENCES `cmms_jobcard_mst` (`JM_SectionJobNo`);
