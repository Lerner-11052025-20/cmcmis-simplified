-- CMCMIS dump90tables schema-only extraction
-- Source: dump90tables.sql inside dump90tables.zip
-- Extracted: 2026-05-18 15:10:22
-- Source SHA256: dd57e353524636a960f04c0fcd658fb8428ecd6e88e653e52a399b81381ffc6a
-- Note: data INSERT statements intentionally removed. Review before running in production.

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

CREATE TABLE `cmms_jobcard_repair_info` (
  `JobcardNumber` varchar(9) NOT NULL,
  `JobStartdate` datetime(6) DEFAULT NULL,
  `JobEndDate` datetime(6) DEFAULT NULL,
  `RepairResult` varchar(25) DEFAULT NULL,
  `ReasonsForNotRepaired` varchar(50) DEFAULT NULL,
  `FaultDescription` varchar(550) DEFAULT NULL,
  `ActionTaken` varchar(550) DEFAULT NULL,
  `JobcardFromCalLab` tinyint(1) NOT NULL,
  `SentToCALLabOn` datetime(6) DEFAULT NULL,
  `WarrantyRepairs` tinyint(3) UNSIGNED DEFAULT NULL,
  `RepairsThroughContract` tinyint(1) NOT NULL,
  `PrSystemStatus` tinyint(1) DEFAULT NULL,
  `ComplaintAndSymptoms` varchar(200) DEFAULT NULL,
  `SystemCheckedBy` varchar(50) DEFAULT NULL,
  `SystemCheckedOn` datetime(6) DEFAULT NULL,
  `Remarks` varchar(550) DEFAULT NULL,
  `PresentSystemStatus` int(11) DEFAULT NULL,
  `upsize_ts` binary(8) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

ALTER TABLE `cmms_jobcard_repair_info`
  ADD PRIMARY KEY (`JobcardNumber`);
ALTER TABLE `cmms_jobcard_repair_info`
  ADD CONSTRAINT `FK_CMMS_JOBCARD_REPAIR_INFO_CMMS_JOBCARD_MST` FOREIGN KEY (`JobcardNumber`) REFERENCES `cmms_jobcard_mst` (`JM_SectionJobNo`);
