-- CMCMIS dump90tables schema-only extraction
-- Source: dump90tables.sql inside dump90tables.zip
-- Extracted: 2026-05-18 15:10:22
-- Source SHA256: dd57e353524636a960f04c0fcd658fb8428ecd6e88e653e52a399b81381ffc6a
-- Note: data INSERT statements intentionally removed. Review before running in production.

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

CREATE TABLE `cmms_schedule_eqip_dtl` (
  `SC_PLAN_ID` int(11) NOT NULL,
  `SC_TYPE` varchar(3) NOT NULL,
  `SC_EQM_ID` int(11) NOT NULL,
  `SC_EQM_TYPE` varchar(15) NOT NULL,
  `SC_SCHEDULE_DATE` datetime(6) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

ALTER TABLE `cmms_schedule_eqip_dtl`
  ADD PRIMARY KEY (`SC_PLAN_ID`,`SC_TYPE`,`SC_EQM_ID`,`SC_EQM_TYPE`,`SC_SCHEDULE_DATE`),
  ADD KEY `FK_CMMS_SCHEDULE_EQIP_DTL_CMMS_EQIP_MST` (`SC_EQM_TYPE`,`SC_EQM_ID`);
ALTER TABLE `cmms_schedule_eqip_dtl`
  ADD CONSTRAINT `FK_CMMS_SCHEDULE_EQIP_DTL_CMMS_EQIP_MST` FOREIGN KEY (`SC_EQM_TYPE`,`SC_EQM_ID`) REFERENCES `cmms_eqip_mst` (`EQM_TYPE`, `EQM_ID`),
  ADD CONSTRAINT `FK_CMMS_SCHEDULE_EQIP_DTL_CMMS_SCHEDULE_MST` FOREIGN KEY (`SC_PLAN_ID`,`SC_TYPE`) REFERENCES `cmms_schedule_mst` (`SC_PLAN_ID`, `SC_TYPE`);
