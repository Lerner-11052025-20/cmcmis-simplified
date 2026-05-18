-- CMCMIS dump90tables schema-only extraction
-- Source: dump90tables.sql inside dump90tables.zip
-- Extracted: 2026-05-18 15:10:22
-- Source SHA256: dd57e353524636a960f04c0fcd658fb8428ecd6e88e653e52a399b81381ffc6a
-- Note: data INSERT statements intentionally removed. Review before running in production.

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

CREATE TABLE `cmms_inv_eqip_dtl` (
  `IVD_PARTNO` int(11) NOT NULL,
  `IVD_EQM_ID` int(11) NOT NULL,
  `IND_EQM_TYPE` varchar(15) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

ALTER TABLE `cmms_inv_eqip_dtl`
  ADD PRIMARY KEY (`IVD_PARTNO`,`IVD_EQM_ID`,`IND_EQM_TYPE`),
  ADD KEY `FK_CMMS_INV_EQIP_DTL_CMMS_EQIP_MST` (`IND_EQM_TYPE`,`IVD_EQM_ID`);
ALTER TABLE `cmms_inv_eqip_dtl`
  ADD CONSTRAINT `FK_CMMS_INV_EQIP_DTL_CMMS_EQIP_MST` FOREIGN KEY (`IND_EQM_TYPE`,`IVD_EQM_ID`) REFERENCES `cmms_eqip_mst` (`EQM_TYPE`, `EQM_ID`),
  ADD CONSTRAINT `FK_CMMS_INV_EQIP_DTL_CMMS_INV_MST` FOREIGN KEY (`IVD_PARTNO`) REFERENCES `cmms_inv_mst` (`INV_PARTNO`);
