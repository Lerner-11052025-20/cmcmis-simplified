-- CMCMIS dump90tables schema-only extraction
-- Source: dump90tables.sql inside dump90tables.zip
-- Extracted: 2026-05-18 15:10:22
-- Source SHA256: dd57e353524636a960f04c0fcd658fb8428ecd6e88e653e52a399b81381ffc6a
-- Note: data INSERT statements intentionally removed. Review before running in production.

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

CREATE TABLE `cmms_inv_mst` (
  `INV_PARTNO` int(11) NOT NULL,
  `INV_PNAME` varchar(100) NOT NULL,
  `INV_CATEGORYID` int(11) DEFAULT NULL COMMENT 'NA as per new design',
  `INV_PLOC` varchar(50) DEFAULT NULL COMMENT 'NA as per new design',
  `INV_MCODE` int(11) NOT NULL COMMENT 'Mfg Code',
  `INV_MPNO` varchar(50) DEFAULT NULL COMMENT 'Mfg Part No',
  `INV_VCODE` smallint(6) DEFAULT NULL COMMENT 'NA as per new design',
  `INV_INTLSPARESID` int(11) NOT NULL COMMENT 'Spare Type',
  `INV_INTLSPARESNO` varchar(50) DEFAULT NULL COMMENT 'NA as per new desing',
  `INV_LOC` varchar(50) DEFAULT NULL COMMENT 'Location',
  `INV_DESC` varchar(100) DEFAULT NULL COMMENT 'NA as per new design',
  `INV_WHEREUSED` int(11) DEFAULT NULL COMMENT 'NA as per new design',
  `INV_BALQTY` decimal(13,2) DEFAULT NULL COMMENT 'Balance Qty',
  `INV_COST` decimal(13,2) DEFAULT NULL COMMENT 'Cost',
  `INV_ONHND` decimal(13,2) DEFAULT NULL COMMENT 'NA as per new design',
  `INV_USEDQTY` decimal(13,2) DEFAULT NULL COMMENT 'NA as per new design',
  `INV_MINQTY` decimal(8,2) DEFAULT NULL COMMENT 'NA as per new design',
  `INV_ROL` decimal(8,2) DEFAULT NULL COMMENT 'NA as per new design',
  `INV_LEADTIME` bigint(20) DEFAULT NULL COMMENT 'NA as per new design',
  `INV_UOM` varchar(50) DEFAULT NULL COMMENT 'NA as per new design',
  `INV_LASTPO` varchar(50) DEFAULT NULL COMMENT 'Last PO No',
  `INV_LASTPODT` datetime(6) DEFAULT NULL COMMENT 'Last PO Date',
  `INV_LASTCOST` decimal(13,2) DEFAULT NULL COMMENT 'Last PO Cost',
  `INV_QTY_ONORDER` decimal(13,3) DEFAULT NULL COMMENT 'NA as per new design',
  `INV_STATE` tinyint(1) NOT NULL COMMENT 'Inactive',
  `INV_CREATED_BY` varchar(7) NOT NULL,
  `INV_CREATED_ON` datetime(6) NOT NULL,
  `INV_UPDATED_BY` varchar(7) NOT NULL,
  `INV_UPDATED_ON` datetime(6) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

ALTER TABLE `cmms_inv_mst`
  ADD PRIMARY KEY (`INV_PARTNO`),
  ADD KEY `FK_CMMS_INV_MST_CMMS_CONT_MST` (`INV_MCODE`),
  ADD KEY `FK_CMMS_INV_MST_CMMS_DEVICE_SPARES_MST` (`INV_INTLSPARESID`);
ALTER TABLE `cmms_inv_mst`
  ADD CONSTRAINT `FK_CMMS_INV_MST_CMMS_CONT_MST` FOREIGN KEY (`INV_MCODE`) REFERENCES `cmms_cont_mst` (`CMM_CONT_ID`),
  ADD CONSTRAINT `FK_CMMS_INV_MST_CMMS_DEVICE_SPARES_MST` FOREIGN KEY (`INV_INTLSPARESID`) REFERENCES `cmms_device_spares_mst` (`DS_ID`);
