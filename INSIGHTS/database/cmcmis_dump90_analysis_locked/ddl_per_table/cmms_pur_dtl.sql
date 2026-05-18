-- CMCMIS dump90tables schema-only extraction
-- Source: dump90tables.sql inside dump90tables.zip
-- Extracted: 2026-05-18 15:10:22
-- Source SHA256: dd57e353524636a960f04c0fcd658fb8428ecd6e88e653e52a399b81381ffc6a
-- Note: data INSERT statements intentionally removed. Review before running in production.

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

CREATE TABLE `cmms_pur_dtl` (
  `PUD_NO` varchar(25) NOT NULL,
  `PUD_PARTNO` varchar(7) NOT NULL,
  `PUD_VEN_PARTNO` varchar(10) DEFAULT NULL,
  `PUD_ACC_GL` varchar(10) DEFAULT NULL,
  `PUD_UNIT_COST` decimal(7,2) DEFAULT NULL,
  `PUD_QTY_ORDERED` decimal(8,2) DEFAULT NULL,
  `PUD_QTY_PHYREC` decimal(8,2) DEFAULT NULL,
  `PUD_QTY_PHYRECDT` datetime(6) DEFAULT NULL,
  `PUD_QTY_DUE` decimal(8,2) DEFAULT NULL,
  `PUD_CREATED_BY` mediumint(9) DEFAULT NULL,
  `PUD_CREATED_ON` datetime(6) DEFAULT NULL,
  `PUD_UPDATED_BY` mediumint(9) DEFAULT NULL,
  `PUD_UPDATED_ON` datetime(6) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

ALTER TABLE `cmms_pur_dtl`
  ADD PRIMARY KEY (`PUD_NO`,`PUD_PARTNO`);
ALTER TABLE `cmms_pur_dtl`
  ADD CONSTRAINT `FK_CMMS_PUR_DTL_CMMS_PUR_MST` FOREIGN KEY (`PUD_NO`) REFERENCES `cmms_pur_mst` (`PUM_NO`);
