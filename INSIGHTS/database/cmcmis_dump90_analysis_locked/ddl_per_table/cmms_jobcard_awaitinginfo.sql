-- CMCMIS dump90tables schema-only extraction
-- Source: dump90tables.sql inside dump90tables.zip
-- Extracted: 2026-05-18 15:10:22
-- Source SHA256: dd57e353524636a960f04c0fcd658fb8428ecd6e88e653e52a399b81381ffc6a
-- Note: data INSERT statements intentionally removed. Review before running in production.

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

CREATE TABLE `cmms_jobcard_awaitinginfo` (
  `JobcardNumber` varchar(9) NOT NULL,
  `AwaitingFromDate` datetime(6) DEFAULT NULL,
  `AwaitingFor` varchar(50) DEFAULT NULL,
  `JobStartDate` datetime(6) DEFAULT NULL,
  `AwaitingClearDate` datetime(6) DEFAULT NULL,
  `RepairStatus` varchar(50) DEFAULT NULL,
  `ServiceEngr` tinyint(1) NOT NULL,
  `Operator` tinyint(1) NOT NULL,
  `Apprentice` tinyint(1) NOT NULL,
  `AttendedBy` varchar(50) DEFAULT NULL,
  `IndentNo` varchar(50) DEFAULT NULL,
  `IndentDate` datetime(6) DEFAULT NULL,
  `PurchaseOrderNo` varchar(50) DEFAULT NULL,
  `PurchaseOrderDate` datetime(6) DEFAULT NULL,
  `PurchaseCostinRs` decimal(13,2) DEFAULT NULL,
  `Supplier` varchar(50) DEFAULT NULL,
  `SRVNo` varchar(50) DEFAULT NULL,
  `SRVDate` datetime(6) DEFAULT NULL,
  `SupplierId` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

ALTER TABLE `cmms_jobcard_awaitinginfo`
  ADD PRIMARY KEY (`JobcardNumber`);
ALTER TABLE `cmms_jobcard_awaitinginfo`
  ADD CONSTRAINT `FK_CMMS_JOBCARD_AWAITINGINFO_CMMS_JOBCARD_MST` FOREIGN KEY (`JobcardNumber`) REFERENCES `cmms_jobcard_mst` (`JM_SectionJobNo`);
