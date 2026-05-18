-- CMCMIS dump90tables schema-only extraction
-- Source: dump90tables.sql inside dump90tables.zip
-- Extracted: 2026-05-18 15:10:22
-- Source SHA256: dd57e353524636a960f04c0fcd658fb8428ecd6e88e653e52a399b81381ffc6a
-- Note: data INSERT statements intentionally removed. Review before running in production.

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

CREATE TABLE `cmms_jobcard_spares_equip` (
  `JobcardNumber` varchar(9) NOT NULL,
  `Sr_No` int(11) NOT NULL,
  `FaultyDevice` int(11) NOT NULL,
  `Source` varchar(15) DEFAULT NULL,
  `PartNo` varchar(50) DEFAULT NULL,
  `Quantity` int(11) DEFAULT NULL,
  `CostRs` decimal(13,2) DEFAULT NULL,
  `PartName` varchar(100) DEFAULT NULL,
  `FaultyDeviceName` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

ALTER TABLE `cmms_jobcard_spares_equip`
  ADD PRIMARY KEY (`JobcardNumber`,`Sr_No`),
  ADD UNIQUE KEY `IX_CMMS_JOBCARD_SPARES_EQUIP` (`JobcardNumber`,`FaultyDevice`,`PartNo`);
ALTER TABLE `cmms_jobcard_spares_equip`
  ADD CONSTRAINT `FK_CMMS_JOBCARD_SPARES_EQUIP_CMMS_JOBCARD_MST` FOREIGN KEY (`JobcardNumber`) REFERENCES `cmms_jobcard_mst` (`JM_SectionJobNo`);
