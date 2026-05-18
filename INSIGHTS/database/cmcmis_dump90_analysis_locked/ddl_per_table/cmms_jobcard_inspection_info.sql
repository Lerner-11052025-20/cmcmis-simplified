-- CMCMIS dump90tables schema-only extraction
-- Source: dump90tables.sql inside dump90tables.zip
-- Extracted: 2026-05-18 15:10:22
-- Source SHA256: dd57e353524636a960f04c0fcd658fb8428ecd6e88e653e52a399b81381ffc6a
-- Note: data INSERT statements intentionally removed. Review before running in production.

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

CREATE TABLE `cmms_jobcard_inspection_info` (
  `InstrumentID` int(11) DEFAULT NULL,
  `JobcardNumber` varchar(9) NOT NULL,
  `JobStartDate` datetime(6) DEFAULT NULL,
  `JobCompleteDate` datetime(6) DEFAULT NULL,
  `EqRecdStatus` tinyint(3) UNSIGNED DEFAULT NULL,
  `EqNotRecdReason` varchar(500) DEFAULT NULL,
  `WarrantyExpiresOn` datetime(6) DEFAULT NULL,
  `CriticalTestResults` varchar(100) DEFAULT NULL,
  `InspectionResult` varchar(20) DEFAULT NULL,
  `RejectionReasons` varchar(200) DEFAULT NULL,
  `FaultDescription` varchar(200) DEFAULT NULL,
  `ActionTakenBySupplier` varchar(100) DEFAULT NULL,
  `AccRejInfoGivenTo` varchar(35) DEFAULT NULL,
  `AccRejInfoGivenDate` datetime(6) DEFAULT NULL,
  `IntimationOn` datetime(6) DEFAULT NULL,
  `FinalStatus` tinyint(3) UNSIGNED DEFAULT NULL,
  `FinalStatusDate` datetime(6) DEFAULT NULL,
  `Remarks` longtext DEFAULT NULL,
  `FirstVisitOn` datetime(6) DEFAULT NULL,
  `EquipmentRecdOn` datetime(6) DEFAULT NULL,
  `upsize_ts` binary(8) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

ALTER TABLE `cmms_jobcard_inspection_info`
  ADD PRIMARY KEY (`JobcardNumber`);
ALTER TABLE `cmms_jobcard_inspection_info`
  ADD CONSTRAINT `FK_CMMS_JOBCARD_INSPECTION_INFO_CMMS_JOBCARD_MST` FOREIGN KEY (`JobcardNumber`) REFERENCES `cmms_jobcard_mst` (`JM_SectionJobNo`);
