-- CMCMIS dump90tables schema-only extraction
-- Source: dump90tables.sql inside dump90tables.zip
-- Extracted: 2026-05-18 15:10:22
-- Source SHA256: dd57e353524636a960f04c0fcd658fb8428ecd6e88e653e52a399b81381ffc6a
-- Note: data INSERT statements intentionally removed. Review before running in production.

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

CREATE TABLE `cmms_jobcard_request_info` (
  `JRI_JobCardNo` varchar(9) NOT NULL,
  `JRI_AfterRepairs` tinyint(1) NOT NULL,
  `JRI_SubmittedByID` varchar(7) DEFAULT NULL,
  `JRI_SubmittedByName` varchar(100) DEFAULT NULL,
  `JRI_ProjectID` varchar(50) DEFAULT NULL,
  `JRI_SubSystem` varchar(50) DEFAULT NULL,
  `JRI_OperationManualReceived` tinyint(1) NOT NULL,
  `JRI_ServiceManualReceived` tinyint(1) NOT NULL,
  `JRI_AccessoryKitReceived` tinyint(1) NOT NULL,
  `JRI_InstallAcceptReject` tinyint(1) NOT NULL,
  `JRI_Designation` varchar(50) DEFAULT NULL,
  `JRI_Division` varchar(50) DEFAULT NULL,
  `JRI_PhoneLab` varchar(50) DEFAULT NULL,
  `JRI_PhoneRoom` varchar(50) DEFAULT NULL,
  `JRI_Complaintandsymptoms` varchar(400) DEFAULT NULL,
  `JRI_RequestFor` varchar(15) DEFAULT NULL,
  `JRI_PONO` varchar(100) DEFAULT NULL,
  `JRI_PODate` datetime(6) DEFAULT NULL,
  `JRI_SRVNO` varchar(100) DEFAULT NULL,
  `JRI_SRVDate` datetime(6) DEFAULT NULL,
  `JRI_BudgetCode` varchar(15) DEFAULT NULL,
  `JRI_EquipCost` decimal(18,2) DEFAULT NULL,
  `JRI_EquipCostCurrency` varchar(100) DEFAULT NULL,
  `JRI_Eqiuip_Warranty_Expiry_Date` smallint(6) DEFAULT NULL,
  `JRI_Working_Status` varchar(20) DEFAULT NULL,
  `JRI_Remarks` varchar(500) DEFAULT NULL,
  `EmailId` varchar(300) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

ALTER TABLE `cmms_jobcard_request_info`
  ADD PRIMARY KEY (`JRI_JobCardNo`);
ALTER TABLE `cmms_jobcard_request_info`
  ADD CONSTRAINT `FK_CMMS_JOBCARD_REQUEST_INFO_CMMS_JOBCARD_MST` FOREIGN KEY (`JRI_JobCardNo`) REFERENCES `cmms_jobcard_mst` (`JM_SectionJobNo`);
