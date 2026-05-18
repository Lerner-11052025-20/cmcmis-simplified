-- CMCMIS dump90tables schema-only extraction
-- Source: dump90tables.sql inside dump90tables.zip
-- Extracted: 2026-05-18 15:10:22
-- Source SHA256: dd57e353524636a960f04c0fcd658fb8428ecd6e88e653e52a399b81381ffc6a
-- Note: data INSERT statements intentionally removed. Review before running in production.

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

CREATE TABLE `cmms_checklist_tasks` (
  `CLTSK_ID` int(11) NOT NULL,
  `CLTSK_TASKID` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

ALTER TABLE `cmms_checklist_tasks`
  ADD PRIMARY KEY (`CLTSK_ID`,`CLTSK_TASKID`),
  ADD KEY `FK_CMMS_CHECKLIST_TASKS_CMMS_TASK_MST` (`CLTSK_TASKID`);
ALTER TABLE `cmms_checklist_tasks`
  ADD CONSTRAINT `FK_CMMS_CHECKLIST_TASKS_CMMS_CHECKLIST_MST` FOREIGN KEY (`CLTSK_ID`) REFERENCES `cmms_checklist_mst` (`CHKL_ID`),
  ADD CONSTRAINT `FK_CMMS_CHECKLIST_TASKS_CMMS_TASK_MST` FOREIGN KEY (`CLTSK_TASKID`) REFERENCES `cmms_task_mst` (`TSK_ID`);
