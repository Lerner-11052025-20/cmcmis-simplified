SET NAMES utf8mb4;

INSERT IGNORE INTO `permissions`
  (`permission_code`, `resource`, `action`, `description`, `is_system`, `created_at`)
VALUES
  ('master_data_correction:create',  'master_data_correction', 'create',  'Submit equipment division master data correction request', 1, NOW(6)),
  ('master_data_correction:read-list','master_data_correction', 'read-list','Review master data correction requests', 1, NOW(6)),
  ('master_data_correction:approve', 'master_data_correction', 'approve', 'Approve master data correction and update equipment division', 1, NOW(6)),
  ('master_data_correction:reject',  'master_data_correction', 'reject',  'Reject master data correction request', 1, NOW(6));

INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`, `granted_at`, `granted_by`)
SELECT r.`role_id`, p.`permission_id`, NOW(6), 'MDC_806'
  FROM `roles` r
  JOIN `permissions` p
    ON p.`permission_code` = 'master_data_correction:create'
 WHERE r.`role_code` = 'NORMAL_USER';

INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`, `granted_at`, `granted_by`)
SELECT r.`role_id`, p.`permission_id`, NOW(6), 'MDC_806'
  FROM `roles` r
  JOIN `permissions` p
    ON p.`permission_code` IN (
      'master_data_correction:read-list',
      'master_data_correction:approve',
      'master_data_correction:reject'
    )
 WHERE r.`role_code` IN ('SUPER_ADMIN', 'LAB_IN_CHARGE');

SELECT 'Migration 806 complete - master data correction permissions seeded' AS status;
