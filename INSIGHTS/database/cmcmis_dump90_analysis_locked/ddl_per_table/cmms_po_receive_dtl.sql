-- CMCMIS dump90tables schema-only extraction
-- Source: dump90tables.sql inside dump90tables.zip
-- Extracted: 2026-05-18 15:10:22
-- Source SHA256: dd57e353524636a960f04c0fcd658fb8428ecd6e88e653e52a399b81381ffc6a
-- Note: data INSERT statements intentionally removed. Review before running in production.

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

CREATE TABLE `cmms_po_receive_dtl` (
  `POR_ID` int(11) NOT NULL,
  `POR_SRVNO` varchar(50) NOT NULL,
  `POR_SRVDATE` datetime(6) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

ALTER TABLE `cmms_po_receive_dtl`
  ADD KEY `FK_CMMS_PO_RECEIVE_DTL_CMMS_PO_MST` (`POR_ID`);
ALTER TABLE `cmms_po_receive_dtl`
  ADD CONSTRAINT `FK_CMMS_PO_RECEIVE_DTL_CMMS_PO_MST` FOREIGN KEY (`POR_ID`) REFERENCES `cmms_po_mst` (`PO_ID`);
