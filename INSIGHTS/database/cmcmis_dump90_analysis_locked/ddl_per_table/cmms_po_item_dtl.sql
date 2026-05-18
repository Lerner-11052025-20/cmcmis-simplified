-- CMCMIS dump90tables schema-only extraction
-- Source: dump90tables.sql inside dump90tables.zip
-- Extracted: 2026-05-18 15:10:22
-- Source SHA256: dd57e353524636a960f04c0fcd658fb8428ecd6e88e653e52a399b81381ffc6a
-- Note: data INSERT statements intentionally removed. Review before running in production.

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

CREATE TABLE `cmms_po_item_dtl` (
  `POI_ID` int(11) NOT NULL,
  `POI_SPAREPART_ID` int(11) DEFAULT NULL,
  `POI_ITEM_TYPE` int(11) DEFAULT NULL,
  `POI_ITEM_DESC` varchar(50) DEFAULT NULL,
  `POI_INDENT_QTY` bigint(20) DEFAULT NULL,
  `POI_INDENT_COST` decimal(13,2) DEFAULT NULL,
  `POI_PO_QTY` bigint(20) DEFAULT NULL,
  `POI_PO_COST` decimal(13,2) DEFAULT NULL,
  `POI_SRV_QTY` bigint(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

ALTER TABLE `cmms_po_item_dtl`
  ADD KEY `FK_CMMS_PO_ITEM_DTL_CMMS_DEVICE_SPARES_MST` (`POI_ITEM_TYPE`),
  ADD KEY `FK_CMMS_PO_ITEM_DTL_CMMS_PO_MST` (`POI_ID`);
ALTER TABLE `cmms_po_item_dtl`
  ADD CONSTRAINT `FK_CMMS_PO_ITEM_DTL_CMMS_DEVICE_SPARES_MST` FOREIGN KEY (`POI_ITEM_TYPE`) REFERENCES `cmms_device_spares_mst` (`DS_ID`),
  ADD CONSTRAINT `FK_CMMS_PO_ITEM_DTL_CMMS_PO_MST` FOREIGN KEY (`POI_ID`) REFERENCES `cmms_po_mst` (`PO_ID`);
