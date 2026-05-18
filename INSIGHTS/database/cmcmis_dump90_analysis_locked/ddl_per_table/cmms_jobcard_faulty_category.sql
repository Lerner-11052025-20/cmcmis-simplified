-- CMCMIS dump90tables schema-only extraction
-- Source: dump90tables.sql inside dump90tables.zip
-- Extracted: 2026-05-18 15:10:22
-- Source SHA256: dd57e353524636a960f04c0fcd658fb8428ecd6e88e653e52a399b81381ffc6a
-- Note: data INSERT statements intentionally removed. Review before running in production.

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

CREATE TABLE `cmms_jobcard_faulty_category` (
  `JobcardNumber` varchar(9) NOT NULL,
  `FaultyType` varchar(50) NOT NULL,
  `FaultyCategory` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

ALTER TABLE `cmms_jobcard_faulty_category`
  ADD PRIMARY KEY (`JobcardNumber`,`FaultyType`,`FaultyCategory`),
  ADD KEY `FK_CMMS_JOBCARD_FAULTY_CATEGORY_CMMS_FAULT_MST` (`FaultyCategory`,`FaultyType`);
ALTER TABLE `cmms_jobcard_faulty_category`
  ADD CONSTRAINT `FK_CMMS_JOBCARD_FAULTY_CATEGORY_CMMS_FAULT_MST` FOREIGN KEY (`FaultyCategory`,`FaultyType`) REFERENCES `cmms_fault_mst` (`FM_FAULT_ID`, `FM_TYPE`),
  ADD CONSTRAINT `FK_CMMS_JOBCARD_FAULTY_CATEGORY_CMMS_JOBCARD_MST` FOREIGN KEY (`JobcardNumber`) REFERENCES `cmms_jobcard_mst` (`JM_SectionJobNo`);
