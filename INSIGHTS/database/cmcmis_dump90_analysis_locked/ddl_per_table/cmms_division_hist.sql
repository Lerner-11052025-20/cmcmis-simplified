-- CMCMIS dump90tables schema-only extraction
-- Source: dump90tables.sql inside dump90tables.zip
-- Extracted: 2026-05-18 15:10:22
-- Source SHA256: dd57e353524636a960f04c0fcd658fb8428ecd6e88e653e52a399b81381ffc6a
-- Note: data INSERT statements intentionally removed. Review before running in production.

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

CREATE TABLE `cmms_division_hist` (
  `EQD_EQM_TYPE` varchar(15) NOT NULL,
  `EQD_EQM_ID` int(11) NOT NULL,
  `EQD_DIVID` int(11) NOT NULL,
  `EQD_DIV_DATE` datetime(6) NOT NULL,
  `EQD_STATUS` varchar(50) NOT NULL,
  `EQD_STATUS_DATE` datetime(6) NOT NULL,
  `EQM_DIV_UPD_REASON` longtext DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

ALTER TABLE `cmms_division_hist`
  ADD KEY `FK_CMMS_DIVISION_HIST_CMMS_EQIP_MST` (`EQD_EQM_TYPE`,`EQD_EQM_ID`);
ALTER TABLE `cmms_division_hist`
  ADD CONSTRAINT `FK_CMMS_DIVISION_HIST_CMMS_EQIP_MST` FOREIGN KEY (`EQD_EQM_TYPE`,`EQD_EQM_ID`) REFERENCES `cmms_eqip_mst` (`EQM_TYPE`, `EQM_ID`);
