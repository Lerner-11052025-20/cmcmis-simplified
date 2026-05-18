-- CMCMIS dump90tables schema-only extraction
-- Source: dump90tables.sql inside dump90tables.zip
-- Extracted: 2026-05-18 15:10:22
-- Source SHA256: dd57e353524636a960f04c0fcd658fb8428ecd6e88e653e52a399b81381ffc6a
-- Note: data INSERT statements intentionally removed. Review before running in production.

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

CREATE TABLE `cmms_jobcard_contract_warranty_dtl` (
  `CWD_JobCardNo` varchar(9) NOT NULL,
  `CWD_VendorSupplierName` varchar(50) DEFAULT NULL,
  `CWD_Intimation_SentOn` datetime(6) DEFAULT NULL,
  `CWD_GatePassNo` varchar(50) DEFAULT NULL,
  `CWD_GatePassIssuedOn` datetime(6) DEFAULT NULL,
  `CWD_GatePassIssuedBy` varchar(50) DEFAULT NULL,
  `CWD_StoreRefNo` varchar(50) DEFAULT NULL,
  `CWD_SentToStoreOn` datetime(6) DEFAULT NULL,
  `CWD_SentToVenderOn` datetime(6) DEFAULT NULL,
  `CWD_RecdFromVenderOn` datetime(6) DEFAULT NULL,
  `CWD_Cost` decimal(13,2) DEFAULT NULL,
  `CWD_LabourCharges` decimal(13,2) DEFAULT NULL,
  `CWD_TransCharges` decimal(13,2) DEFAULT NULL,
  `CWD_InvoiceNo` varchar(50) DEFAULT NULL,
  `CWD_InvoiceRecdOn` datetime(6) DEFAULT NULL,
  `CWD_InvoiceClearedOn` datetime(6) DEFAULT NULL,
  `CWD_VendorSupplierID` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

ALTER TABLE `cmms_jobcard_contract_warranty_dtl`
  ADD PRIMARY KEY (`CWD_JobCardNo`);
ALTER TABLE `cmms_jobcard_contract_warranty_dtl`
  ADD CONSTRAINT `FK_CMMS_JOBCARD_CONTRACT_WARRANTY_DTL_CMMS_JOBCARD_MST` FOREIGN KEY (`CWD_JobCardNo`) REFERENCES `cmms_jobcard_mst` (`JM_SectionJobNo`);
