-- CMCMIS dump90tables schema-only extraction
-- Source: dump90tables.sql inside dump90tables.zip
-- Extracted: 2026-05-18 15:10:22
-- Source SHA256: dd57e353524636a960f04c0fcd658fb8428ecd6e88e653e52a399b81381ffc6a
-- Note: data INSERT statements intentionally removed. Review before running in production.

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

CREATE TABLE `cmms_schedule_mst` (
  `SC_PLAN_ID` int(11) NOT NULL,
  `SC_TYPE` varchar(3) NOT NULL,
  `SC_YEAR` varchar(50) NOT NULL,
  `SC_SM_ID` int(11) NOT NULL,
  `SC_CREATED_BY` varchar(7) DEFAULT NULL,
  `SC_CREATED_ON` datetime(6) DEFAULT NULL,
  `SC_UPDATED_BY` varchar(50) DEFAULT NULL,
  `SC_UPDATED_ON` datetime(6) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

ALTER TABLE `cmms_schedule_mst`
  ADD PRIMARY KEY (`SC_PLAN_ID`,`SC_TYPE`),
  ADD KEY `FK_CMMS_SCHEDULE_MST_CMMS_SECTION_MST` (`SC_SM_ID`);
ALTER TABLE `cmms_schedule_mst`
  ADD CONSTRAINT `FK_CMMS_SCHEDULE_MST_CMMS_SECTION_MST` FOREIGN KEY (`SC_SM_ID`) REFERENCES `cmms_section_mst` (`SM_ID`);
