-- CMCMIS dump90tables schema-only extraction
-- Source: dump90tables.sql inside dump90tables.zip
-- Extracted: 2026-05-18 15:10:22
-- Source SHA256: dd57e353524636a960f04c0fcd658fb8428ecd6e88e653e52a399b81381ffc6a
-- Note: data INSERT statements intentionally removed. Review before running in production.

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

CREATE TABLE `cmms_eqipinst_identification` (
  `EMD_EQIP_TYPE` varchar(15) NOT NULL,
  `EQM_ID` int(11) NOT NULL,
  `EII_ID` int(11) NOT NULL,
  `EII_TYPE` varchar(50) NOT NULL,
  `EII_NAME` varchar(50) NOT NULL,
  `EII_MODELNO` varchar(50) NOT NULL,
  `EII_SRNO` varchar(50) NOT NULL,
  `EII_INUSE` tinyint(1) NOT NULL,
  `EII_CALREQ` tinyint(1) NOT NULL,
  `EII_REMARKS` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

ALTER TABLE `cmms_eqipinst_identification`
  ADD PRIMARY KEY (`EMD_EQIP_TYPE`,`EQM_ID`,`EII_ID`);
ALTER TABLE `cmms_eqipinst_identification`
  ADD CONSTRAINT `FK_CMMS_EQIPINST_IDENTIFICATION_CMMS_EQIP_MST` FOREIGN KEY (`EMD_EQIP_TYPE`,`EQM_ID`) REFERENCES `cmms_eqip_mst` (`EQM_TYPE`, `EQM_ID`);
