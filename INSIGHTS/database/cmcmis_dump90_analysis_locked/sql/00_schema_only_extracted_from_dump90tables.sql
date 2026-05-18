-- CMCMIS dump90tables schema-only extraction
-- Source: dump90tables.sql inside dump90tables.zip
-- Extracted: 2026-05-18 15:10:22
-- Source SHA256: dd57e353524636a960f04c0fcd658fb8428ecd6e88e653e52a399b81381ffc6a
-- Note: data INSERT statements intentionally removed. Review before running in production.

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";


-- --------------------------------------------------------
-- Table structure for `audit_log`
-- --------------------------------------------------------
CREATE TABLE `audit_log` (
  `audit_id` bigint(20) UNSIGNED NOT NULL,
  `actor_employee_id` varchar(20) NOT NULL,
  `actor_role_code` varchar(30) DEFAULT NULL,
  `action` varchar(60) NOT NULL,
  `entity_type` varchar(40) NOT NULL,
  `entity_id` varchar(50) NOT NULL,
  `occurred_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` varchar(500) DEFAULT NULL,
  `request_id` varchar(40) DEFAULT NULL,
  `notes` varchar(500) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci COMMENT='Cluster 10: generic write-audit log';


-- --------------------------------------------------------
-- Table structure for `audit_log_changes`
-- --------------------------------------------------------
CREATE TABLE `audit_log_changes` (
  `change_id` bigint(20) UNSIGNED NOT NULL,
  `audit_id` bigint(20) UNSIGNED NOT NULL,
  `field_name` varchar(80) NOT NULL,
  `before_value` text DEFAULT NULL,
  `after_value` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci COMMENT='Cluster 10: before/after field diffs';


-- --------------------------------------------------------
-- Table structure for `cmms_amc_mst`
-- --------------------------------------------------------
CREATE TABLE `cmms_amc_mst` (
  `AMC_ID` int(11) NOT NULL,
  `AMC_DATE` datetime NOT NULL,
  `AMC_VENDERID` int(11) NOT NULL,
  `AMC_BUDGET_ID` varchar(15) DEFAULT NULL,
  `AMC_COST` bigint(20) NOT NULL,
  `AMC_STARTDATE` datetime NOT NULL,
  `AMC_ENDDATE` datetime NOT NULL,
  `CREATED_BY` varchar(7) NOT NULL,
  `CREATED_ON` datetime NOT NULL,
  `UPDATED_BY` bigint(20) DEFAULT NULL,
  `UPDATED_ON` varchar(7) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;


-- --------------------------------------------------------
-- Table structure for `cmms_checklist_hist`
-- --------------------------------------------------------
CREATE TABLE `cmms_checklist_hist` (
  `CHKL_ID` int(11) NOT NULL,
  `CHKL_TYPE` varchar(50) NOT NULL,
  `CHKL_MAKE` int(11) NOT NULL,
  `CHKL_MODEL` varchar(50) NOT NULL,
  `CHKL_STATE` tinyint(1) NOT NULL,
  `CHKL_UPDATED_BY` varchar(7) NOT NULL,
  `CHKL_UPDATED_ON` datetime(6) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;


-- --------------------------------------------------------
-- Table structure for `cmms_checklist_mst`
-- --------------------------------------------------------
CREATE TABLE `cmms_checklist_mst` (
  `CHKL_ID` int(11) NOT NULL,
  `CHKL_TYPE` varchar(50) NOT NULL,
  `CHKL_MAKE` int(11) NOT NULL,
  `CHKL_MODEL` varchar(50) NOT NULL,
  `CHKL_STATE` tinyint(1) NOT NULL,
  `CHKL_CREATED_BY` varchar(7) NOT NULL,
  `CHKL_CREATED_ON` datetime(6) NOT NULL,
  `CHKL_UPDATED_BY` varchar(7) NOT NULL,
  `CHKL_UPDATED_ON` datetime(6) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;


-- --------------------------------------------------------
-- Table structure for `cmms_checklist_tasks`
-- --------------------------------------------------------
CREATE TABLE `cmms_checklist_tasks` (
  `CLTSK_ID` int(11) NOT NULL,
  `CLTSK_TASKID` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;


-- --------------------------------------------------------
-- Table structure for `cmms_checklist_tasks_hist`
-- --------------------------------------------------------
CREATE TABLE `cmms_checklist_tasks_hist` (
  `CLTSK_ID` int(11) NOT NULL,
  `CLTSK_TASKID` int(11) NOT NULL,
  `CLTSK_UPDATED_BY` longtext DEFAULT NULL,
  `CLTSK_UPDATED_ON` datetime(6) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;


-- --------------------------------------------------------
-- Table structure for `cmms_cont_mst`
-- --------------------------------------------------------
CREATE TABLE `cmms_cont_mst` (
  `CMM_CONT_ID` int(11) NOT NULL COMMENT 'Surrogate PK; referenced by 4 legacy tables',
  `CMM_CONT_NAME` varchar(200) NOT NULL,
  `CMM_CONT_TYPE` enum('MFR','VENDOR','BOTH','OEM') NOT NULL DEFAULT 'BOTH',
  `CMM_CONT_CONTACT_PERSON` varchar(150) DEFAULT NULL,
  `CMM_CONT_EMAIL` varchar(150) DEFAULT NULL,
  `CMM_CONT_PHONE` varchar(50) DEFAULT NULL,
  `CMM_CONT_MOBILE` varchar(50) DEFAULT NULL,
  `CMM_CONT_ADDRESS` varchar(500) DEFAULT NULL,
  `CMM_CONT_CITY` varchar(100) DEFAULT NULL,
  `CMM_CONT_STATE` varchar(100) DEFAULT NULL,
  `CMM_CONT_COUNTRY` varchar(100) DEFAULT NULL,
  `CMM_CONT_ZIP` varchar(20) DEFAULT NULL,
  `CMM_CONT_WEBSITE` varchar(255) DEFAULT NULL,
  `CMM_CONT_GSTIN` varchar(20) DEFAULT NULL,
  `CMM_CONT_PAN` varchar(20) DEFAULT NULL,
  `CMM_CONT_NABL` tinyint(1) NOT NULL DEFAULT 0,
  `CMM_CONT_NABL_CERT_NO` varchar(50) DEFAULT NULL,
  `CMM_CONT_REMARKS` varchar(1000) DEFAULT NULL,
  `CMM_CONT_STATE_FLAG` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'is_active — kept naming style of legacy tables',
  `CMM_CONT_CREATED_BY` varchar(20) NOT NULL,
  `CMM_CONT_CREATED_ON` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `CMM_CONT_UPDATED_BY` varchar(20) NOT NULL,
  `CMM_CONT_UPDATED_ON` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci COMMENT='Cluster 3: vendor/manufacturer master (was missing from legacy dump)';


-- --------------------------------------------------------
-- Table structure for `cmms_designation_mst`
-- --------------------------------------------------------
CREATE TABLE `cmms_designation_mst` (
  `DG_ID` int(11) NOT NULL,
  `DG_NAME` varchar(150) NOT NULL,
  `DG_DESCRIPTION` longtext DEFAULT NULL,
  `DG_STATE` tinyint(1) NOT NULL,
  `DG_CREATED_BY` varchar(7) NOT NULL,
  `DG_CREATED_ON` datetime(6) NOT NULL,
  `DG_UPDATED_BY` varchar(7) NOT NULL,
  `DG_UPDATED_ON` datetime(6) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;


-- --------------------------------------------------------
-- Table structure for `cmms_desig_hist`
-- --------------------------------------------------------
CREATE TABLE `cmms_desig_hist` (
  `EMM_ID` varchar(7) NOT NULL,
  `EMM_DESIGNATION` varchar(200) NOT NULL,
  `EMM_DATE` datetime(6) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;


-- --------------------------------------------------------
-- Table structure for `cmms_device_spares_mst`
-- --------------------------------------------------------
CREATE TABLE `cmms_device_spares_mst` (
  `DS_TYPE` char(1) NOT NULL COMMENT 'S- Spare / D - Device',
  `DS_ID` int(11) NOT NULL,
  `DS_NAME` varchar(50) NOT NULL,
  `DS_STATE` tinyint(1) NOT NULL,
  `DS_CREATED_BY` varchar(7) NOT NULL,
  `DS_CREATED_ON` datetime(6) NOT NULL,
  `DS_UPDATED_BY` varchar(7) NOT NULL,
  `DS_UPDATED_ON` datetime(6) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;


-- --------------------------------------------------------
-- Table structure for `cmms_division_hist`
-- --------------------------------------------------------
CREATE TABLE `cmms_division_hist` (
  `EQD_EQM_TYPE` varchar(15) NOT NULL,
  `EQD_EQM_ID` int(11) NOT NULL,
  `EQD_DIVID` int(11) NOT NULL,
  `EQD_DIV_DATE` datetime(6) NOT NULL,
  `EQD_STATUS` varchar(50) NOT NULL,
  `EQD_STATUS_DATE` datetime(6) NOT NULL,
  `EQM_DIV_UPD_REASON` longtext DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;


-- --------------------------------------------------------
-- Table structure for `cmms_documentno_mst`
-- --------------------------------------------------------
CREATE TABLE `cmms_documentno_mst` (
  `DocumentType` varchar(20) NOT NULL,
  `Description` varchar(50) NOT NULL,
  `DocumentYear` int(11) NOT NULL,
  `CurrentNo` int(11) NOT NULL,
  `MaximumNo` int(11) DEFAULT NULL,
  `SequenceNo` smallint(6) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;


-- --------------------------------------------------------
-- Table structure for `cmms_emp_mst`
-- --------------------------------------------------------
CREATE TABLE `cmms_emp_mst` (
  `EMM_ID` varchar(7) NOT NULL,
  `EMM_NAME` varchar(100) NOT NULL,
  `EMM_DESIGNATION` varchar(200) NOT NULL,
  `EMM_DESIGDATE` datetime(6) DEFAULT NULL,
  `EMM_DEPT` int(11) NOT NULL,
  `EMM_DEPTDATE` datetime(6) DEFAULT NULL,
  `EMM_DOB` datetime(6) DEFAULT NULL,
  `EMM_DOJ` datetime(6) DEFAULT NULL,
  `EMM_BLOODGRP` varchar(50) DEFAULT NULL,
  `EMM_ADD` varchar(200) DEFAULT NULL,
  `EMM_CITY` varchar(100) DEFAULT NULL,
  `EMM_STATE` varchar(100) DEFAULT NULL,
  `EMM_ZIP` varchar(100) DEFAULT NULL,
  `EMM_PH1` varchar(100) DEFAULT NULL,
  `EMM_PH2` varchar(100) DEFAULT NULL,
  `EMM_FAX` varchar(100) DEFAULT NULL COMMENT 'NA as per new desing',
  `EMM_EMAIL` varchar(100) DEFAULT NULL,
  `EMM_MOBILE` varchar(100) DEFAULT NULL,
  `EMM_PAGER` varchar(100) DEFAULT NULL COMMENT 'NA as per new desing',
  `EMM_STARTDT` datetime(6) DEFAULT NULL COMMENT 'NA as per new desing',
  `EMM_APP_LVL` bigint(20) DEFAULT NULL COMMENT 'NA as per new desing',
  `EMM_MAX_PURCHASE` decimal(10,2) DEFAULT NULL,
  `EMM_REMARKS` varchar(500) DEFAULT NULL,
  `EMM_CREATED_BY` varchar(7) NOT NULL,
  `EMM_CREATED_ON` datetime(6) NOT NULL,
  `EMM_UPDATED_BY` varchar(7) NOT NULL,
  `EMM_UPDATED_ON` datetime(6) NOT NULL,
  `EMM_RESIPH` varchar(50) DEFAULT NULL COMMENT 'NA as per new desing',
  `EMM_ROLE` int(11) DEFAULT NULL,
  `EMM_INACTIVE` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;


-- --------------------------------------------------------
-- Table structure for `cmms_eqipinst_identification`
-- --------------------------------------------------------
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


-- --------------------------------------------------------
-- Table structure for `cmms_eqip_detail_spec`
-- --------------------------------------------------------
CREATE TABLE `cmms_eqip_detail_spec` (
  `EDS_EQIP_TYPE` varchar(15) NOT NULL,
  `EDS_EQIP_ID` int(11) NOT NULL,
  `EDS_FILENAME` varchar(255) NOT NULL,
  `EDS_IMAGE` longblob DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;


-- --------------------------------------------------------
-- Table structure for `cmms_eqip_mst`
-- --------------------------------------------------------
CREATE TABLE `cmms_eqip_mst` (
  `EQM_TYPE` varchar(15) NOT NULL,
  `EQM_ID` int(11) NOT NULL,
  `EQM_NAME` varchar(100) NOT NULL,
  `EQM_DIVID` int(11) NOT NULL,
  `EQM_PM_FREQ` varchar(2) DEFAULT NULL,
  `EQM_PMCHKLSTNO` int(11) DEFAULT NULL,
  `EQM_CAL_FREQ` varchar(2) DEFAULT NULL COMMENT 'This is changed from smallint to Varchar(2) due to parameter table has varchar',
  `EQM_CALCHKLSTNO` int(11) DEFAULT NULL,
  `EQM_CALSOURCE` varchar(50) DEFAULT NULL COMMENT 'NA as per new desing',
  `EQM_INST_TYPE` int(11) DEFAULT NULL,
  `EQM_TMPLTID` varchar(50) DEFAULT NULL COMMENT 'NA as per new desing',
  `EQM_MFRID` int(11) NOT NULL,
  `EQM_MFG_MODEL_NAME` varchar(100) DEFAULT NULL,
  `EQM_VENID` varchar(50) DEFAULT NULL COMMENT 'NA as per new design',
  `EQM_SRNO` varchar(50) DEFAULT NULL,
  `EQM_MODELNO` varchar(50) DEFAULT NULL,
  `EQM_OPTIONNDESC` varchar(250) DEFAULT NULL,
  `EQM_ASSETNO` varchar(50) DEFAULT NULL,
  `EQM_SRVNO` varchar(50) DEFAULT NULL,
  `EQM_SRVDATE` datetime(6) DEFAULT NULL,
  `EQM_PONO` varchar(50) DEFAULT NULL,
  `EQM_PODATE` datetime(6) DEFAULT NULL,
  `EQM_BUDGETCODE` varchar(50) DEFAULT NULL,
  `EQM_EQIPCOST` decimal(18,2) DEFAULT NULL,
  `EQM_COSTCURRENCY` varchar(50) DEFAULT NULL,
  `EQM_WRNTY_EXPIRY_DATE` datetime(6) DEFAULT NULL,
  `EQM_INSTALL_DATE` datetime(6) DEFAULT NULL,
  `EQM_DIV_ABBR` varchar(50) DEFAULT NULL COMMENT 'Division Short Name',
  `EQM_DIV_UPD_DATE` datetime(6) DEFAULT NULL,
  `EQM_DIV_STATUS` varchar(50) DEFAULT NULL,
  `EQM_STATUS_UPD_DATE` datetime(6) DEFAULT NULL,
  `EQM_EndOfSupportDate` datetime(6) DEFAULT NULL,
  `EQM_REMARKS` varchar(500) DEFAULT NULL,
  `EQM_CREATED_BY` varchar(7) DEFAULT NULL,
  `EQM_REGISTRATION_FLAG` tinyint(1) DEFAULT NULL,
  `EQM_STANDARD` tinyint(1) DEFAULT NULL,
  `EQM_CAL_DUE_DATE` datetime(6) DEFAULT NULL,
  `EQM_PM_DUE_DATE` datetime(6) DEFAULT NULL,
  `EQM_CREATED_ON` datetime(6) DEFAULT NULL,
  `EQM_UPDATED_BY` varchar(7) DEFAULT NULL,
  `EQM_UPDATED_ON` datetime(6) DEFAULT NULL,
  `EQM_BUDGETAMT` decimal(19,4) DEFAULT NULL COMMENT 'NA as per new design',
  `EQM_CAL_NABL_TYPE` tinyint(1) DEFAULT NULL,
  `EQM_CAL_NORMAL_TYPE` tinyint(1) DEFAULT NULL,
  `EQM_CAL_AT` varchar(50) DEFAULT NULL,
  `EQM_DIV_UPD_REASON` longtext DEFAULT NULL,
  `EQM_IICHKLSTNO` int(11) DEFAULT NULL,
  `EQM_VERIFIED_BY` varchar(7) DEFAULT NULL,
  `EQM_VERIFIED_ON` datetime(6) DEFAULT NULL,
  `EQM_MVP_STATUS` enum('PENDING_VERIFICATION','ACTIVE','UNDER_CALIBRATION','UNDER_REPAIR','OUT_OF_TOLERANCE','QUARANTINED','CONDEMNED','RETIRED') NOT NULL DEFAULT 'PENDING_VERIFICATION',
  `EQM_MVP_STATUS_AT` datetime(6) DEFAULT NULL,
  `EQM_SECTION_ID` int(10) UNSIGNED DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;


-- --------------------------------------------------------
-- Table structure for `cmms_eqip_mst_hist`
-- --------------------------------------------------------
CREATE TABLE `cmms_eqip_mst_hist` (
  `EQM_HIST_ID` int(11) NOT NULL,
  `EQM_TYPE` varchar(15) NOT NULL,
  `EQM_ID` int(11) NOT NULL,
  `EQM_NAME` varchar(100) NOT NULL,
  `EQM_DIVID` int(11) NOT NULL,
  `EQM_PM_FREQ` varchar(2) DEFAULT NULL,
  `EQM_PMCHKLSTNO` int(11) DEFAULT NULL,
  `EQM_CAL_FREQ` varchar(2) DEFAULT NULL,
  `EQM_CALCHKLSTNO` int(11) DEFAULT NULL,
  `EQM_CALSOURCE` varchar(50) DEFAULT NULL,
  `EQM_INST_TYPE` int(11) DEFAULT NULL,
  `EQM_TMPLTID` varchar(50) DEFAULT NULL,
  `EQM_MFRID` int(11) NOT NULL,
  `EQM_MFG_MODEL_NAME` varchar(100) DEFAULT NULL,
  `EQM_VENID` varchar(50) DEFAULT NULL,
  `EQM_SRNO` varchar(50) DEFAULT NULL,
  `EQM_MODELNO` varchar(50) DEFAULT NULL,
  `EQM_OPTIONNDESC` varchar(250) DEFAULT NULL,
  `EQM_ASSETNO` varchar(50) DEFAULT NULL,
  `EQM_SRVNO` varchar(50) DEFAULT NULL,
  `EQM_SRVDATE` datetime(6) DEFAULT NULL,
  `EQM_PONO` varchar(50) DEFAULT NULL,
  `EQM_PODATE` datetime(6) DEFAULT NULL,
  `EQM_BUDGETCODE` varchar(50) DEFAULT NULL,
  `EQM_EQIPCOST` decimal(18,2) DEFAULT NULL,
  `EQM_COSTCURRENCY` varchar(50) DEFAULT NULL,
  `EQM_WRNTY_EXPIRY_DATE` datetime(6) DEFAULT NULL,
  `EQM_INSTALL_DATE` datetime(6) DEFAULT NULL,
  `EQM_DIV_ABBR` varchar(50) DEFAULT NULL,
  `EQM_DIV_UPD_DATE` datetime(6) DEFAULT NULL,
  `EQM_DIV_STATUS` varchar(50) DEFAULT NULL,
  `EQM_STATUS_UPD_DATE` datetime(6) DEFAULT NULL,
  `EQM_EndOfSupportDate` datetime(6) DEFAULT NULL,
  `EQM_REMARKS` varchar(500) DEFAULT NULL,
  `EQM_CREATED_BY` varchar(7) DEFAULT NULL,
  `EQM_REGISTRATION_FLAG` tinyint(1) DEFAULT NULL,
  `EQM_STANDARD` tinyint(1) DEFAULT NULL,
  `EQM_CAL_DUE_DATE` datetime(6) DEFAULT NULL,
  `EQM_PM_DUE_DATE` datetime(6) DEFAULT NULL,
  `EQM_CREATED_ON` datetime(6) DEFAULT NULL,
  `EQM_UPDATED_BY` varchar(7) DEFAULT NULL,
  `EQM_UPDATED_ON` datetime(6) DEFAULT NULL,
  `EQM_BUDGETAMT` decimal(19,4) DEFAULT NULL,
  `EQM_CAL_NABL_TYPE` tinyint(1) DEFAULT NULL,
  `EQM_CAL_NORMAL_TYPE` tinyint(1) DEFAULT NULL,
  `EQM_CAL_AT` varchar(50) DEFAULT NULL,
  `EQM_CAL_Freq_Change` tinyint(1) DEFAULT NULL,
  `EQM_DIV_UPD_REASON` longtext DEFAULT NULL,
  `EQM_CAL_FREQ_Current` varchar(2) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;


-- --------------------------------------------------------
-- Table structure for `cmms_eqip_tec_spec`
-- --------------------------------------------------------
CREATE TABLE `cmms_eqip_tec_spec` (
  `EMD_EQIP_TYPE` varchar(15) NOT NULL,
  `EQM_ID` int(11) NOT NULL,
  `EMD_SPEC_NAME` varchar(50) NOT NULL,
  `EMD_SPEC_VALUE` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;


-- --------------------------------------------------------
-- Table structure for `cmms_fault_mst`
-- --------------------------------------------------------
CREATE TABLE `cmms_fault_mst` (
  `FM_FAULT_ID` int(11) NOT NULL,
  `FM_FAULT` varchar(50) DEFAULT NULL,
  `FM_TYPE` varchar(50) NOT NULL,
  `FM_JOTYPE` varchar(3) DEFAULT NULL,
  `FM_CREATED_BY` varchar(7) DEFAULT NULL,
  `FM_CREATED_ON` datetime(6) DEFAULT NULL,
  `FM_UPDATED_BY` varchar(7) DEFAULT NULL,
  `FM_UPDATED_ON` datetime(6) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;


-- --------------------------------------------------------
-- Table structure for `cmms_ins_accuracy_info`
-- --------------------------------------------------------
CREATE TABLE `cmms_ins_accuracy_info` (
  `EIA_INS_ID` int(11) NOT NULL,
  `EIA_TYPE` varchar(15) NOT NULL,
  `EIA_ACCURACY` varchar(50) NOT NULL,
  `EIA_RANGE` varchar(50) DEFAULT NULL,
  `EIA_UNIT` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;


-- --------------------------------------------------------
-- Table structure for `cmms_inv_eqip_dtl`
-- --------------------------------------------------------
CREATE TABLE `cmms_inv_eqip_dtl` (
  `IVD_PARTNO` int(11) NOT NULL,
  `IVD_EQM_ID` int(11) NOT NULL,
  `IND_EQM_TYPE` varchar(15) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;


-- --------------------------------------------------------
-- Table structure for `cmms_inv_mst`
-- --------------------------------------------------------
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


-- --------------------------------------------------------
-- Table structure for `cmms_jobcard_attendedby_dtl`
-- --------------------------------------------------------
CREATE TABLE `cmms_jobcard_attendedby_dtl` (
  `JMA_SECTIONJOBNO` varchar(9) NOT NULL,
  `JMA_USERID` varchar(7) NOT NULL,
  `JMA_ISAWAITING` tinyint(1) NOT NULL DEFAULT 1,
  `JMA_SRNO` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;


-- --------------------------------------------------------
-- Table structure for `cmms_jobcard_awaitinginfo`
-- --------------------------------------------------------
CREATE TABLE `cmms_jobcard_awaitinginfo` (
  `JobcardNumber` varchar(9) NOT NULL,
  `AwaitingFromDate` datetime(6) DEFAULT NULL,
  `AwaitingFor` varchar(50) DEFAULT NULL,
  `JobStartDate` datetime(6) DEFAULT NULL,
  `AwaitingClearDate` datetime(6) DEFAULT NULL,
  `RepairStatus` varchar(50) DEFAULT NULL,
  `ServiceEngr` tinyint(1) NOT NULL,
  `Operator` tinyint(1) NOT NULL,
  `Apprentice` tinyint(1) NOT NULL,
  `AttendedBy` varchar(50) DEFAULT NULL,
  `IndentNo` varchar(50) DEFAULT NULL,
  `IndentDate` datetime(6) DEFAULT NULL,
  `PurchaseOrderNo` varchar(50) DEFAULT NULL,
  `PurchaseOrderDate` datetime(6) DEFAULT NULL,
  `PurchaseCostinRs` decimal(13,2) DEFAULT NULL,
  `Supplier` varchar(50) DEFAULT NULL,
  `SRVNo` varchar(50) DEFAULT NULL,
  `SRVDate` datetime(6) DEFAULT NULL,
  `SupplierId` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;


-- --------------------------------------------------------
-- Table structure for `cmms_jobcard_cal_adjustments_dtl`
-- --------------------------------------------------------
CREATE TABLE `cmms_jobcard_cal_adjustments_dtl` (
  `JCAD_JobCardNo` varchar(9) NOT NULL,
  `JCAD_Parameter` varchar(50) NOT NULL,
  `JCAD_TestValue` varchar(50) NOT NULL,
  `JCAD_SpecLimit` varchar(50) DEFAULT NULL,
  `JCAD_BeforeAdj` varchar(50) DEFAULT NULL,
  `JCAD_AfterAdj` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;


-- --------------------------------------------------------
-- Table structure for `cmms_jobcard_cal_dtl`
-- --------------------------------------------------------
CREATE TABLE `cmms_jobcard_cal_dtl` (
  `JCD_JobCardNo` varchar(9) NOT NULL,
  `JCD_RecdWith` int(11) DEFAULT NULL,
  `JCD_RecdOn` datetime(6) DEFAULT NULL,
  `JCD_JobStartedOn` datetime(6) DEFAULT NULL,
  `JCD_JobCompletedOn` datetime(6) DEFAULT NULL,
  `JCD_CalDueDate` datetime(6) DEFAULT NULL,
  `JCD_CALRefNo` varchar(50) DEFAULT NULL,
  `JCD_CalBy` varchar(100) DEFAULT NULL,
  `JCD_CALStatus` varchar(50) DEFAULT NULL,
  `JCD_ReasonForNoCAL` varchar(50) DEFAULT NULL,
  `JCD_EQStatusAsRecd` varchar(50) DEFAULT NULL,
  `JCD_Adjustments` varchar(100) DEFAULT NULL,
  `JCD_WorkThruContract` tinyint(1) NOT NULL,
  `JCD_RepairedBy` varchar(50) DEFAULT NULL,
  `JCD_SentToInstLabOn` datetime(6) DEFAULT NULL,
  `JCD_RecdFromInstLabOn` datetime(6) DEFAULT NULL,
  `JCD_Temprature` smallint(6) DEFAULT NULL,
  `JCD_RH` smallint(6) DEFAULT NULL,
  `JCD_RH2` smallint(6) DEFAULT NULL,
  `JCD_TempraturePM` decimal(18,2) DEFAULT NULL,
  `JM_CalProcedureRef` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;


-- --------------------------------------------------------
-- Table structure for `cmms_jobcard_cal_observations`
-- --------------------------------------------------------
CREATE TABLE `cmms_jobcard_cal_observations` (
  `JobcardNumber` varchar(9) NOT NULL,
  `TaskID` int(11) NOT NULL,
  `Status` varchar(15) DEFAULT NULL,
  `Is_NABL` tinyint(3) UNSIGNED DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;


-- --------------------------------------------------------
-- Table structure for `cmms_jobcard_contract_warranty_dtl`
-- --------------------------------------------------------
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


-- --------------------------------------------------------
-- Table structure for `cmms_jobcard_eq_used`
-- --------------------------------------------------------
CREATE TABLE `cmms_jobcard_eq_used` (
  `JEU_JobCardNo` varchar(9) NOT NULL,
  `JEU_EquipType` varchar(15) NOT NULL,
  `JEU_EquipId` int(11) NOT NULL,
  `JEU_Notes` longtext DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;


-- --------------------------------------------------------
-- Table structure for `cmms_jobcard_faulty_category`
-- --------------------------------------------------------
CREATE TABLE `cmms_jobcard_faulty_category` (
  `JobcardNumber` varchar(9) NOT NULL,
  `FaultyType` varchar(50) NOT NULL,
  `FaultyCategory` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;


-- --------------------------------------------------------
-- Table structure for `cmms_jobcard_faulty_section`
-- --------------------------------------------------------
CREATE TABLE `cmms_jobcard_faulty_section` (
  `JobcardNumber` varchar(9) NOT NULL,
  `FaultyType` varchar(50) NOT NULL,
  `FaultySection` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;


-- --------------------------------------------------------
-- Table structure for `cmms_jobcard_inspection_info`
-- --------------------------------------------------------
CREATE TABLE `cmms_jobcard_inspection_info` (
  `InstrumentID` int(11) DEFAULT NULL,
  `JobcardNumber` varchar(9) NOT NULL,
  `JobStartDate` datetime(6) DEFAULT NULL,
  `JobCompleteDate` datetime(6) DEFAULT NULL,
  `EqRecdStatus` tinyint(3) UNSIGNED DEFAULT NULL,
  `EqNotRecdReason` varchar(500) DEFAULT NULL,
  `WarrantyExpiresOn` datetime(6) DEFAULT NULL,
  `CriticalTestResults` varchar(100) DEFAULT NULL,
  `InspectionResult` varchar(20) DEFAULT NULL,
  `RejectionReasons` varchar(200) DEFAULT NULL,
  `FaultDescription` varchar(200) DEFAULT NULL,
  `ActionTakenBySupplier` varchar(100) DEFAULT NULL,
  `AccRejInfoGivenTo` varchar(35) DEFAULT NULL,
  `AccRejInfoGivenDate` datetime(6) DEFAULT NULL,
  `IntimationOn` datetime(6) DEFAULT NULL,
  `FinalStatus` tinyint(3) UNSIGNED DEFAULT NULL,
  `FinalStatusDate` datetime(6) DEFAULT NULL,
  `Remarks` longtext DEFAULT NULL,
  `FirstVisitOn` datetime(6) DEFAULT NULL,
  `EquipmentRecdOn` datetime(6) DEFAULT NULL,
  `upsize_ts` binary(8) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;


-- --------------------------------------------------------
-- Table structure for `cmms_jobcard_mst`
-- --------------------------------------------------------
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


-- --------------------------------------------------------
-- Table structure for `cmms_jobcard_mst_history`
-- --------------------------------------------------------
CREATE TABLE `cmms_jobcard_mst_history` (
  `HistoryId` int(11) NOT NULL,
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
  `HU_UPDATED_ON` datetime(6) DEFAULT NULL,
  `HU_UPDATED_BY` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;


-- --------------------------------------------------------
-- Table structure for `cmms_jobcard_repair_info`
-- --------------------------------------------------------
CREATE TABLE `cmms_jobcard_repair_info` (
  `JobcardNumber` varchar(9) NOT NULL,
  `JobStartdate` datetime(6) DEFAULT NULL,
  `JobEndDate` datetime(6) DEFAULT NULL,
  `RepairResult` varchar(25) DEFAULT NULL,
  `ReasonsForNotRepaired` varchar(50) DEFAULT NULL,
  `FaultDescription` varchar(550) DEFAULT NULL,
  `ActionTaken` varchar(550) DEFAULT NULL,
  `JobcardFromCalLab` tinyint(1) NOT NULL,
  `SentToCALLabOn` datetime(6) DEFAULT NULL,
  `WarrantyRepairs` tinyint(3) UNSIGNED DEFAULT NULL,
  `RepairsThroughContract` tinyint(1) NOT NULL,
  `PrSystemStatus` tinyint(1) DEFAULT NULL,
  `ComplaintAndSymptoms` varchar(200) DEFAULT NULL,
  `SystemCheckedBy` varchar(50) DEFAULT NULL,
  `SystemCheckedOn` datetime(6) DEFAULT NULL,
  `Remarks` varchar(550) DEFAULT NULL,
  `PresentSystemStatus` int(11) DEFAULT NULL,
  `upsize_ts` binary(8) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;


-- --------------------------------------------------------
-- Table structure for `cmms_jobcard_request_info`
-- --------------------------------------------------------
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


-- --------------------------------------------------------
-- Table structure for `cmms_jobcard_request_item_dtl`
-- --------------------------------------------------------
CREATE TABLE `cmms_jobcard_request_item_dtl` (
  `JR_SECTIONJOBNO` varchar(9) NOT NULL,
  `JR_ITEM_ID` varchar(20) NOT NULL,
  `JR_ITEM_TYPE` varchar(60) NOT NULL,
  `JR_ITEM_NAME` varchar(100) NOT NULL,
  `JR_ITEM_MODELNO` varchar(100) NOT NULL,
  `JR_ITEM_SRNO` varchar(100) NOT NULL,
  `JR_ITEM_INUSE` tinyint(1) NOT NULL,
  `JR_ITEM_REMARKS` varchar(100) DEFAULT NULL,
  `JR_ITEM_CALREQUIRED` tinyint(1) NOT NULL,
  `JR_ITEM_SUBMITTED` tinyint(1) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;


-- --------------------------------------------------------
-- Table structure for `cmms_jobcard_spares_equip`
-- --------------------------------------------------------
CREATE TABLE `cmms_jobcard_spares_equip` (
  `JobcardNumber` varchar(9) NOT NULL,
  `Sr_No` int(11) NOT NULL,
  `FaultyDevice` int(11) NOT NULL,
  `Source` varchar(15) DEFAULT NULL,
  `PartNo` varchar(50) DEFAULT NULL,
  `Quantity` int(11) DEFAULT NULL,
  `CostRs` decimal(13,2) DEFAULT NULL,
  `PartName` varchar(100) DEFAULT NULL,
  `FaultyDeviceName` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;


-- --------------------------------------------------------
-- Table structure for `cmms_jobcard_status_hist`
-- --------------------------------------------------------
CREATE TABLE `cmms_jobcard_status_hist` (
  `JH_SectionJobNo` varchar(9) NOT NULL,
  `JH_FNPETYPE` varchar(1) DEFAULT NULL,
  `JH_JobStatus` varchar(2) NOT NULL,
  `JH_StatusUpdatedOn` datetime(6) NOT NULL,
  `JH_StatusUpdatedBy` varchar(7) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;


-- --------------------------------------------------------
-- Table structure for `cmms_jobrequest_item_dtl`
-- --------------------------------------------------------
CREATE TABLE `cmms_jobrequest_item_dtl` (
  `JR_JOBREQUESTNO` int(11) NOT NULL,
  `JR_ITEM_ID` int(11) NOT NULL,
  `JR_ITEM_TYPE` varchar(60) NOT NULL,
  `JR_ITEM_NAME` varchar(100) NOT NULL,
  `JR_ITEM_MODELNO` varchar(100) NOT NULL,
  `JR_ITEM_SRNO` varchar(100) NOT NULL,
  `JR_ITEM_INUSE` tinyint(1) NOT NULL DEFAULT 0,
  `JR_ITEM_CALREQ` tinyint(1) NOT NULL DEFAULT 0,
  `JR_ITEM_REMARK` varchar(100) DEFAULT NULL,
  `JR_ITEM_CHANGED_FLAG` tinyint(1) NOT NULL,
  `JR_ITEM_SUBMITTED` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;


-- --------------------------------------------------------
-- Table structure for `cmms_jobrequest_mst`
-- --------------------------------------------------------
CREATE TABLE `cmms_jobrequest_mst` (
  `JR_JOBREQUESTNO` int(11) NOT NULL,
  `JR_REQUEST_TYPE` varchar(25) NOT NULL,
  `JR_JOBREQUESTDATE` datetime NOT NULL,
  `JR_SECTIONJOB_NO` varchar(9) DEFAULT NULL,
  `JR_EQM_ID` int(11) DEFAULT NULL,
  `JR_EQM_TYPE` varchar(15) NOT NULL,
  `JR_EQM_NAME` varchar(200) DEFAULT NULL,
  `JR_EQM_MFRID` int(11) DEFAULT NULL,
  `JR_EQM_MFR_NAME` varchar(100) DEFAULT NULL,
  `JR_EQM_MODELNO` varchar(100) DEFAULT NULL,
  `JR_EQM_SRNO` varchar(100) DEFAULT NULL,
  `JR_INST_TYPE` int(11) DEFAULT NULL,
  `JR_EQM_OPTNDESC` varchar(200) DEFAULT NULL,
  `JR_SUBMITTEDBYID` varchar(7) DEFAULT NULL,
  `JR_SUBMITTEDBYNAME` varchar(100) DEFAULT NULL,
  `JR_PROJECTID` varchar(100) DEFAULT NULL,
  `JR_SUBSYSTEM` varchar(100) DEFAULT NULL,
  `JR_DESIGNATION` varchar(100) DEFAULT NULL,
  `JR_DIVISION` int(11) DEFAULT NULL,
  `JR_PHOENLAB` varchar(100) DEFAULT NULL,
  `JR_PHONEROOM` varchar(100) DEFAULT NULL,
  `JR_AFTERREPAIRS` tinyint(1) DEFAULT NULL,
  `JR_COMPLAINTANDSYMPTOMS` varchar(400) DEFAULT NULL,
  `JR_REQUESTFOR` varchar(15) DEFAULT NULL,
  `JR_PONO` varchar(100) DEFAULT NULL,
  `JR_PODATE` datetime DEFAULT NULL,
  `JR_SRVNO` varchar(100) DEFAULT NULL,
  `JR_SRVDATE` datetime DEFAULT NULL,
  `JR_BUDGETCODE` varchar(15) DEFAULT NULL,
  `JR_EQIPCOST` decimal(19,2) DEFAULT NULL,
  `JR_EQM_COSTCURRENCY` varchar(100) DEFAULT NULL,
  `JR_EQM_WRNTY_EXPIRY_DATE` smallint(6) DEFAULT NULL,
  `JR_WORKING_STATUS` varchar(20) DEFAULT NULL,
  `JR_DIVISION_CHANGE_FLAG` tinyint(1) DEFAULT NULL,
  `JR_ITEM_CHANGE_FLAG` tinyint(1) DEFAULT NULL,
  `JR_REMARKS` varchar(500) DEFAULT NULL,
  `Email` varchar(300) DEFAULT NULL,
  `JR_MVP_STATUS` enum('DRAFT','SUBMITTED','ASSIGNED','IN_PROGRESS','COMPLETED','VERIFIED_CLOSED','REJECTED','REOPENED') NOT NULL DEFAULT 'DRAFT',
  `JR_MVP_STATUS_AT` datetime(6) DEFAULT NULL,
  `JR_APPROVED_BY` varchar(7) DEFAULT NULL,
  `JR_APPROVED_ON` datetime(6) DEFAULT NULL,
  `JR_REJECTED_BY` varchar(7) DEFAULT NULL,
  `JR_REJECTED_ON` datetime(6) DEFAULT NULL,
  `JR_REJECTION_REASON` varchar(500) DEFAULT NULL,
  `JR_PRIORITY` enum('LOW','NORMAL','HIGH','URGENT') NOT NULL DEFAULT 'NORMAL',
  `JR_ASSIGNED_ENGINEER` varchar(7) DEFAULT NULL,
  `JR_JOB_CATEGORY` enum('TME','FPE') DEFAULT NULL COMMENT 'Phase 6: TME (Test&Measurement) vs FPE (Fabrication&Production)',
  `JR_JOB_TYPE` enum('CALIBRATION','REPAIR','REGISTRATION') DEFAULT NULL COMMENT 'Phase 6: kind of work requested',
  `JR_TNC_ACCEPTED_AT` datetime(6) DEFAULT NULL COMMENT 'Phase 6: when the requester accepted all 6 T&C checkboxes',
  `JR_TNC_VERSION` varchar(10) DEFAULT 'v1' COMMENT 'Phase 6: version string of the T&C set that was accepted',
  `JR_CREATED_AT` datetime(6) NOT NULL DEFAULT current_timestamp(6) COMMENT 'Phase 6: deterministic creation timestamp; index-friendly',
  `JR_UPDATED_AT` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6) COMMENT 'Phase 6: auto-touched on every row update'
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;


-- --------------------------------------------------------
-- Table structure for `cmms_jobrequest_project_dtl`
-- --------------------------------------------------------
CREATE TABLE `cmms_jobrequest_project_dtl` (
  `JR_JOBREQUESTNO` int(11) NOT NULL,
  `JR_PROJECTID` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;


-- --------------------------------------------------------
-- Table structure for `cmms_lineitem_mst`
-- --------------------------------------------------------
CREATE TABLE `cmms_lineitem_mst` (
  `LITM_ID` varchar(15) NOT NULL,
  `LITM_NAME` varchar(100) NOT NULL,
  `LITM_AMT` bigint(20) DEFAULT NULL,
  `LITM_YEAR` varchar(9) DEFAULT NULL,
  `LITM_STATE` tinyint(1) NOT NULL,
  `LITM_CREATED_BY` varchar(7) NOT NULL,
  `LITM_CREATED_ON` datetime(6) NOT NULL,
  `LITM_UPDATED_BY` varchar(7) NOT NULL,
  `LITM_UPDATED_ON` datetime(6) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;


-- --------------------------------------------------------
-- Table structure for `cmms_parameter_master`
-- --------------------------------------------------------
CREATE TABLE `cmms_parameter_master` (
  `CategoryID` smallint(6) NOT NULL,
  `CategoryDescription` varchar(50) NOT NULL,
  `SrID` varchar(15) NOT NULL,
  `Value` varchar(150) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `display_order` smallint(6) NOT NULL DEFAULT 0,
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `created_by` varchar(7) DEFAULT NULL,
  `updated_at` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  `updated_by` varchar(7) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;


-- --------------------------------------------------------
-- Table structure for `cmms_po_item_dtl`
-- --------------------------------------------------------
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


-- --------------------------------------------------------
-- Table structure for `cmms_po_mst`
-- --------------------------------------------------------
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


-- --------------------------------------------------------
-- Table structure for `cmms_po_payment_dtl`
-- --------------------------------------------------------
CREATE TABLE `cmms_po_payment_dtl` (
  `POP_ID` int(11) NOT NULL,
  `POP_INVOICE_DATE` datetime(6) NOT NULL,
  `POP_INVOICE_AMOUNT` decimal(13,2) NOT NULL,
  `POP_INVOICE_NO` varchar(50) DEFAULT NULL,
  `POP_INVOICE_CLEARDATE` datetime(6) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;


-- --------------------------------------------------------
-- Table structure for `cmms_po_receive_dtl`
-- --------------------------------------------------------
CREATE TABLE `cmms_po_receive_dtl` (
  `POR_ID` int(11) NOT NULL,
  `POR_SRVNO` varchar(50) NOT NULL,
  `POR_SRVDATE` datetime(6) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;


-- --------------------------------------------------------
-- Table structure for `cmms_product_mst`
-- --------------------------------------------------------
CREATE TABLE `cmms_product_mst` (
  `PROD_ID` int(11) NOT NULL,
  `PROD_NAME` varchar(50) NOT NULL,
  `PROD_DESC` varchar(200) DEFAULT NULL,
  `PROD_TYPE` tinyint(1) NOT NULL DEFAULT 0,
  `PROD_INSTR_TYPE` tinyint(1) NOT NULL DEFAULT 0,
  `PROD_TNME_TYPE` tinyint(1) NOT NULL DEFAULT 0,
  `PROD_STATE` tinyint(1) NOT NULL DEFAULT 0,
  `PROD_CREATED_BY` varchar(7) NOT NULL,
  `PROD_CREATED_ON` datetime(6) NOT NULL,
  `PROD_UPDATED_BY` varchar(7) NOT NULL,
  `PROD_UPDATED_ON` datetime(6) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;


-- --------------------------------------------------------
-- Table structure for `cmms_proj_mst`
-- --------------------------------------------------------
CREATE TABLE `cmms_proj_mst` (
  `PR_ID` int(11) NOT NULL,
  `PR_NAME` varchar(50) NOT NULL,
  `PR_STATE` tinyint(1) NOT NULL,
  `PR_CREATED_BY` varchar(7) NOT NULL,
  `PR_CREATED_ON` datetime(6) NOT NULL,
  `PR_UPDATED_BY` varchar(7) NOT NULL,
  `PR_UPDATED_ON` datetime(6) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;


-- --------------------------------------------------------
-- Table structure for `cmms_pur_dtl`
-- --------------------------------------------------------
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


-- --------------------------------------------------------
-- Table structure for `cmms_pur_mst`
-- --------------------------------------------------------
CREATE TABLE `cmms_pur_mst` (
  `PUM_NO` varchar(25) NOT NULL,
  `PUM_REQ_WHO` bigint(20) DEFAULT NULL,
  `PUM_DT` datetime(6) DEFAULT NULL,
  `PUM_VEND_CODE` varchar(4) DEFAULT NULL,
  `PUM_COST_CENTER` varchar(30) DEFAULT NULL,
  `PUM_PARTSTOTAL` decimal(10,2) DEFAULT NULL,
  `PUM_FRIGHT` decimal(10,2) DEFAULT NULL,
  `PUM_OTHERCHARGE` decimal(10,2) DEFAULT NULL,
  `PUM_GTOTAL` decimal(22,2) DEFAULT NULL,
  `PUM_BILLTO` varchar(4) DEFAULT NULL,
  `PUM_GST` varchar(10) DEFAULT NULL,
  `PUM_INSU` varchar(10) DEFAULT NULL,
  `PUM_OCTROI` varchar(10) DEFAULT NULL,
  `PUM_APPROVAL1` bigint(20) DEFAULT NULL,
  `PUM_APPROVAL2` bigint(20) DEFAULT NULL,
  `PUM_APP1_DATE` datetime(6) DEFAULT NULL,
  `PUM_APP2_DATE` datetime(6) DEFAULT NULL,
  `PUM_CREATED_BY` mediumint(9) DEFAULT NULL,
  `PUM_CREATED_ON` datetime(6) DEFAULT NULL,
  `PUM_UPDATED_BY` mediumint(9) DEFAULT NULL,
  `PUM_UPDATED_ON` datetime(6) DEFAULT NULL,
  `PUM_REMARKS` longtext DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;


-- --------------------------------------------------------
-- Table structure for `cmms_schedule_eqip_dtl`
-- --------------------------------------------------------
CREATE TABLE `cmms_schedule_eqip_dtl` (
  `SC_PLAN_ID` int(11) NOT NULL,
  `SC_TYPE` varchar(3) NOT NULL,
  `SC_EQM_ID` int(11) NOT NULL,
  `SC_EQM_TYPE` varchar(15) NOT NULL,
  `SC_SCHEDULE_DATE` datetime(6) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;


-- --------------------------------------------------------
-- Table structure for `cmms_schedule_mst`
-- --------------------------------------------------------
CREATE TABLE `cmms_schedule_mst` (
  `SC_PLAN_ID` int(11) NOT NULL,
  `SC_TYPE` varchar(3) NOT NULL,
  `SC_YEAR` varchar(50) NOT NULL,
  `SC_SM_ID` int(11) NOT NULL,
  `SC_CREATED_BY` varchar(7) DEFAULT NULL,
  `SC_CREATED_ON` datetime(6) DEFAULT NULL,
  `SC_UPDATED_BY` varchar(50) DEFAULT NULL,
  `SC_UPDATED_ON` datetime(6) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;


-- --------------------------------------------------------
-- Table structure for `cmms_section_mst`
-- --------------------------------------------------------
CREATE TABLE `cmms_section_mst` (
  `SM_ID` int(11) NOT NULL,
  `SM_SHORTNAME` varchar(50) NOT NULL,
  `SM_NAME` varchar(80) DEFAULT NULL,
  `SM_HEAD_NAME` varchar(50) DEFAULT NULL,
  `SM_HEAD_PH_NO` varchar(50) DEFAULT NULL,
  `SM_HEAD_USER_ID` varchar(7) DEFAULT NULL,
  `SM_STATE` tinyint(1) NOT NULL,
  `SM_CREATED_BY` varchar(7) NOT NULL,
  `SM_CREATED_ON` datetime(6) NOT NULL,
  `SM_UPDATED_BY` varchar(7) NOT NULL,
  `SM_UPDATED_ON` datetime(6) NOT NULL,
  `SM_HEAD_DESIGNATION` varchar(200) DEFAULT NULL,
  `SM_ISGROUP` tinyint(1) NOT NULL DEFAULT 0,
  `SM_Email` varchar(150) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;


-- --------------------------------------------------------
-- Table structure for `cmms_supplier_mfr`
-- --------------------------------------------------------
CREATE TABLE `cmms_supplier_mfr` (
  `SUP_ID` int(11) DEFAULT NULL,
  `MFR_ID` int(11) NOT NULL,
  `MFR_PROD_ID` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;


-- --------------------------------------------------------
-- Table structure for `cmms_task_mst`
-- --------------------------------------------------------
CREATE TABLE `cmms_task_mst` (
  `TSK_ID` int(11) NOT NULL,
  `TSK_EMP_ID` varchar(7) DEFAULT NULL COMMENT 'NA ',
  `TSK_NAME` varchar(100) NOT NULL,
  `TSK_TYPE` varchar(50) NOT NULL COMMENT 'Calibration/PM',
  `TSK_DESC` varchar(200) DEFAULT NULL,
  `TSK_EST_HOUR` decimal(18,2) DEFAULT NULL COMMENT 'NA',
  `TSK_STATE` tinyint(1) NOT NULL,
  `TSK_CREATED_BY` varchar(7) NOT NULL,
  `TSK_CREATED_ON` datetime(6) NOT NULL,
  `TSK_UPDATED_BY` varchar(7) NOT NULL,
  `TSK_UPDATED_ON` datetime(6) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;


-- --------------------------------------------------------
-- Table structure for `cmms_vendor_doc_spec`
-- --------------------------------------------------------
CREATE TABLE `cmms_vendor_doc_spec` (
  `VENDOR_ID` int(11) NOT NULL,
  `VENDOR_DOC_FILENAME` varchar(255) NOT NULL,
  `VENDOR_DOC_IMAGE` longblob DEFAULT NULL,
  `VENDOR_DOC_PATH` longtext DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;


-- --------------------------------------------------------
-- Table structure for `departments`
-- --------------------------------------------------------
CREATE TABLE `departments` (
  `department_id` smallint(5) UNSIGNED NOT NULL,
  `department_code` varchar(20) NOT NULL COMMENT 'Short uppercase code; e.g., TIMCD',
  `department_name` varchar(150) NOT NULL COMMENT 'Full name',
  `department_description` varchar(500) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `created_by` varchar(20) DEFAULT NULL,
  `updated_at` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  `updated_by` varchar(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci COMMENT='Cluster 2: organisation top-level (TIMCD, future depts)';


-- --------------------------------------------------------
-- Table structure for `equipment_status_history`
-- --------------------------------------------------------
CREATE TABLE `equipment_status_history` (
  `history_id` bigint(20) UNSIGNED NOT NULL,
  `eqm_type` varchar(15) NOT NULL,
  `eqm_id` int(11) NOT NULL,
  `from_status` varchar(30) DEFAULT NULL COMMENT 'NULL on first row (initial PENDING_VERIFICATION)',
  `to_status` varchar(30) NOT NULL,
  `transitioned_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `transitioned_by` varchar(7) NOT NULL,
  `reason` varchar(500) DEFAULT NULL,
  `related_job_card` varchar(9) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci COMMENT='Cluster 3: equipment state machine transitions';


-- --------------------------------------------------------
-- Table structure for `export_audit`
-- --------------------------------------------------------
CREATE TABLE `export_audit` (
  `export_id` bigint(20) UNSIGNED NOT NULL,
  `actor_employee_id` varchar(7) NOT NULL,
  `export_type` enum('JOB_CARD_PDF','CAL_CERT_PDF','JOB_REQUEST_PDF','EXCEL_EQUIPMENT','EXCEL_JOB_CARDS') NOT NULL,
  `record_ids` text NOT NULL COMMENT 'JSON array or CSV of PK(s) exported',
  `occurred_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `ip_address` varchar(45) DEFAULT NULL,
  `byte_count` int(10) UNSIGNED DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci COMMENT='Cluster 10: PDF/Excel export audit trail';


-- --------------------------------------------------------
-- Table structure for `job_request_accessories`
-- --------------------------------------------------------
CREATE TABLE `job_request_accessories` (
  `acc_id` bigint(20) UNSIGNED NOT NULL COMMENT 'Phase 6: row id',
  `jr_no` int(11) NOT NULL COMMENT 'FK → cmms_jobrequest_mst.JR_JOBREQUESTNO',
  `accessory_type` varchar(60) NOT NULL COMMENT 'Free-form category (probe, cable, adapter, …)',
  `accessory_name` varchar(120) NOT NULL,
  `serial_no` varchar(120) DEFAULT NULL,
  `position` smallint(5) UNSIGNED NOT NULL DEFAULT 0 COMMENT 'UI ordering — render rows in this order',
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci COMMENT='Phase 6: accessory child rows for a Job Request';


-- --------------------------------------------------------
-- Table structure for `job_request_status_history`
-- --------------------------------------------------------
CREATE TABLE `job_request_status_history` (
  `history_id` bigint(20) UNSIGNED NOT NULL,
  `jr_no` int(11) NOT NULL,
  `from_status` varchar(30) DEFAULT NULL,
  `to_status` varchar(30) NOT NULL,
  `transitioned_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `transitioned_by` varchar(7) NOT NULL,
  `reason` varchar(500) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci COMMENT='Cluster 4: JR state machine transitions';


-- --------------------------------------------------------
-- Table structure for `login_audit`
-- --------------------------------------------------------
CREATE TABLE `login_audit` (
  `audit_id` bigint(20) UNSIGNED NOT NULL,
  `employee_id` varchar(7) NOT NULL COMMENT 'What user typed; may not exist',
  `attempt_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `outcome` enum('SUCCESS','FAILED_BAD_PASSWORD','FAILED_USER_LOCKED','FAILED_USER_INACTIVE','FAILED_NOT_FOUND','FAILED_INVALID_FORMAT','LOGOUT','TOKEN_REFRESH') NOT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` varchar(500) DEFAULT NULL,
  `notes` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci COMMENT='Cluster 1: every login attempt logged (BR-AUTH-06)';


-- --------------------------------------------------------
-- Table structure for `permissions`
-- --------------------------------------------------------
CREATE TABLE `permissions` (
  `permission_id` smallint(5) UNSIGNED NOT NULL,
  `permission_code` varchar(80) NOT NULL COMMENT 'e.g., equipment:create, job_card:verify-close',
  `resource` varchar(40) NOT NULL,
  `action` varchar(60) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `is_system` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci COMMENT='Cluster 1: atomic resource:action permissions';


-- --------------------------------------------------------
-- Table structure for `refresh_tokens`
-- --------------------------------------------------------
CREATE TABLE `refresh_tokens` (
  `token_id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `token_hash` varchar(64) NOT NULL COMMENT 'sha256 hex (64 chars); raw token never persisted',
  `issued_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `expires_at` datetime(6) NOT NULL,
  `revoked_at` datetime(6) DEFAULT NULL,
  `revoked_reason` enum('LOGOUT','ROTATED','ADMIN_REVOKE','PASSWORD_CHANGE','EXPIRY_CLEANUP') DEFAULT NULL,
  `user_agent` varchar(500) DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci COMMENT='Cluster 1: 7-day refresh token store (D17)';


-- --------------------------------------------------------
-- Table structure for `roles`
-- --------------------------------------------------------
CREATE TABLE `roles` (
  `role_id` tinyint(3) UNSIGNED NOT NULL COMMENT 'Hard-coded 1..5 for deterministic seeds',
  `role_code` varchar(30) NOT NULL COMMENT 'SUPER_ADMIN | LAB_IN_CHARGE | LAB_ENGINEER | NORMAL_USER | VIEW_ONLY',
  `role_name` varchar(60) NOT NULL,
  `role_description` varchar(255) DEFAULT NULL,
  `is_system` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci COMMENT='Cluster 1: 5 system roles';


-- --------------------------------------------------------
-- Table structure for `role_permissions`
-- --------------------------------------------------------
CREATE TABLE `role_permissions` (
  `role_id` tinyint(3) UNSIGNED NOT NULL,
  `permission_id` smallint(5) UNSIGNED NOT NULL,
  `granted_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `granted_by` varchar(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci COMMENT='Cluster 1: which role gets which permission';


-- --------------------------------------------------------
-- Table structure for `schema_migrations`
-- --------------------------------------------------------
CREATE TABLE `schema_migrations` (
  `migration_id` varchar(120) NOT NULL,
  `checksum_sha256` varchar(64) NOT NULL,
  `applied_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `applied_by` varchar(40) DEFAULT NULL,
  `duration_ms` int(10) UNSIGNED DEFAULT NULL,
  `success` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;


-- --------------------------------------------------------
-- Table structure for `sections`
-- --------------------------------------------------------
CREATE TABLE `sections` (
  `section_id` int(10) UNSIGNED NOT NULL,
  `department_id` smallint(5) UNSIGNED NOT NULL,
  `section_code` varchar(20) NOT NULL COMMENT 'Short uppercase code; e.g., TME, FPE',
  `section_name` varchar(150) NOT NULL,
  `section_description` varchar(500) DEFAULT NULL,
  `equipment_category` enum('TME','FPE') NOT NULL COMMENT 'TME = Test & Measurement; FPE = Fabrication & Production',
  `head_employee_id` varchar(7) DEFAULT NULL COMMENT 'FK → cmms_emp_mst.EMM_ID (legacy)',
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `created_by` varchar(20) DEFAULT NULL,
  `updated_at` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  `updated_by` varchar(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci COMMENT='Cluster 2: T&ME and F&PE sections under TIMCD';


-- --------------------------------------------------------
-- Table structure for `sysdiagrams`
-- --------------------------------------------------------
CREATE TABLE `sysdiagrams` (
  `name` varchar(160) NOT NULL,
  `principal_id` int(11) NOT NULL,
  `diagram_id` int(11) NOT NULL,
  `version` int(11) DEFAULT NULL,
  `definition` longblob DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;


-- --------------------------------------------------------
-- Table structure for `tmpcaldtl`
-- --------------------------------------------------------
CREATE TABLE `tmpcaldtl` (
  `eqm_type` varchar(15) DEFAULT NULL,
  `eqm_id` int(11) DEFAULT NULL,
  `eqm_cal_due_date` datetime(6) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;


-- --------------------------------------------------------
-- Table structure for `users`
-- --------------------------------------------------------
CREATE TABLE `users` (
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `employee_id` varchar(7) NOT NULL COMMENT 'Matches cmms_emp_mst.EMM_ID',
  `password_hash` varchar(60) NOT NULL COMMENT 'bcrypt(employee_id) at seed; bcrypt(new_pwd) if Super Admin resets',
  `section_id` int(10) UNSIGNED DEFAULT NULL COMMENT 'FK → sections.section_id; NULL allowed for unassigned',
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `is_locked` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Auto-set TRUE after N failed logins; only Super Admin unlocks',
  `failed_login_count` smallint(5) UNSIGNED NOT NULL DEFAULT 0,
  `last_login_at` datetime(6) DEFAULT NULL,
  `last_login_ip` varchar(45) DEFAULT NULL COMMENT 'IPv6-ready',
  `password_hash_set_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `created_by` varchar(20) DEFAULT NULL,
  `updated_at` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  `updated_by` varchar(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci COMMENT='Cluster 1: auth identity (one row per loginable user)';


-- --------------------------------------------------------
-- Table structure for `user_roles`
-- --------------------------------------------------------
CREATE TABLE `user_roles` (
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `role_id` tinyint(3) UNSIGNED NOT NULL,
  `assigned_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `assigned_by` varchar(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci COMMENT='Cluster 1: exactly one role per user (BR-RBAC-02)';


-- --------------------------------------------------------
-- Table structure for `_legacy_accessright_mst`
-- --------------------------------------------------------
CREATE TABLE `_legacy_accessright_mst` (
  `ACC_MOD_ID` int(11) NOT NULL,
  `ACC_ROLE` int(11) NOT NULL,
  `ACC_ADD` tinyint(3) UNSIGNED NOT NULL,
  `ACC_MODIFY` tinyint(3) UNSIGNED NOT NULL,
  `ACC_VIEW` tinyint(3) UNSIGNED NOT NULL,
  `ACC_DELETE` tinyint(3) UNSIGNED NOT NULL,
  `ACC_PRINT` tinyint(3) UNSIGNED NOT NULL,
  `ACC_CREATED_BY` varchar(7) DEFAULT NULL,
  `ACC_CREATED_ON` datetime(6) DEFAULT NULL,
  `ACC_UPDATED_BY` varchar(7) DEFAULT NULL,
  `ACC_UPDATED_ON` datetime(6) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;


-- --------------------------------------------------------
-- Table structure for `_legacy_cal_jobcard_feedback_spec`
-- --------------------------------------------------------
CREATE TABLE `_legacy_cal_jobcard_feedback_spec` (
  `CAL_JOBCARD_ID` int(11) NOT NULL,
  `CAL_JOBCARD_FILENAME` varchar(255) NOT NULL,
  `CAL_JOBCARD_IMAGE` longblob DEFAULT NULL,
  `CAL_JOBCARD_PATH` longtext DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;


-- --------------------------------------------------------
-- Table structure for `_legacy_cf001`
-- --------------------------------------------------------
CREATE TABLE `_legacy_cf001` (
  `CHKL_ID` int(11) NOT NULL,
  `CHKL_TYPE` varchar(50) NOT NULL,
  `CHKL_MAKE` int(11) NOT NULL,
  `CHKL_MODEL` varchar(50) NOT NULL,
  `CHKL_STATE` tinyint(1) NOT NULL,
  `CHKL_UPDATED_BY` varchar(7) NOT NULL,
  `CHKL_UPDATED_ON` datetime(6) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;


-- --------------------------------------------------------
-- Table structure for `_legacy_cf002`
-- --------------------------------------------------------
CREATE TABLE `_legacy_cf002` (
  `CLTSK_ID` int(11) NOT NULL,
  `CLTSK_TASKID` int(11) NOT NULL,
  `CLTSK_UPDATED_BY` longtext DEFAULT NULL,
  `CLTSK_UPDATED_ON` datetime(6) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;


-- --------------------------------------------------------
-- Table structure for `_legacy_cf003`
-- --------------------------------------------------------
CREATE TABLE `_legacy_cf003` (
  `CHKL_ID` int(11) NOT NULL,
  `CHKL_TYPE` varchar(50) NOT NULL,
  `CHKL_MAKE` int(11) NOT NULL,
  `CHKL_MODEL` varchar(50) NOT NULL,
  `CHKL_STATE` tinyint(1) NOT NULL,
  `CHKL_CREATED_BY` varchar(7) NOT NULL,
  `CHKL_CREATED_ON` datetime(6) NOT NULL,
  `CHKL_UPDATED_BY` varchar(7) NOT NULL,
  `CHKL_UPDATED_ON` datetime(6) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;


-- --------------------------------------------------------
-- Table structure for `_legacy_cf004`
-- --------------------------------------------------------
CREATE TABLE `_legacy_cf004` (
  `CLTSK_ID` int(11) NOT NULL,
  `CLTSK_TASKID` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;


-- --------------------------------------------------------
-- Table structure for `_legacy_chklistvendor`
-- --------------------------------------------------------
CREATE TABLE `_legacy_chklistvendor` (
  `chklistno` int(11) DEFAULT NULL,
  `mfrid` int(11) DEFAULT NULL,
  `modelno` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;


-- --------------------------------------------------------
-- Table structure for `_legacy_jobcard_insp_maint_dtl`
-- --------------------------------------------------------
CREATE TABLE `_legacy_jobcard_insp_maint_dtl` (
  `JMD_JobCardNo` varchar(9) NOT NULL,
  `JMD_JobStartDate` datetime(6) DEFAULT NULL,
  `JMD_JobCompleteDate` datetime(6) DEFAULT NULL,
  `JMD_AttendedBy` varchar(50) DEFAULT NULL,
  `JMD_EqAccepted` tinyint(1) NOT NULL,
  `JMD_NotAcceptedReason` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;


-- --------------------------------------------------------
-- Table structure for `_legacy_module_mst`
-- --------------------------------------------------------
CREATE TABLE `_legacy_module_mst` (
  `MOD_MENU_TYPE` smallint(6) NOT NULL DEFAULT 1 COMMENT '"0" for non timcf and "1" for timcf',
  `MOD_ID` int(11) NOT NULL,
  `MOD_NAME` varchar(50) NOT NULL,
  `MOD_PARENT_ID` int(11) DEFAULT NULL,
  `MOD_LEVEL` smallint(6) NOT NULL,
  `MOD_POSITION` int(11) DEFAULT NULL,
  `MOD_NAVIGATE_URL` varchar(100) DEFAULT '#',
  `MOD_CREATED_BY` varchar(7) DEFAULT NULL,
  `MOD_CREATED_ON` datetime(6) DEFAULT NULL,
  `MOD_UPDATED_BY` varchar(7) DEFAULT NULL,
  `MOD_UPDATED_ON` datetime(6) DEFAULT NULL,
  `MOD_IS_LEAF` int(11) DEFAULT 1,
  `MOD_DESC` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;


-- --------------------------------------------------------
-- Table structure for `_legacy_parameter_master_bkp`
-- --------------------------------------------------------
CREATE TABLE `_legacy_parameter_master_bkp` (
  `CategoryID` smallint(6) NOT NULL,
  `CategoryDescription` varchar(50) NOT NULL,
  `SrID` varchar(15) NOT NULL,
  `Value` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;


-- --------------------------------------------------------
-- Table structure for `_legacy_parameter_master_incharge`
-- --------------------------------------------------------
CREATE TABLE `_legacy_parameter_master_incharge` (
  `CategoryID` smallint(6) NOT NULL,
  `CategoryDescription` varchar(50) NOT NULL,
  `SrID` varchar(15) NOT NULL,
  `Value` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;


-- --------------------------------------------------------
-- Table structure for `_legacy_parameter_master_jun2016`
-- --------------------------------------------------------
CREATE TABLE `_legacy_parameter_master_jun2016` (
  `CategoryID` smallint(6) NOT NULL,
  `CategoryDescription` varchar(50) NOT NULL,
  `SrID` varchar(15) NOT NULL,
  `Value` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;


-- --------------------------------------------------------
-- Table structure for `_legacy_role_mst`
-- --------------------------------------------------------
CREATE TABLE `_legacy_role_mst` (
  `ROLE_ID` int(11) NOT NULL,
  `ROLE_TYPE` int(11) DEFAULT NULL,
  `ROLE_DESC` varchar(50) NOT NULL,
  `ROLE_CREATED_BY` varchar(50) DEFAULT NULL,
  `ROLE_CREATED_ON` datetime(6) DEFAULT NULL,
  `ROLE_UPDATED_BY` varchar(50) DEFAULT NULL,
  `ROLE_UPDATED_ON` datetime(6) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;


-- --------------------------------------------------------
-- Table structure for `_legacy_section_user_mst`
-- --------------------------------------------------------
CREATE TABLE `_legacy_section_user_mst` (
  `SM_ID` int(11) NOT NULL,
  `SM_USER_ID` varchar(7) NOT NULL,
  `SM_USER_NAME` varchar(50) NOT NULL,
  `SM_USER_ROLE` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;


-- --------------------------------------------------------
-- Table structure for `_legacy_userrole_mst`
-- --------------------------------------------------------
CREATE TABLE `_legacy_userrole_mst` (
  `USER_ID` varchar(7) NOT NULL,
  `USER_DIVISION_ID` int(11) NOT NULL,
  `USER_ROLE` int(11) NOT NULL,
  `USER_PASSWORD` varchar(10) NOT NULL,
  `USER_STATE` tinyint(1) NOT NULL,
  `USER_CREATED_BY` varchar(7) NOT NULL,
  `USER_CREATED_ON` datetime(6) NOT NULL,
  `USER_UPDATED_BY` varchar(7) NOT NULL,
  `USER_UPDATED_ON` datetime(6) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;


-- --------------------------------------------------------
-- Indexes, AUTO_INCREMENT, and Foreign Key Constraints
-- --------------------------------------------------------

ALTER TABLE `audit_log`
  ADD PRIMARY KEY (`audit_id`),
  ADD KEY `idx_al_entity` (`entity_type`,`entity_id`,`occurred_at`),
  ADD KEY `idx_al_actor` (`actor_employee_id`,`occurred_at`),
  ADD KEY `idx_al_action` (`action`,`occurred_at`),
  ADD KEY `idx_al_time` (`occurred_at`);

ALTER TABLE `audit_log_changes`
  ADD PRIMARY KEY (`change_id`),
  ADD KEY `idx_alc_audit` (`audit_id`);

ALTER TABLE `cmms_amc_mst`
  ADD PRIMARY KEY (`AMC_ID`),
  ADD KEY `FK_CMMS_AMC_MST_CMMS_BUDGET_MST` (`AMC_BUDGET_ID`),
  ADD KEY `FK_CMMS_AMC_MST_CMMS_CONT_MST` (`AMC_VENDERID`);

ALTER TABLE `cmms_checklist_mst`
  ADD PRIMARY KEY (`CHKL_ID`),
  ADD KEY `FK_CMMS_CHECKLIST_MST_CMMS_CONT_MST` (`CHKL_MAKE`);

ALTER TABLE `cmms_checklist_tasks`
  ADD PRIMARY KEY (`CLTSK_ID`,`CLTSK_TASKID`),
  ADD KEY `FK_CMMS_CHECKLIST_TASKS_CMMS_TASK_MST` (`CLTSK_TASKID`);

ALTER TABLE `cmms_cont_mst`
  ADD PRIMARY KEY (`CMM_CONT_ID`),
  ADD UNIQUE KEY `uk_cont_name` (`CMM_CONT_NAME`),
  ADD KEY `idx_cont_type` (`CMM_CONT_TYPE`),
  ADD KEY `idx_cont_active` (`CMM_CONT_STATE_FLAG`),
  ADD KEY `idx_cont_name_search` (`CMM_CONT_NAME`(50));

ALTER TABLE `cmms_designation_mst`
  ADD PRIMARY KEY (`DG_ID`);

ALTER TABLE `cmms_desig_hist`
  ADD PRIMARY KEY (`EMM_ID`,`EMM_DESIGNATION`,`EMM_DATE`);

ALTER TABLE `cmms_device_spares_mst`
  ADD PRIMARY KEY (`DS_ID`);

ALTER TABLE `cmms_division_hist`
  ADD KEY `FK_CMMS_DIVISION_HIST_CMMS_EQIP_MST` (`EQD_EQM_TYPE`,`EQD_EQM_ID`);

ALTER TABLE `cmms_documentno_mst`
  ADD PRIMARY KEY (`DocumentType`,`DocumentYear`);

ALTER TABLE `cmms_emp_mst`
  ADD PRIMARY KEY (`EMM_ID`),
  ADD KEY `FK_CMMS_EMP_MST_CMMS_SECTION_MST` (`EMM_DEPT`),
  ADD KEY `FK_CMMS_EMP_MST_CMMS_ROLE_MST` (`EMM_ROLE`),
  ADD KEY `idx_emm_active` (`EMM_INACTIVE`);

ALTER TABLE `cmms_eqipinst_identification`
  ADD PRIMARY KEY (`EMD_EQIP_TYPE`,`EQM_ID`,`EII_ID`);

ALTER TABLE `cmms_eqip_detail_spec`
  ADD PRIMARY KEY (`EDS_EQIP_TYPE`,`EDS_EQIP_ID`,`EDS_FILENAME`);

ALTER TABLE `cmms_eqip_mst`
  ADD PRIMARY KEY (`EQM_TYPE`,`EQM_ID`),
  ADD KEY `FK_CMMS_EQIP_MST_CMMS_SECTION_MST` (`EQM_DIVID`),
  ADD KEY `FK_CMMS_EQIP_MST_CMMS_CHECKLIST_MST` (`EQM_PMCHKLSTNO`),
  ADD KEY `FK_CMMS_EQIP_MST_CMMS_CHECKLIST_MST1` (`EQM_CALCHKLSTNO`),
  ADD KEY `FK_CMMS_EQIP_MST_CMMS_CONT_MST` (`EQM_MFRID`),
  ADD KEY `FK_CMMS_EQIP_MST_CMMS_PRODUCT_MST` (`EQM_INST_TYPE`),
  ADD KEY `idx_eqip_mvp_status` (`EQM_MVP_STATUS`),
  ADD KEY `idx_eqip_cal_due` (`EQM_CAL_DUE_DATE`),
  ADD KEY `idx_eqip_section_new` (`EQM_SECTION_ID`),
  ADD KEY `idx_eqip_mfr` (`EQM_MFRID`);

ALTER TABLE `cmms_eqip_mst_hist`
  ADD PRIMARY KEY (`EQM_HIST_ID`);

ALTER TABLE `cmms_eqip_tec_spec`
  ADD PRIMARY KEY (`EMD_EQIP_TYPE`,`EQM_ID`,`EMD_SPEC_NAME`);

ALTER TABLE `cmms_fault_mst`
  ADD PRIMARY KEY (`FM_FAULT_ID`,`FM_TYPE`);

ALTER TABLE `cmms_ins_accuracy_info`
  ADD PRIMARY KEY (`EIA_INS_ID`,`EIA_TYPE`,`EIA_ACCURACY`),
  ADD KEY `FK_CMMS_INS_ACCURACY_INFO_CMMS_EQIP_MST` (`EIA_TYPE`,`EIA_INS_ID`);

ALTER TABLE `cmms_inv_eqip_dtl`
  ADD PRIMARY KEY (`IVD_PARTNO`,`IVD_EQM_ID`,`IND_EQM_TYPE`),
  ADD KEY `FK_CMMS_INV_EQIP_DTL_CMMS_EQIP_MST` (`IND_EQM_TYPE`,`IVD_EQM_ID`);

ALTER TABLE `cmms_inv_mst`
  ADD PRIMARY KEY (`INV_PARTNO`),
  ADD KEY `FK_CMMS_INV_MST_CMMS_CONT_MST` (`INV_MCODE`),
  ADD KEY `FK_CMMS_INV_MST_CMMS_DEVICE_SPARES_MST` (`INV_INTLSPARESID`);

ALTER TABLE `cmms_jobcard_attendedby_dtl`
  ADD PRIMARY KEY (`JMA_SECTIONJOBNO`,`JMA_USERID`,`JMA_ISAWAITING`),
  ADD KEY `FK_CMMS_JOBCARD_ATTENDEDBY_DTL_CMMS_EMP_MST` (`JMA_USERID`);

ALTER TABLE `cmms_jobcard_awaitinginfo`
  ADD PRIMARY KEY (`JobcardNumber`);

ALTER TABLE `cmms_jobcard_cal_adjustments_dtl`
  ADD PRIMARY KEY (`JCAD_JobCardNo`,`JCAD_Parameter`,`JCAD_TestValue`);

ALTER TABLE `cmms_jobcard_cal_dtl`
  ADD PRIMARY KEY (`JCD_JobCardNo`);

ALTER TABLE `cmms_jobcard_cal_observations`
  ADD PRIMARY KEY (`JobcardNumber`,`TaskID`),
  ADD KEY `FK_CMMS_JOBCARD_CAL_OBSERVATIONS_CMMS_TASK_MST` (`TaskID`);

ALTER TABLE `cmms_jobcard_contract_warranty_dtl`
  ADD PRIMARY KEY (`CWD_JobCardNo`);

ALTER TABLE `cmms_jobcard_eq_used`
  ADD PRIMARY KEY (`JEU_JobCardNo`,`JEU_EquipType`,`JEU_EquipId`),
  ADD KEY `FK_CMMS_JOBCARD_EQ_USED_CMMS_EQIP_MST` (`JEU_EquipType`,`JEU_EquipId`);

ALTER TABLE `cmms_jobcard_faulty_category`
  ADD PRIMARY KEY (`JobcardNumber`,`FaultyType`,`FaultyCategory`),
  ADD KEY `FK_CMMS_JOBCARD_FAULTY_CATEGORY_CMMS_FAULT_MST` (`FaultyCategory`,`FaultyType`);

ALTER TABLE `cmms_jobcard_faulty_section`
  ADD PRIMARY KEY (`JobcardNumber`,`FaultyType`,`FaultySection`),
  ADD KEY `FK_CMMS_JOBCARD_FAULTY_SECTION_CMMS_FAULT_MST` (`FaultySection`,`FaultyType`);

ALTER TABLE `cmms_jobcard_inspection_info`
  ADD PRIMARY KEY (`JobcardNumber`);

ALTER TABLE `cmms_jobcard_mst`
  ADD PRIMARY KEY (`JM_SectionJobNo`),
  ADD KEY `FK_CMMS_JOBCARD_MST_CMMS_EQIP_MST` (`JM_EQM_TYPE`,`JM_EQM_ID`),
  ADD KEY `idx_jc_status` (`JM_MVP_STATUS`),
  ADD KEY `idx_jc_recd_date` (`JM_JCRecdDate`),
  ADD KEY `idx_jc_list_default` (`JM_MVP_STATUS`,`JM_CREATED_ON`,`JM_JobCardNO`),
  ADD KEY `idx_jc_due_date` (`JM_PlannedComletedDate`,`JM_MVP_STATUS`);

ALTER TABLE `cmms_jobcard_mst_history`
  ADD PRIMARY KEY (`HistoryId`);

ALTER TABLE `cmms_jobcard_repair_info`
  ADD PRIMARY KEY (`JobcardNumber`);

ALTER TABLE `cmms_jobcard_request_info`
  ADD PRIMARY KEY (`JRI_JobCardNo`);

ALTER TABLE `cmms_jobcard_request_item_dtl`
  ADD PRIMARY KEY (`JR_SECTIONJOBNO`,`JR_ITEM_ID`);

ALTER TABLE `cmms_jobcard_spares_equip`
  ADD PRIMARY KEY (`JobcardNumber`,`Sr_No`),
  ADD UNIQUE KEY `IX_CMMS_JOBCARD_SPARES_EQUIP` (`JobcardNumber`,`FaultyDevice`,`PartNo`);

ALTER TABLE `cmms_jobcard_status_hist`
  ADD KEY `FK_CMMS_JOBCARD_STATUS_HIST_CMMS_JOBCARD_MST` (`JH_SectionJobNo`);

ALTER TABLE `cmms_jobrequest_item_dtl`
  ADD PRIMARY KEY (`JR_JOBREQUESTNO`,`JR_ITEM_ID`);

ALTER TABLE `cmms_jobrequest_mst`
  ADD PRIMARY KEY (`JR_JOBREQUESTNO`),
  ADD KEY `FK_CMMS_JOBREQUEST_MST_CMMS_SECTION_MST` (`JR_DIVISION`),
  ADD KEY `FK_CMMS_JOBREQUEST_MST_CMMS_EQIP_MST` (`JR_EQM_TYPE`,`JR_EQM_ID`),
  ADD KEY `FK_CMMS_JOBREQUEST_MST_CMMS_JOBCARD_MST` (`JR_SECTIONJOB_NO`),
  ADD KEY `FK_CMMS_JOBREQUEST_MST_CMMS_PRODUCT_MST` (`JR_INST_TYPE`),
  ADD KEY `idx_jr_status` (`JR_MVP_STATUS`),
  ADD KEY `idx_jr_priority` (`JR_PRIORITY`,`JR_MVP_STATUS`),
  ADD KEY `idx_jr_assigned_eng` (`JR_ASSIGNED_ENGINEER`),
  ADD KEY `idx_jr_list_default` (`JR_MVP_STATUS`,`JR_CREATED_AT`,`JR_JOBREQUESTNO`),
  ADD KEY `idx_jr_owner_created` (`JR_SUBMITTEDBYID`,`JR_CREATED_AT`),
  ADD KEY `idx_jr_division_created` (`JR_DIVISION`,`JR_CREATED_AT`),
  ADD KEY `idx_jr_priority_status_created` (`JR_PRIORITY`,`JR_MVP_STATUS`,`JR_CREATED_AT`),
  ADD KEY `idx_jr_jobtype_created` (`JR_JOB_TYPE`,`JR_CREATED_AT`);

ALTER TABLE `cmms_jobrequest_project_dtl`
  ADD PRIMARY KEY (`JR_JOBREQUESTNO`,`JR_PROJECTID`),
  ADD KEY `FK_CMMS_JOBREQUEST_PROJECTDTL_CMMS_PROJ_MST` (`JR_PROJECTID`);

ALTER TABLE `cmms_lineitem_mst`
  ADD PRIMARY KEY (`LITM_ID`);

ALTER TABLE `cmms_parameter_master`
  ADD PRIMARY KEY (`CategoryID`,`SrID`),
  ADD KEY `idx_pm_category_order` (`CategoryID`,`display_order`);

ALTER TABLE `cmms_po_item_dtl`
  ADD KEY `FK_CMMS_PO_ITEM_DTL_CMMS_DEVICE_SPARES_MST` (`POI_ITEM_TYPE`),
  ADD KEY `FK_CMMS_PO_ITEM_DTL_CMMS_PO_MST` (`POI_ID`);

ALTER TABLE `cmms_po_mst`
  ADD PRIMARY KEY (`PO_ID`);

ALTER TABLE `cmms_po_payment_dtl`
  ADD KEY `FK_CMMS_PO_PAYMENT_DTL_CMMS_PO_MST` (`POP_ID`);

ALTER TABLE `cmms_po_receive_dtl`
  ADD KEY `FK_CMMS_PO_RECEIVE_DTL_CMMS_PO_MST` (`POR_ID`);

ALTER TABLE `cmms_product_mst`
  ADD PRIMARY KEY (`PROD_ID`);

ALTER TABLE `cmms_proj_mst`
  ADD PRIMARY KEY (`PR_ID`);

ALTER TABLE `cmms_pur_dtl`
  ADD PRIMARY KEY (`PUD_NO`,`PUD_PARTNO`);

ALTER TABLE `cmms_pur_mst`
  ADD PRIMARY KEY (`PUM_NO`);

ALTER TABLE `cmms_schedule_eqip_dtl`
  ADD PRIMARY KEY (`SC_PLAN_ID`,`SC_TYPE`,`SC_EQM_ID`,`SC_EQM_TYPE`,`SC_SCHEDULE_DATE`),
  ADD KEY `FK_CMMS_SCHEDULE_EQIP_DTL_CMMS_EQIP_MST` (`SC_EQM_TYPE`,`SC_EQM_ID`);

ALTER TABLE `cmms_schedule_mst`
  ADD PRIMARY KEY (`SC_PLAN_ID`,`SC_TYPE`),
  ADD KEY `FK_CMMS_SCHEDULE_MST_CMMS_SECTION_MST` (`SC_SM_ID`);

ALTER TABLE `cmms_section_mst`
  ADD PRIMARY KEY (`SM_ID`);

ALTER TABLE `cmms_supplier_mfr`
  ADD UNIQUE KEY `IX_CMMS_SUPPLIER_MFR` (`SUP_ID`,`MFR_ID`,`MFR_PROD_ID`),
  ADD KEY `FK_CMMS_SUPPLIER_MFR_CMMS_CONT_MST1` (`MFR_ID`),
  ADD KEY `FK_CMMS_SUPPLIER_MFR_CMMS_PRODUCT_MST` (`MFR_PROD_ID`);

ALTER TABLE `cmms_task_mst`
  ADD PRIMARY KEY (`TSK_ID`);

ALTER TABLE `departments`
  ADD PRIMARY KEY (`department_id`),
  ADD UNIQUE KEY `uk_dept_code` (`department_code`);

ALTER TABLE `equipment_status_history`
  ADD PRIMARY KEY (`history_id`),
  ADD KEY `fk_esh_jc` (`related_job_card`),
  ADD KEY `idx_esh_eqip_time` (`eqm_type`,`eqm_id`,`transitioned_at`),
  ADD KEY `idx_esh_time` (`transitioned_at`),
  ADD KEY `idx_esh_actor` (`transitioned_by`);

ALTER TABLE `export_audit`
  ADD PRIMARY KEY (`export_id`),
  ADD KEY `idx_ea_actor` (`actor_employee_id`,`occurred_at`),
  ADD KEY `idx_ea_type` (`export_type`,`occurred_at`),
  ADD KEY `idx_ea_time` (`occurred_at`);

ALTER TABLE `job_request_accessories`
  ADD PRIMARY KEY (`acc_id`),
  ADD KEY `idx_jra_jr_pos` (`jr_no`,`position`);

ALTER TABLE `job_request_status_history`
  ADD PRIMARY KEY (`history_id`),
  ADD KEY `fk_jrsh_actor` (`transitioned_by`),
  ADD KEY `idx_jrsh_jr_time` (`jr_no`,`transitioned_at`),
  ADD KEY `idx_jrsh_time` (`transitioned_at`);

ALTER TABLE `login_audit`
  ADD PRIMARY KEY (`audit_id`),
  ADD KEY `idx_la_emp_time` (`employee_id`,`attempt_at`),
  ADD KEY `idx_la_time` (`attempt_at`),
  ADD KEY `idx_la_outcome` (`outcome`,`attempt_at`);

ALTER TABLE `permissions`
  ADD PRIMARY KEY (`permission_id`),
  ADD UNIQUE KEY `uk_perm_code` (`permission_code`),
  ADD KEY `idx_perm_resource` (`resource`);

ALTER TABLE `refresh_tokens`
  ADD PRIMARY KEY (`token_id`),
  ADD UNIQUE KEY `uk_rt_hash` (`token_hash`),
  ADD KEY `idx_rt_user_expires` (`user_id`,`expires_at`),
  ADD KEY `idx_rt_expires` (`expires_at`);

ALTER TABLE `roles`
  ADD PRIMARY KEY (`role_id`),
  ADD UNIQUE KEY `uk_roles_code` (`role_code`);

ALTER TABLE `role_permissions`
  ADD PRIMARY KEY (`role_id`,`permission_id`),
  ADD KEY `idx_rp_perm` (`permission_id`);

ALTER TABLE `schema_migrations`
  ADD PRIMARY KEY (`migration_id`);

ALTER TABLE `sections`
  ADD PRIMARY KEY (`section_id`),
  ADD UNIQUE KEY `uk_sect_code` (`section_code`),
  ADD KEY `fk_sections_head_emp` (`head_employee_id`),
  ADD KEY `idx_sect_dept` (`department_id`),
  ADD KEY `idx_sect_category` (`equipment_category`),
  ADD KEY `idx_sect_active` (`is_active`);

ALTER TABLE `sysdiagrams`
  ADD PRIMARY KEY (`diagram_id`),
  ADD UNIQUE KEY `UK_principal_name` (`principal_id`,`name`);

ALTER TABLE `users`
  ADD PRIMARY KEY (`user_id`),
  ADD UNIQUE KEY `uk_users_employee_id` (`employee_id`),
  ADD KEY `idx_users_active` (`is_active`,`is_locked`),
  ADD KEY `idx_users_section` (`section_id`),
  ADD KEY `idx_users_created_at` (`created_at`);

ALTER TABLE `user_roles`
  ADD PRIMARY KEY (`user_id`),
  ADD KEY `idx_ur_role` (`role_id`);

ALTER TABLE `_legacy_accessright_mst`
  ADD PRIMARY KEY (`ACC_MOD_ID`,`ACC_ROLE`),
  ADD KEY `FK_CMMS_ACCESSRIGHT_MST_CMMS_ROLE_MST` (`ACC_ROLE`);

ALTER TABLE `_legacy_jobcard_insp_maint_dtl`
  ADD PRIMARY KEY (`JMD_JobCardNo`);

ALTER TABLE `_legacy_module_mst`
  ADD PRIMARY KEY (`MOD_ID`),
  ADD KEY `FK_CMMS_MODULE_MST_CMMS_MODULE_MST` (`MOD_PARENT_ID`);

ALTER TABLE `_legacy_role_mst`
  ADD PRIMARY KEY (`ROLE_ID`);

ALTER TABLE `_legacy_section_user_mst`
  ADD PRIMARY KEY (`SM_ID`,`SM_USER_ID`),
  ADD KEY `FK_CMMS_SECTION_USER_MST_CMMS_ROLE_MST` (`SM_USER_ROLE`);

ALTER TABLE `_legacy_userrole_mst`
  ADD PRIMARY KEY (`USER_ID`,`USER_DIVISION_ID`);

ALTER TABLE `audit_log`
  MODIFY `audit_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=21;

ALTER TABLE `audit_log_changes`
  MODIFY `change_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `cmms_cont_mst`
  MODIFY `CMM_CONT_ID` int(11) NOT NULL AUTO_INCREMENT COMMENT 'Surrogate PK;

ALTER TABLE `departments`
  MODIFY `department_id` smallint(5) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

ALTER TABLE `equipment_status_history`
  MODIFY `history_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `export_audit`
  MODIFY `export_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `job_request_accessories`
  MODIFY `acc_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Phase 6: row id', AUTO_INCREMENT=4;

ALTER TABLE `job_request_status_history`
  MODIFY `history_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

ALTER TABLE `login_audit`
  MODIFY `audit_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=58;

ALTER TABLE `permissions`
  MODIFY `permission_id` smallint(5) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=41;

ALTER TABLE `refresh_tokens`
  MODIFY `token_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=44;

ALTER TABLE `sections`
  MODIFY `section_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

ALTER TABLE `users`
  MODIFY `user_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=61;

ALTER TABLE `audit_log_changes`
  ADD CONSTRAINT `fk_alc_audit` FOREIGN KEY (`audit_id`) REFERENCES `audit_log` (`audit_id`) ON DELETE CASCADE;

ALTER TABLE `cmms_amc_mst`
  ADD CONSTRAINT `FK_CMMS_AMC_MST_CMMS_BUDGET_MST` FOREIGN KEY (`AMC_BUDGET_ID`) REFERENCES `cmms_lineitem_mst` (`LITM_ID`),
  ADD CONSTRAINT `FK_CMMS_AMC_MST_CMMS_CONT_MST` FOREIGN KEY (`AMC_VENDERID`) REFERENCES `cmms_cont_mst` (`CMM_CONT_ID`);

ALTER TABLE `cmms_checklist_mst`
  ADD CONSTRAINT `FK_CMMS_CHECKLIST_MST_CMMS_CONT_MST` FOREIGN KEY (`CHKL_MAKE`) REFERENCES `cmms_cont_mst` (`CMM_CONT_ID`);

ALTER TABLE `cmms_checklist_tasks`
  ADD CONSTRAINT `FK_CMMS_CHECKLIST_TASKS_CMMS_CHECKLIST_MST` FOREIGN KEY (`CLTSK_ID`) REFERENCES `cmms_checklist_mst` (`CHKL_ID`),
  ADD CONSTRAINT `FK_CMMS_CHECKLIST_TASKS_CMMS_TASK_MST` FOREIGN KEY (`CLTSK_TASKID`) REFERENCES `cmms_task_mst` (`TSK_ID`);

ALTER TABLE `cmms_desig_hist`
  ADD CONSTRAINT `FK_CMMS_DESIG_HIST_CMMS_EMP_MST` FOREIGN KEY (`EMM_ID`) REFERENCES `cmms_emp_mst` (`EMM_ID`);

ALTER TABLE `cmms_division_hist`
  ADD CONSTRAINT `FK_CMMS_DIVISION_HIST_CMMS_EQIP_MST` FOREIGN KEY (`EQD_EQM_TYPE`,`EQD_EQM_ID`) REFERENCES `cmms_eqip_mst` (`EQM_TYPE`, `EQM_ID`);

ALTER TABLE `cmms_emp_mst`
  ADD CONSTRAINT `FK_CMMS_EMP_MST_CMMS_ROLE_MST` FOREIGN KEY (`EMM_ROLE`) REFERENCES `_legacy_role_mst` (`ROLE_ID`),
  ADD CONSTRAINT `FK_CMMS_EMP_MST_CMMS_SECTION_MST` FOREIGN KEY (`EMM_DEPT`) REFERENCES `cmms_section_mst` (`SM_ID`);

ALTER TABLE `cmms_eqipinst_identification`
  ADD CONSTRAINT `FK_CMMS_EQIPINST_IDENTIFICATION_CMMS_EQIP_MST` FOREIGN KEY (`EMD_EQIP_TYPE`,`EQM_ID`) REFERENCES `cmms_eqip_mst` (`EQM_TYPE`, `EQM_ID`);

ALTER TABLE `cmms_eqip_detail_spec`
  ADD CONSTRAINT `FK_CMMS_EQIP_DETAIL_SPEC_CMMS_EQIP_MST` FOREIGN KEY (`EDS_EQIP_TYPE`,`EDS_EQIP_ID`) REFERENCES `cmms_eqip_mst` (`EQM_TYPE`, `EQM_ID`);

ALTER TABLE `cmms_eqip_mst`
  ADD CONSTRAINT `FK_CMMS_EQIP_MST_CMMS_CHECKLIST_MST` FOREIGN KEY (`EQM_PMCHKLSTNO`) REFERENCES `cmms_checklist_mst` (`CHKL_ID`),
  ADD CONSTRAINT `FK_CMMS_EQIP_MST_CMMS_CHECKLIST_MST1` FOREIGN KEY (`EQM_CALCHKLSTNO`) REFERENCES `cmms_checklist_mst` (`CHKL_ID`),
  ADD CONSTRAINT `FK_CMMS_EQIP_MST_CMMS_CONT_MST` FOREIGN KEY (`EQM_MFRID`) REFERENCES `cmms_cont_mst` (`CMM_CONT_ID`),
  ADD CONSTRAINT `FK_CMMS_EQIP_MST_CMMS_PRODUCT_MST` FOREIGN KEY (`EQM_INST_TYPE`) REFERENCES `cmms_product_mst` (`PROD_ID`),
  ADD CONSTRAINT `FK_CMMS_EQIP_MST_CMMS_SECTION_MST` FOREIGN KEY (`EQM_DIVID`) REFERENCES `cmms_section_mst` (`SM_ID`),
  ADD CONSTRAINT `fk_eqip_section_new` FOREIGN KEY (`EQM_SECTION_ID`) REFERENCES `sections` (`section_id`);

ALTER TABLE `cmms_eqip_tec_spec`
  ADD CONSTRAINT `FK_CMMS_EQIP_TEC_SPEC_CMMS_EQIP_MST` FOREIGN KEY (`EMD_EQIP_TYPE`,`EQM_ID`) REFERENCES `cmms_eqip_mst` (`EQM_TYPE`, `EQM_ID`);

ALTER TABLE `cmms_ins_accuracy_info`
  ADD CONSTRAINT `FK_CMMS_INS_ACCURACY_INFO_CMMS_EQIP_MST` FOREIGN KEY (`EIA_TYPE`,`EIA_INS_ID`) REFERENCES `cmms_eqip_mst` (`EQM_TYPE`, `EQM_ID`);

ALTER TABLE `cmms_inv_eqip_dtl`
  ADD CONSTRAINT `FK_CMMS_INV_EQIP_DTL_CMMS_EQIP_MST` FOREIGN KEY (`IND_EQM_TYPE`,`IVD_EQM_ID`) REFERENCES `cmms_eqip_mst` (`EQM_TYPE`, `EQM_ID`),
  ADD CONSTRAINT `FK_CMMS_INV_EQIP_DTL_CMMS_INV_MST` FOREIGN KEY (`IVD_PARTNO`) REFERENCES `cmms_inv_mst` (`INV_PARTNO`);

ALTER TABLE `cmms_inv_mst`
  ADD CONSTRAINT `FK_CMMS_INV_MST_CMMS_CONT_MST` FOREIGN KEY (`INV_MCODE`) REFERENCES `cmms_cont_mst` (`CMM_CONT_ID`),
  ADD CONSTRAINT `FK_CMMS_INV_MST_CMMS_DEVICE_SPARES_MST` FOREIGN KEY (`INV_INTLSPARESID`) REFERENCES `cmms_device_spares_mst` (`DS_ID`);

ALTER TABLE `cmms_jobcard_attendedby_dtl`
  ADD CONSTRAINT `FK_CMMS_JOBCARD_ATTENDEDBY_DTL_CMMS_EMP_MST` FOREIGN KEY (`JMA_USERID`) REFERENCES `cmms_emp_mst` (`EMM_ID`),
  ADD CONSTRAINT `FK_CMMS_JOBCARD_ATTENDEDBY_DTL_CMMS_JOBCARD_MST` FOREIGN KEY (`JMA_SECTIONJOBNO`) REFERENCES `cmms_jobcard_mst` (`JM_SectionJobNo`);

ALTER TABLE `cmms_jobcard_awaitinginfo`
  ADD CONSTRAINT `FK_CMMS_JOBCARD_AWAITINGINFO_CMMS_JOBCARD_MST` FOREIGN KEY (`JobcardNumber`) REFERENCES `cmms_jobcard_mst` (`JM_SectionJobNo`);

ALTER TABLE `cmms_jobcard_cal_adjustments_dtl`
  ADD CONSTRAINT `FK_CMMS_JOBCARD_CAL_ADJUSTMENTS_DTL_CMMS_JOBCARD_MST` FOREIGN KEY (`JCAD_JobCardNo`) REFERENCES `cmms_jobcard_mst` (`JM_SectionJobNo`);

ALTER TABLE `cmms_jobcard_cal_dtl`
  ADD CONSTRAINT `FK_CMMS_JOBCARD_CAL_DTL_CMMS_JOBCARD_MST` FOREIGN KEY (`JCD_JobCardNo`) REFERENCES `cmms_jobcard_mst` (`JM_SectionJobNo`);

ALTER TABLE `cmms_jobcard_cal_observations`
  ADD CONSTRAINT `FK_CMMS_JOBCARD_CAL_OBSERVATIONS_CMMS_JOBCARD_MST` FOREIGN KEY (`JobcardNumber`) REFERENCES `cmms_jobcard_mst` (`JM_SectionJobNo`),
  ADD CONSTRAINT `FK_CMMS_JOBCARD_CAL_OBSERVATIONS_CMMS_TASK_MST` FOREIGN KEY (`TaskID`) REFERENCES `cmms_task_mst` (`TSK_ID`);

ALTER TABLE `cmms_jobcard_contract_warranty_dtl`
  ADD CONSTRAINT `FK_CMMS_JOBCARD_CONTRACT_WARRANTY_DTL_CMMS_JOBCARD_MST` FOREIGN KEY (`CWD_JobCardNo`) REFERENCES `cmms_jobcard_mst` (`JM_SectionJobNo`);

ALTER TABLE `cmms_jobcard_eq_used`
  ADD CONSTRAINT `FK_CMMS_JOBCARD_EQ_USED_CMMS_EQIP_MST` FOREIGN KEY (`JEU_EquipType`,`JEU_EquipId`) REFERENCES `cmms_eqip_mst` (`EQM_TYPE`, `EQM_ID`),
  ADD CONSTRAINT `FK_CMMS_JOBCARD_EQ_USED_CMMS_JOBCARD_MST` FOREIGN KEY (`JEU_JobCardNo`) REFERENCES `cmms_jobcard_mst` (`JM_SectionJobNo`);

ALTER TABLE `cmms_jobcard_faulty_category`
  ADD CONSTRAINT `FK_CMMS_JOBCARD_FAULTY_CATEGORY_CMMS_FAULT_MST` FOREIGN KEY (`FaultyCategory`,`FaultyType`) REFERENCES `cmms_fault_mst` (`FM_FAULT_ID`, `FM_TYPE`),
  ADD CONSTRAINT `FK_CMMS_JOBCARD_FAULTY_CATEGORY_CMMS_JOBCARD_MST` FOREIGN KEY (`JobcardNumber`) REFERENCES `cmms_jobcard_mst` (`JM_SectionJobNo`);

ALTER TABLE `cmms_jobcard_faulty_section`
  ADD CONSTRAINT `FK_CMMS_JOBCARD_FAULTY_SECTION_CMMS_FAULT_MST` FOREIGN KEY (`FaultySection`,`FaultyType`) REFERENCES `cmms_fault_mst` (`FM_FAULT_ID`, `FM_TYPE`),
  ADD CONSTRAINT `FK_CMMS_JOBCARD_FAULTY_SECTION_CMMS_JOBCARD_MST` FOREIGN KEY (`JobcardNumber`) REFERENCES `cmms_jobcard_mst` (`JM_SectionJobNo`);

ALTER TABLE `cmms_jobcard_inspection_info`
  ADD CONSTRAINT `FK_CMMS_JOBCARD_INSPECTION_INFO_CMMS_JOBCARD_MST` FOREIGN KEY (`JobcardNumber`) REFERENCES `cmms_jobcard_mst` (`JM_SectionJobNo`);

ALTER TABLE `cmms_jobcard_mst`
  ADD CONSTRAINT `FK_CMMS_JOBCARD_MST_CMMS_EQIP_MST` FOREIGN KEY (`JM_EQM_TYPE`,`JM_EQM_ID`) REFERENCES `cmms_eqip_mst` (`EQM_TYPE`, `EQM_ID`);

ALTER TABLE `cmms_jobcard_repair_info`
  ADD CONSTRAINT `FK_CMMS_JOBCARD_REPAIR_INFO_CMMS_JOBCARD_MST` FOREIGN KEY (`JobcardNumber`) REFERENCES `cmms_jobcard_mst` (`JM_SectionJobNo`);

ALTER TABLE `cmms_jobcard_request_info`
  ADD CONSTRAINT `FK_CMMS_JOBCARD_REQUEST_INFO_CMMS_JOBCARD_MST` FOREIGN KEY (`JRI_JobCardNo`) REFERENCES `cmms_jobcard_mst` (`JM_SectionJobNo`);

ALTER TABLE `cmms_jobcard_request_item_dtl`
  ADD CONSTRAINT `FK_CMMS_JOBCARD_REQUEST_ITEM_DTL_CMMS_JOBCARD_MST` FOREIGN KEY (`JR_SECTIONJOBNO`) REFERENCES `cmms_jobcard_mst` (`JM_SectionJobNo`);

ALTER TABLE `cmms_jobcard_spares_equip`
  ADD CONSTRAINT `FK_CMMS_JOBCARD_SPARES_EQUIP_CMMS_JOBCARD_MST` FOREIGN KEY (`JobcardNumber`) REFERENCES `cmms_jobcard_mst` (`JM_SectionJobNo`);

ALTER TABLE `cmms_jobcard_status_hist`
  ADD CONSTRAINT `FK_CMMS_JOBCARD_STATUS_HIST_CMMS_JOBCARD_MST` FOREIGN KEY (`JH_SectionJobNo`) REFERENCES `cmms_jobcard_mst` (`JM_SectionJobNo`);

ALTER TABLE `cmms_jobrequest_item_dtl`
  ADD CONSTRAINT `FK_CMMS_JOBREQUEST_ITEM_DTL_CMMS_JOBREQUEST_MST` FOREIGN KEY (`JR_JOBREQUESTNO`) REFERENCES `cmms_jobrequest_mst` (`JR_JOBREQUESTNO`);

ALTER TABLE `cmms_jobrequest_mst`
  ADD CONSTRAINT `FK_CMMS_JOBREQUEST_MST_CMMS_EQIP_MST` FOREIGN KEY (`JR_EQM_TYPE`,`JR_EQM_ID`) REFERENCES `cmms_eqip_mst` (`EQM_TYPE`, `EQM_ID`),
  ADD CONSTRAINT `FK_CMMS_JOBREQUEST_MST_CMMS_JOBCARD_MST` FOREIGN KEY (`JR_SECTIONJOB_NO`) REFERENCES `cmms_jobcard_mst` (`JM_SectionJobNo`),
  ADD CONSTRAINT `FK_CMMS_JOBREQUEST_MST_CMMS_PRODUCT_MST` FOREIGN KEY (`JR_INST_TYPE`) REFERENCES `cmms_product_mst` (`PROD_ID`),
  ADD CONSTRAINT `FK_CMMS_JOBREQUEST_MST_CMMS_SECTION_MST` FOREIGN KEY (`JR_DIVISION`) REFERENCES `cmms_section_mst` (`SM_ID`);

ALTER TABLE `cmms_jobrequest_project_dtl`
  ADD CONSTRAINT `FK_CMMS_JOBREQUEST_PROJECTDTL_CMMS_JOBREQUEST_MST` FOREIGN KEY (`JR_JOBREQUESTNO`) REFERENCES `cmms_jobrequest_mst` (`JR_JOBREQUESTNO`),
  ADD CONSTRAINT `FK_CMMS_JOBREQUEST_PROJECTDTL_CMMS_PROJ_MST` FOREIGN KEY (`JR_PROJECTID`) REFERENCES `cmms_proj_mst` (`PR_ID`);

ALTER TABLE `cmms_po_item_dtl`
  ADD CONSTRAINT `FK_CMMS_PO_ITEM_DTL_CMMS_DEVICE_SPARES_MST` FOREIGN KEY (`POI_ITEM_TYPE`) REFERENCES `cmms_device_spares_mst` (`DS_ID`),
  ADD CONSTRAINT `FK_CMMS_PO_ITEM_DTL_CMMS_PO_MST` FOREIGN KEY (`POI_ID`) REFERENCES `cmms_po_mst` (`PO_ID`);

ALTER TABLE `cmms_po_payment_dtl`
  ADD CONSTRAINT `FK_CMMS_PO_PAYMENT_DTL_CMMS_PO_MST` FOREIGN KEY (`POP_ID`) REFERENCES `cmms_po_mst` (`PO_ID`);

ALTER TABLE `cmms_po_receive_dtl`
  ADD CONSTRAINT `FK_CMMS_PO_RECEIVE_DTL_CMMS_PO_MST` FOREIGN KEY (`POR_ID`) REFERENCES `cmms_po_mst` (`PO_ID`);

ALTER TABLE `cmms_pur_dtl`
  ADD CONSTRAINT `FK_CMMS_PUR_DTL_CMMS_PUR_MST` FOREIGN KEY (`PUD_NO`) REFERENCES `cmms_pur_mst` (`PUM_NO`);

ALTER TABLE `cmms_schedule_eqip_dtl`
  ADD CONSTRAINT `FK_CMMS_SCHEDULE_EQIP_DTL_CMMS_EQIP_MST` FOREIGN KEY (`SC_EQM_TYPE`,`SC_EQM_ID`) REFERENCES `cmms_eqip_mst` (`EQM_TYPE`, `EQM_ID`),
  ADD CONSTRAINT `FK_CMMS_SCHEDULE_EQIP_DTL_CMMS_SCHEDULE_MST` FOREIGN KEY (`SC_PLAN_ID`,`SC_TYPE`) REFERENCES `cmms_schedule_mst` (`SC_PLAN_ID`, `SC_TYPE`);

ALTER TABLE `cmms_schedule_mst`
  ADD CONSTRAINT `FK_CMMS_SCHEDULE_MST_CMMS_SECTION_MST` FOREIGN KEY (`SC_SM_ID`) REFERENCES `cmms_section_mst` (`SM_ID`);

ALTER TABLE `cmms_supplier_mfr`
  ADD CONSTRAINT `FK_CMMS_SUPPLIER_MFR_CMMS_CONT_MST` FOREIGN KEY (`SUP_ID`) REFERENCES `cmms_cont_mst` (`CMM_CONT_ID`),
  ADD CONSTRAINT `FK_CMMS_SUPPLIER_MFR_CMMS_CONT_MST1` FOREIGN KEY (`MFR_ID`) REFERENCES `cmms_cont_mst` (`CMM_CONT_ID`),
  ADD CONSTRAINT `FK_CMMS_SUPPLIER_MFR_CMMS_PRODUCT_MST` FOREIGN KEY (`MFR_PROD_ID`) REFERENCES `cmms_product_mst` (`PROD_ID`);

ALTER TABLE `equipment_status_history`
  ADD CONSTRAINT `fk_esh_actor` FOREIGN KEY (`transitioned_by`) REFERENCES `cmms_emp_mst` (`EMM_ID`),
  ADD CONSTRAINT `fk_esh_eqip` FOREIGN KEY (`eqm_type`,`eqm_id`) REFERENCES `cmms_eqip_mst` (`EQM_TYPE`, `EQM_ID`),
  ADD CONSTRAINT `fk_esh_jc` FOREIGN KEY (`related_job_card`) REFERENCES `cmms_jobcard_mst` (`JM_SectionJobNo`);

ALTER TABLE `job_request_accessories`
  ADD CONSTRAINT `fk_jra_jr` FOREIGN KEY (`jr_no`) REFERENCES `cmms_jobrequest_mst` (`JR_JOBREQUESTNO`) ON DELETE CASCADE;

ALTER TABLE `job_request_status_history`
  ADD CONSTRAINT `fk_jrsh_actor` FOREIGN KEY (`transitioned_by`) REFERENCES `cmms_emp_mst` (`EMM_ID`),
  ADD CONSTRAINT `fk_jrsh_jr` FOREIGN KEY (`jr_no`) REFERENCES `cmms_jobrequest_mst` (`JR_JOBREQUESTNO`);

ALTER TABLE `refresh_tokens`
  ADD CONSTRAINT `fk_rt_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE;

ALTER TABLE `role_permissions`
  ADD CONSTRAINT `fk_rp_permission` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`permission_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_rp_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`role_id`) ON DELETE CASCADE;

ALTER TABLE `sections`
  ADD CONSTRAINT `fk_sections_department` FOREIGN KEY (`department_id`) REFERENCES `departments` (`department_id`),
  ADD CONSTRAINT `fk_sections_head_emp` FOREIGN KEY (`head_employee_id`) REFERENCES `cmms_emp_mst` (`EMM_ID`);

ALTER TABLE `users`
  ADD CONSTRAINT `fk_users_employee` FOREIGN KEY (`employee_id`) REFERENCES `cmms_emp_mst` (`EMM_ID`),
  ADD CONSTRAINT `fk_users_section` FOREIGN KEY (`section_id`) REFERENCES `sections` (`section_id`);

ALTER TABLE `user_roles`
  ADD CONSTRAINT `fk_ur_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`role_id`),
  ADD CONSTRAINT `fk_ur_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE;

ALTER TABLE `_legacy_accessright_mst`
  ADD CONSTRAINT `FK_CMMS_ACCESSRIGHT_MST_CMMS_MODULE_MST` FOREIGN KEY (`ACC_MOD_ID`) REFERENCES `_legacy_module_mst` (`MOD_ID`),
  ADD CONSTRAINT `FK_CMMS_ACCESSRIGHT_MST_CMMS_ROLE_MST` FOREIGN KEY (`ACC_ROLE`) REFERENCES `_legacy_role_mst` (`ROLE_ID`);

ALTER TABLE `_legacy_jobcard_insp_maint_dtl`
  ADD CONSTRAINT `FK_CMMS_JOBCARD_INSP_MAINT_DTL_CMMS_JOBCARD_MST` FOREIGN KEY (`JMD_JobCardNo`) REFERENCES `cmms_jobcard_mst` (`JM_SectionJobNo`);

ALTER TABLE `_legacy_module_mst`
  ADD CONSTRAINT `FK_CMMS_MODULE_MST_CMMS_MODULE_MST` FOREIGN KEY (`MOD_PARENT_ID`) REFERENCES `_legacy_module_mst` (`MOD_ID`);

ALTER TABLE `_legacy_section_user_mst`
  ADD CONSTRAINT `FK_CMMS_SECTION_USER_MST_CMMS_ROLE_MST` FOREIGN KEY (`SM_USER_ROLE`) REFERENCES `_legacy_role_mst` (`ROLE_ID`),
  ADD CONSTRAINT `FK_CMMS_SECTION_USER_MST_CMMS_SECTION_MST` FOREIGN KEY (`SM_ID`) REFERENCES `cmms_section_mst` (`SM_ID`);
