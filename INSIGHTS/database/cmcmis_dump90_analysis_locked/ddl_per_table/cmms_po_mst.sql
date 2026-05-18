-- CMCMIS dump90tables schema-only extraction
-- Source: dump90tables.sql inside dump90tables.zip
-- Extracted: 2026-05-18 15:10:22
-- Source SHA256: dd57e353524636a960f04c0fcd658fb8428ecd6e88e653e52a399b81381ffc6a
-- Note: data INSERT statements intentionally removed. Review before running in production.

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

CREATE TABLE `cmms_po_mst` (
  `PO_TYPE` char(4) DEFAULT NULL,
  `PO_ID` int(11) NOT NULL,
  `PO_LINEITEMCODE` varchar(50) NOT NULL,
  `PO_INDENT_DESC` varchar(50) NOT NULL,
  `PO_INDENT_NO` varchar(50) NOT NULL,
  `PO_INDENT_DATE` datetime(6) NOT NULL,
  `PO_INDENT_COST` decimal(13,2) DEFAULT NULL,
  `PO_VENDORID` int(11) DEFAULT NULL,
  `PO_NO` varchar(50) DEFAULT NULL,
  `PO_DATE` datetime(6) DEFAULT NULL,
  `PO_AMC_STATRTDT` datetime(6) DEFAULT NULL,
  `PO_AMC_ENDDATE` datetime(6) DEFAULT NULL,
  `PO_CREATED_BY` varchar(7) NOT NULL,
  `PO_CREATED_ON` datetime(6) NOT NULL,
  `PO_UPDATED_BY` varchar(7) NOT NULL,
  `PO_UPDATED_DATE` datetime(6) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

ALTER TABLE `cmms_po_mst`
  ADD PRIMARY KEY (`PO_ID`);
