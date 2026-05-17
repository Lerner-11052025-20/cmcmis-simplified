-- ════════════════════════════════════════════════════════════════════
-- CMCMIS_SIMPLIFIED — Migration 001
-- File:     001__create_new_tables.sql
-- Purpose:  Create all 15 NEW MVP-runtime tables in FK-safe order
-- Author:   Claude (AI engineering pair) for Deep Sorathiya (DS)
-- Version:  v2.0 LOCKED
-- Idempotent: YES — uses CREATE TABLE IF NOT EXISTS everywhere
-- ════════════════════════════════════════════════════════════════════

SET NAMES utf8;
SET time_zone = '+00:00';
SET foreign_key_checks = 1;
SET sql_mode = 'STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';

-- ────────────────────────────────────────────────────────────────────
-- ORDER MATTERS. FK dependency tree:
--   departments
--     └─ sections (FK → departments)
--   cmms_cont_mst  (no FK — standalone vendor master)
--   permissions    (no FK)
--   roles          (no FK)
--     └─ role_permissions (FK → roles, permissions)
--   users (FK → cmms_emp_mst legacy — must already exist)
--     ├─ user_roles      (FK → users, roles)
--     ├─ refresh_tokens  (FK → users)
--     └─ (login_audit — no FK, loose employee_id)
--   equipment_status_history  (FK → cmms_eqip_mst, cmms_emp_mst, cmms_jobcard_mst legacy)
--   job_request_status_history (FK → cmms_jobrequest_mst, cmms_emp_mst legacy)
--   audit_log                  (no FK — loose actor_employee_id)
--     └─ audit_log_changes (FK → audit_log)
--   export_audit (no FK)
-- ────────────────────────────────────────────────────────────────────


