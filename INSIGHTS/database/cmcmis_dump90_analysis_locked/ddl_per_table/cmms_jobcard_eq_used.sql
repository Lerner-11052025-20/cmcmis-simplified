-- CMCMIS dump90tables schema-only extraction
-- Source: dump90tables.sql inside dump90tables.zip
-- Extracted: 2026-05-18 15:10:22
-- Source SHA256: dd57e353524636a960f04c0fcd658fb8428ecd6e88e653e52a399b81381ffc6a
-- Note: data INSERT statements intentionally removed. Review before running in production.

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

CREATE TABLE `cmms_jobcard_eq_used` (
  `JEU_JobCardNo` varchar(9) NOT NULL,
  `JEU_EquipType` varchar(15) NOT NULL,
  `JEU_EquipId` int(11) NOT NULL,
  `JEU_Notes` longtext DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

ALTER TABLE `cmms_jobcard_eq_used`
  ADD PRIMARY KEY (`JEU_JobCardNo`,`JEU_EquipType`,`JEU_EquipId`),
  ADD KEY `FK_CMMS_JOBCARD_EQ_USED_CMMS_EQIP_MST` (`JEU_EquipType`,`JEU_EquipId`);
ALTER TABLE `cmms_jobcard_eq_used`
  ADD CONSTRAINT `FK_CMMS_JOBCARD_EQ_USED_CMMS_EQIP_MST` FOREIGN KEY (`JEU_EquipType`,`JEU_EquipId`) REFERENCES `cmms_eqip_mst` (`EQM_TYPE`, `EQM_ID`),
  ADD CONSTRAINT `FK_CMMS_JOBCARD_EQ_USED_CMMS_JOBCARD_MST` FOREIGN KEY (`JEU_JobCardNo`) REFERENCES `cmms_jobcard_mst` (`JM_SectionJobNo`);
