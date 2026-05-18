-- CMCMIS dump90tables schema-only extraction
-- Source: dump90tables.sql inside dump90tables.zip
-- Extracted: 2026-05-18 15:10:22
-- Source SHA256: dd57e353524636a960f04c0fcd658fb8428ecd6e88e653e52a399b81381ffc6a
-- Note: data INSERT statements intentionally removed. Review before running in production.

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

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

ALTER TABLE `cmms_task_mst`
  ADD PRIMARY KEY (`TSK_ID`);
