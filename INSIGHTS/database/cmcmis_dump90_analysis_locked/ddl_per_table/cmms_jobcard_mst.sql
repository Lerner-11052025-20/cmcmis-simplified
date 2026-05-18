-- CMCMIS dump90tables schema-only extraction
-- Source: dump90tables.sql inside dump90tables.zip
-- Extracted: 2026-05-18 15:10:22
-- Source SHA256: dd57e353524636a960f04c0fcd658fb8428ecd6e88e653e52a399b81381ffc6a
-- Note: data INSERT statements intentionally removed. Review before running in production.

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

CREATE TABLE `cmms_jobcard_mst` (
  `JM_JobCardNO` int(11) NOT NULL,
  `JM_EQM_TYPE` varchar(15) NOT NULL,
  `JM_EQM_ID` int(11) NOT NULL,
  `JM_FNPETYPE` char(1) DEFAULT NULL,
  `JM_SectionJobNo` varchar(9) NOT NULL,
  `JM_JCRecdDate` datetime(6) NOT NULL,
  `JM_InstRecdDate` datetime(6) NOT NULL,
  `JM_JobStatus` char(2) NOT NULL,
  `JM_Job` varchar(50) DEFAULT NULL COMMENT 'NA as per new design. (Accepted / Rejected)',
  `JM_PlannedStartDate` datetime(6) NOT NULL,
  `JM_PlannedComletedDate` datetime(6) NOT NULL,
  `JM_JobStartDate` datetime(6) DEFAULT NULL,
  `JM_JobEndDate` datetime(6) DEFAULT NULL,
  `JM_WarrantyRepairs` tinyint(1) NOT NULL,
  `JM_ContractRepairs` tinyint(1) NOT NULL,
  `JM_ServiceEngr` tinyint(1) DEFAULT NULL,
  `JM_Operator` tinyint(1) DEFAULT NULL,
  `JM_Apprentice` tinyint(1) DEFAULT NULL,
  `JM_AttendedBy` varchar(50) DEFAULT NULL COMMENT 'NA as per new desing. For this there is new table',
  `JM_EQGivenTo` varchar(50) DEFAULT NULL,
  `JM_EQGivenOn` datetime(6) DEFAULT NULL,
  `JM_Remarks` varchar(550) DEFAULT NULL,
  `JM_CalPMDueDate` datetime(6) DEFAULT NULL,
  `JM_DESC` longtext DEFAULT NULL COMMENT 'NA as per new desing',
  `JM_PLANID` int(11) DEFAULT NULL COMMENT 'NA as per new desing',
  `JM_DUEIN` varchar(50) DEFAULT NULL COMMENT 'NA as per new desing',
  `JM_JOBTYPE` tinyint(3) UNSIGNED NOT NULL DEFAULT 0,
  `JM_REPAIRTYPE` tinyint(3) UNSIGNED DEFAULT NULL,
  `JM_CREATED_BY` varchar(7) NOT NULL,
  `JM_CREATED_ON` datetime(6) NOT NULL,
  `JM_UPDATED_BY` varchar(50) NOT NULL,
  `JM_UPDATED_ON` datetime(6) NOT NULL,
  `JM_COMPLAINTANDSYMPTOMS` varchar(400) DEFAULT NULL,
  `JM_CALTYPE` tinyint(3) UNSIGNED DEFAULT NULL,
  `JM_MVP_STATUS` enum('ASSIGNED','IN_PROGRESS','COMPLETED','VERIFIED_CLOSED','REOPENED') NOT NULL DEFAULT 'ASSIGNED',
  `JM_VERIFIED_BY` varchar(7) DEFAULT NULL,
  `JM_VERIFIED_ON` datetime(6) DEFAULT NULL,
  `JM_REOPENED_REASON` varchar(500) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

ALTER TABLE `cmms_jobcard_mst`
  ADD PRIMARY KEY (`JM_SectionJobNo`),
  ADD KEY `FK_CMMS_JOBCARD_MST_CMMS_EQIP_MST` (`JM_EQM_TYPE`,`JM_EQM_ID`),
  ADD KEY `idx_jc_status` (`JM_MVP_STATUS`),
  ADD KEY `idx_jc_recd_date` (`JM_JCRecdDate`),
  ADD KEY `idx_jc_list_default` (`JM_MVP_STATUS`,`JM_CREATED_ON`,`JM_JobCardNO`),
  ADD KEY `idx_jc_due_date` (`JM_PlannedComletedDate`,`JM_MVP_STATUS`);
ALTER TABLE `cmms_jobcard_mst`
  ADD CONSTRAINT `FK_CMMS_JOBCARD_MST_CMMS_EQIP_MST` FOREIGN KEY (`JM_EQM_TYPE`,`JM_EQM_ID`) REFERENCES `cmms_eqip_mst` (`EQM_TYPE`, `EQM_ID`);