-- ════════════════════════════════════════════════════════════════════
-- CLUSTER 2 — ORGANISATION
-- ════════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────────
-- TABLE 1: departments
-- ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `departments` (
  `department_id`          SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `department_code`        VARCHAR(20)       NOT NULL
                           COMMENT 'Short uppercase code; e.g., TIMCD',
  `department_name`        VARCHAR(150)      NOT NULL
                           COMMENT 'Full name',
  `department_description` VARCHAR(500)      NULL DEFAULT NULL,
  `is_active`              TINYINT(1)        NOT NULL DEFAULT 1,
  `created_at`             DATETIME(6)       NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by`             VARCHAR(7)        NULL DEFAULT NULL,
  `updated_at`             DATETIME(6)       NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
                                             ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by`             VARCHAR(7)        NULL DEFAULT NULL,
  PRIMARY KEY (`department_id`),
  UNIQUE KEY `uk_dept_code` (`department_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci
  COMMENT='Cluster 2: organisation top-level (TIMCD, future depts)';


-- ────────────────────────────────────────────────────────────────────
-- TABLE 2: sections
-- ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `sections` (
  `section_id`          INT UNSIGNED      NOT NULL AUTO_INCREMENT,
  `department_id`       SMALLINT UNSIGNED NOT NULL,
  `section_code`        VARCHAR(20)       NOT NULL
                        COMMENT 'Short uppercase code; e.g., TME, FPE',
  `section_name`        VARCHAR(150)      NOT NULL,
  `section_description` VARCHAR(500)      NULL DEFAULT NULL,
  `equipment_category`  ENUM('TME', 'FPE') NOT NULL
                        COMMENT 'TME = Test & Measurement; FPE = Fabrication & Production',
  `head_employee_id`    VARCHAR(7)        NULL DEFAULT NULL
                        COMMENT 'FK → cmms_emp_mst.EMM_ID (legacy)',
  `is_active`           TINYINT(1)        NOT NULL DEFAULT 1,
  `created_at`          DATETIME(6)       NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by`          VARCHAR(7)        NULL DEFAULT NULL,
  `updated_at`          DATETIME(6)       NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
                                          ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by`          VARCHAR(7)        NULL DEFAULT NULL,
  PRIMARY KEY (`section_id`),
  UNIQUE KEY `uk_sect_code` (`section_code`),
  CONSTRAINT `fk_sections_department`
    FOREIGN KEY (`department_id`) REFERENCES `departments` (`department_id`),
  CONSTRAINT `fk_sections_head_emp`
    FOREIGN KEY (`head_employee_id`) REFERENCES `cmms_emp_mst` (`EMM_ID`),
  INDEX `idx_sect_dept`     (`department_id`),
  INDEX `idx_sect_category` (`equipment_category`),
  INDEX `idx_sect_active`   (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci
  COMMENT='Cluster 2: T&ME and F&PE sections under TIMCD';


-- ════════════════════════════════════════════════════════════════════
-- CLUSTER 3 — VENDOR MASTER (the missing cmms_cont_mst, per Q1)
-- ════════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────────
-- TABLE 3: cmms_cont_mst (NEW — per ADR-DB-06 keeps legacy name)
-- ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `cmms_cont_mst` (
  `CMM_CONT_ID`             INT             NOT NULL AUTO_INCREMENT
                            COMMENT 'Surrogate PK; referenced by 4 legacy tables',
  `CMM_CONT_NAME`           VARCHAR(200)    NOT NULL,
  `CMM_CONT_TYPE`           ENUM('MFR','VENDOR','BOTH','OEM') NOT NULL DEFAULT 'BOTH',
  `CMM_CONT_CONTACT_PERSON` VARCHAR(150)    NULL DEFAULT NULL,
  `CMM_CONT_EMAIL`          VARCHAR(150)    NULL DEFAULT NULL,
  `CMM_CONT_PHONE`          VARCHAR(50)     NULL DEFAULT NULL,
  `CMM_CONT_MOBILE`         VARCHAR(50)     NULL DEFAULT NULL,
  `CMM_CONT_ADDRESS`        VARCHAR(500)    NULL DEFAULT NULL,
  `CMM_CONT_CITY`           VARCHAR(100)    NULL DEFAULT NULL,
  `CMM_CONT_STATE`          VARCHAR(100)    NULL DEFAULT NULL,
  `CMM_CONT_COUNTRY`        VARCHAR(100)    NULL DEFAULT NULL,
  `CMM_CONT_ZIP`            VARCHAR(20)     NULL DEFAULT NULL,
  `CMM_CONT_WEBSITE`        VARCHAR(255)    NULL DEFAULT NULL,
  `CMM_CONT_GSTIN`          VARCHAR(20)     NULL DEFAULT NULL,
  `CMM_CONT_PAN`            VARCHAR(20)     NULL DEFAULT NULL,
  `CMM_CONT_NABL`           TINYINT(1)      NOT NULL DEFAULT 0,
  `CMM_CONT_NABL_CERT_NO`   VARCHAR(50)     NULL DEFAULT NULL,
  `CMM_CONT_REMARKS`        VARCHAR(1000)   NULL DEFAULT NULL,
  `CMM_CONT_STATE_FLAG`     TINYINT(1)      NOT NULL DEFAULT 1
                            COMMENT 'is_active — kept naming style of legacy tables',
  `CMM_CONT_CREATED_BY`     VARCHAR(7)      NOT NULL,
  `CMM_CONT_CREATED_ON`     DATETIME(6)     NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `CMM_CONT_UPDATED_BY`     VARCHAR(7)      NOT NULL,
  `CMM_CONT_UPDATED_ON`     DATETIME(6)     NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
                                            ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`CMM_CONT_ID`),
  UNIQUE KEY `uk_cont_name`        (`CMM_CONT_NAME`),
  INDEX `idx_cont_type`            (`CMM_CONT_TYPE`),
  INDEX `idx_cont_active`          (`CMM_CONT_STATE_FLAG`),
  INDEX `idx_cont_name_search`     (`CMM_CONT_NAME`(50))
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci
  COMMENT='Cluster 3: vendor/manufacturer master (was missing from legacy dump)';


-- ════════════════════════════════════════════════════════════════════
-- CLUSTER 1 — IDENTITY & ACCESS (AUTH)
-- ════════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────────
-- TABLE 4: roles (5 system rows seeded in 005__seed_roles.sql)
-- ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `roles` (
  `role_id`          TINYINT UNSIGNED NOT NULL
                     COMMENT 'Hard-coded 1..5 for deterministic seeds',
  `role_code`        VARCHAR(30)      NOT NULL
                     COMMENT 'SUPER_ADMIN | LAB_IN_CHARGE | LAB_ENGINEER | NORMAL_USER | VIEW_ONLY',
  `role_name`        VARCHAR(60)      NOT NULL,
  `role_description` VARCHAR(255)     NULL DEFAULT NULL,
  `is_system`        TINYINT(1)       NOT NULL DEFAULT 1,
  `created_at`       DATETIME(6)      NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`role_id`),
  UNIQUE KEY `uk_roles_code` (`role_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci
  COMMENT='Cluster 1: 5 system roles';


-- ────────────────────────────────────────────────────────────────────
-- TABLE 5: permissions (~40 system rows seeded in 006__seed_permissions.sql)
-- ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `permissions` (
  `permission_id`   SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `permission_code` VARCHAR(80)       NOT NULL
                    COMMENT 'e.g., equipment:create, job_card:verify-close',
  `resource`        VARCHAR(40)       NOT NULL,
  `action`          VARCHAR(60)       NOT NULL,
  `description`     VARCHAR(255)      NULL DEFAULT NULL,
  `is_system`       TINYINT(1)        NOT NULL DEFAULT 1,
  `created_at`      DATETIME(6)       NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`permission_id`),
  UNIQUE KEY `uk_perm_code`   (`permission_code`),
  INDEX `idx_perm_resource`   (`resource`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci
  COMMENT='Cluster 1: atomic resource:action permissions';


-- ────────────────────────────────────────────────────────────────────
-- TABLE 6: role_permissions (M:N junction)
-- ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `role_permissions` (
  `role_id`       TINYINT UNSIGNED  NOT NULL,
  `permission_id` SMALLINT UNSIGNED NOT NULL,
  `granted_at`    DATETIME(6)       NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `granted_by`    VARCHAR(7)        NULL DEFAULT NULL,
  PRIMARY KEY (`role_id`, `permission_id`),
  CONSTRAINT `fk_rp_role`
    FOREIGN KEY (`role_id`)       REFERENCES `roles` (`role_id`)         ON DELETE CASCADE,
  CONSTRAINT `fk_rp_permission`
    FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`permission_id`) ON DELETE CASCADE,
  INDEX `idx_rp_perm` (`permission_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci
  COMMENT='Cluster 1: which role gets which permission';


-- ────────────────────────────────────────────────────────────────────
-- TABLE 7: users
-- Note: FK to sections is added in 002__alter_legacy_tables.sql AFTER
--       sections exist + after legacy ALTERs. Keeping creation order
--       clean here.
-- ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `users` (
  `user_id`              BIGINT UNSIGNED   NOT NULL AUTO_INCREMENT,
  `employee_id`          VARCHAR(7)        NOT NULL
                         COMMENT 'Matches cmms_emp_mst.EMM_ID',
  `password_hash`        VARCHAR(60)       NOT NULL
                         COMMENT 'bcrypt(employee_id) at seed; bcrypt(new_pwd) if Super Admin resets',
  `section_id`           INT UNSIGNED      NULL DEFAULT NULL
                         COMMENT 'FK → sections.section_id; NULL allowed for unassigned',
  `is_active`            TINYINT(1)        NOT NULL DEFAULT 1,
  `is_locked`            TINYINT(1)        NOT NULL DEFAULT 0
                         COMMENT 'Auto-set TRUE after N failed logins; only Super Admin unlocks',
  `failed_login_count`   SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  `last_login_at`        DATETIME(6)       NULL DEFAULT NULL,
  `last_login_ip`        VARCHAR(45)       NULL DEFAULT NULL
                         COMMENT 'IPv6-ready',
  `password_hash_set_at` DATETIME(6)       NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_at`           DATETIME(6)       NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by`           VARCHAR(7)        NULL DEFAULT NULL,
  `updated_at`           DATETIME(6)       NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
                                           ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by`           VARCHAR(7)        NULL DEFAULT NULL,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `uk_users_employee_id` (`employee_id`),
  CONSTRAINT `fk_users_employee`
    FOREIGN KEY (`employee_id`) REFERENCES `cmms_emp_mst` (`EMM_ID`),
  INDEX `idx_users_active`     (`is_active`, `is_locked`),
  INDEX `idx_users_section`    (`section_id`),
  INDEX `idx_users_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci
  COMMENT='Cluster 1: auth identity (one row per loginable user)';


-- ────────────────────────────────────────────────────────────────────
-- TABLE 8: user_roles  (BR-RBAC-02 enforced by PK on user_id alone)
-- ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `user_roles` (
  `user_id`     BIGINT UNSIGNED   NOT NULL,
  `role_id`     TINYINT UNSIGNED  NOT NULL,
  `assigned_at` DATETIME(6)       NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `assigned_by` VARCHAR(7)        NULL DEFAULT NULL,
  PRIMARY KEY (`user_id`),
  CONSTRAINT `fk_ur_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ur_role`
    FOREIGN KEY (`role_id`) REFERENCES `roles` (`role_id`),
  INDEX `idx_ur_role` (`role_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci
  COMMENT='Cluster 1: exactly one role per user (BR-RBAC-02)';


-- ────────────────────────────────────────────────────────────────────
-- TABLE 9: refresh_tokens
-- ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `refresh_tokens` (
  `token_id`       BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`        BIGINT UNSIGNED NOT NULL,
  `token_hash`     VARCHAR(64)     NOT NULL
                   COMMENT 'sha256 hex (64 chars); raw token never persisted',
  `issued_at`      DATETIME(6)     NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `expires_at`     DATETIME(6)     NOT NULL,
  `revoked_at`     DATETIME(6)     NULL DEFAULT NULL,
  `revoked_reason` ENUM('LOGOUT','ROTATED','ADMIN_REVOKE','PASSWORD_CHANGE','EXPIRY_CLEANUP')
                   NULL DEFAULT NULL,
  `user_agent`     VARCHAR(500)    NULL DEFAULT NULL,
  `ip_address`     VARCHAR(45)     NULL DEFAULT NULL,
  PRIMARY KEY (`token_id`),
  UNIQUE KEY `uk_rt_hash` (`token_hash`),
  CONSTRAINT `fk_rt_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  INDEX `idx_rt_user_expires` (`user_id`, `expires_at`),
  INDEX `idx_rt_expires`      (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci
  COMMENT='Cluster 1: 7-day refresh token store (D17)';


-- ────────────────────────────────────────────────────────────────────
-- TABLE 10: login_audit (no FK by design — failed lookups need to log)
-- ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `login_audit` (
  `audit_id`    BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `employee_id` VARCHAR(7)      NOT NULL
                COMMENT 'What user typed; may not exist',
  `attempt_at`  DATETIME(6)     NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `outcome`     ENUM(
                  'SUCCESS','FAILED_BAD_PASSWORD','FAILED_USER_LOCKED',
                  'FAILED_USER_INACTIVE','FAILED_NOT_FOUND','FAILED_INVALID_FORMAT',
                  'LOGOUT','TOKEN_REFRESH'
                ) NOT NULL,
  `ip_address`  VARCHAR(45)     NULL DEFAULT NULL,
  `user_agent`  VARCHAR(500)    NULL DEFAULT NULL,
  `notes`       VARCHAR(255)    NULL DEFAULT NULL,
  PRIMARY KEY (`audit_id`),
  INDEX `idx_la_emp_time` (`employee_id`, `attempt_at`),
  INDEX `idx_la_time`     (`attempt_at`),
  INDEX `idx_la_outcome`  (`outcome`, `attempt_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci
  COMMENT='Cluster 1: every login attempt logged (BR-AUTH-06)';


-- ════════════════════════════════════════════════════════════════════
-- CLUSTER 3 — EQUIPMENT STATUS HISTORY
-- ════════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────────
-- TABLE 11: equipment_status_history (per Q5)
-- ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `equipment_status_history` (
  `history_id`       BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `eqm_type`         VARCHAR(15)     NOT NULL,
  `eqm_id`           INT             NOT NULL,
  `from_status`      VARCHAR(30)     NULL DEFAULT NULL
                     COMMENT 'NULL on first row (initial PENDING_VERIFICATION)',
  `to_status`        VARCHAR(30)     NOT NULL,
  `transitioned_at`  DATETIME(6)     NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `transitioned_by`  VARCHAR(7)      NOT NULL,
  `reason`           VARCHAR(500)    NULL DEFAULT NULL,
  `related_job_card` VARCHAR(9)      NULL DEFAULT NULL,
  PRIMARY KEY (`history_id`),
  CONSTRAINT `fk_esh_eqip`
    FOREIGN KEY (`eqm_type`, `eqm_id`)
    REFERENCES `cmms_eqip_mst` (`EQM_TYPE`, `EQM_ID`),
  CONSTRAINT `fk_esh_actor`
    FOREIGN KEY (`transitioned_by`) REFERENCES `cmms_emp_mst` (`EMM_ID`),
  CONSTRAINT `fk_esh_jc`
    FOREIGN KEY (`related_job_card`) REFERENCES `cmms_jobcard_mst` (`JM_SectionJobNo`),
  INDEX `idx_esh_eqip_time` (`eqm_type`, `eqm_id`, `transitioned_at` DESC),
  INDEX `idx_esh_time`      (`transitioned_at` DESC),
  INDEX `idx_esh_actor`     (`transitioned_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci
  COMMENT='Cluster 3: equipment state machine transitions';


-- ════════════════════════════════════════════════════════════════════
-- CLUSTER 4 — JOB REQUEST STATUS HISTORY
-- ════════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────────
-- TABLE 12: job_request_status_history (per Q6)
-- ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `job_request_status_history` (
  `history_id`      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `jr_no`           INT             NOT NULL,
  `from_status`     VARCHAR(30)     NULL DEFAULT NULL,
  `to_status`       VARCHAR(30)     NOT NULL,
  `transitioned_at` DATETIME(6)     NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `transitioned_by` VARCHAR(7)      NOT NULL,
  `reason`          VARCHAR(500)    NULL DEFAULT NULL,
  PRIMARY KEY (`history_id`),
  CONSTRAINT `fk_jrsh_jr`
    FOREIGN KEY (`jr_no`) REFERENCES `cmms_jobrequest_mst` (`JR_JOBREQUESTNO`),
  CONSTRAINT `fk_jrsh_actor`
    FOREIGN KEY (`transitioned_by`) REFERENCES `cmms_emp_mst` (`EMM_ID`),
  INDEX `idx_jrsh_jr_time` (`jr_no`, `transitioned_at` DESC),
  INDEX `idx_jrsh_time`    (`transitioned_at` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci
  COMMENT='Cluster 4: JR state machine transitions';


-- ════════════════════════════════════════════════════════════════════
-- CLUSTER 10 — AUDIT & LOGS
-- ════════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────────
-- TABLE 13: audit_log
-- ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `audit_log` (
  `audit_id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `actor_employee_id` VARCHAR(7)      NOT NULL
                      COMMENT 'EMM_ID, or BOOTSTRAP/SYSTEM',
  `actor_role_code`   VARCHAR(30)     NULL DEFAULT NULL,
  `action`            VARCHAR(60)     NOT NULL,
  `entity_type`       VARCHAR(40)     NOT NULL,
  `entity_id`         VARCHAR(50)     NOT NULL,
  `occurred_at`       DATETIME(6)     NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `ip_address`        VARCHAR(45)     NULL DEFAULT NULL,
  `user_agent`        VARCHAR(500)    NULL DEFAULT NULL,
  `request_id`        VARCHAR(40)     NULL DEFAULT NULL,
  `notes`             VARCHAR(500)    NULL DEFAULT NULL,
  PRIMARY KEY (`audit_id`),
  INDEX `idx_al_entity` (`entity_type`, `entity_id`, `occurred_at` DESC),
  INDEX `idx_al_actor`  (`actor_employee_id`, `occurred_at` DESC),
  INDEX `idx_al_action` (`action`, `occurred_at` DESC),
  INDEX `idx_al_time`   (`occurred_at` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci
  COMMENT='Cluster 10: generic write-audit log';


-- ────────────────────────────────────────────────────────────────────
-- TABLE 14: audit_log_changes
-- ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `audit_log_changes` (
  `change_id`    BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `audit_id`     BIGINT UNSIGNED NOT NULL,
  `field_name`   VARCHAR(80)     NOT NULL,
  `before_value` TEXT            NULL DEFAULT NULL,
  `after_value`  TEXT            NULL DEFAULT NULL,
  PRIMARY KEY (`change_id`),
  CONSTRAINT `fk_alc_audit`
    FOREIGN KEY (`audit_id`) REFERENCES `audit_log` (`audit_id`) ON DELETE CASCADE,
  INDEX `idx_alc_audit` (`audit_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci
  COMMENT='Cluster 10: before/after field diffs';


-- ────────────────────────────────────────────────────────────────────
-- TABLE 15: export_audit
-- ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `export_audit` (
  `export_id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `actor_employee_id` VARCHAR(7)      NOT NULL,
  `export_type`       ENUM('JOB_CARD_PDF','CAL_CERT_PDF','JOB_REQUEST_PDF',
                           'EXCEL_EQUIPMENT','EXCEL_JOB_CARDS') NOT NULL,
  `record_ids`        TEXT            NOT NULL
                      COMMENT 'JSON array or CSV of PK(s) exported',
  `occurred_at`       DATETIME(6)     NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `ip_address`        VARCHAR(45)     NULL DEFAULT NULL,
  `byte_count`        INT UNSIGNED    NULL DEFAULT NULL,
  PRIMARY KEY (`export_id`),
  INDEX `idx_ea_actor` (`actor_employee_id`, `occurred_at` DESC),
  INDEX `idx_ea_type`  (`export_type`, `occurred_at` DESC),
  INDEX `idx_ea_time`  (`occurred_at` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci
  COMMENT='Cluster 10: PDF/Excel export audit trail';


-- ════════════════════════════════════════════════════════════════════
-- DONE. 15 new tables created (idempotent).
-- Verify with: SHOW TABLES LIKE 'departments';
--              SHOW TABLES LIKE '%audit%';
-- ════════════════════════════════════════════════════════════════════
