export const APP_NAME = 'CMCMIS';

export const ROUTE_TITLES = [
  { path: '/login', title: 'Sign In', page: 'Login', access: 'Public' },
  { path: '/dashboard', title: 'Dashboard', page: 'Dashboard', access: 'dashboard:view' },
  { path: '/profile', title: 'Profile', page: 'Profile', access: 'Signed-in user' },
  { path: '/equipment', title: 'Equipment', page: 'Equipment List', access: 'equipment:read-list' },
  { path: '/equipment/new', title: 'New Equipment', page: 'Equipment Form', access: 'equipment:create' },
  { path: '/equipment/:id', title: 'Equipment Detail', page: 'Equipment Detail', access: 'equipment:read-detail' },
  { path: '/job-requests', title: 'Job Requests', page: 'Job Request List', access: 'job_request:read-own' },
  { path: '/job-requests/new', title: 'New Job Request', page: 'Job Request Form', access: 'job_request:create' },
  { path: '/job-requests/:id', title: 'Job Request Detail', page: 'Job Request Detail', access: 'job_request:read-own' },
  { path: '/conversion', title: 'Conversion', page: 'Conversion Workspace', access: 'job_request:approve' },
  { path: '/job-cards', title: 'Job Cards', page: 'Job Card List', access: 'job_card:read-list' },
  { path: '/job-cards/:id', title: 'Job Card Detail', page: 'Job Card Detail', access: 'job_card:read-detail' },
  { path: '/schedule', title: 'Schedule', page: 'Schedule', access: 'schedule:read-list' },
  { path: '/procurement', title: 'Procurement', page: 'Procurement', access: 'procurement:read-list', disabled: true },
  { path: '/inquiry', title: 'Inquiry', page: 'Inquiry', access: 'inquiry:search-vendors' },
  { path: '/reports', title: 'Reports', page: 'Reports Landing', access: 'reports:view-analytics' },
  { path: '/analytics', title: 'Analytics', page: 'Analytics', access: 'analytics:view' },
  { path: '/notifications', title: 'Notifications', page: 'Notifications', access: 'notifications:read-own' },
  { path: '/admin/users', title: 'Admin Users', page: 'User List', access: 'user:read-list' },
  { path: '/admin/employees', title: 'Admin Employees', page: 'Employee List', access: 'master:employees:manage' },
  { path: '/admin/employees/new', title: 'New Employee', page: 'Employee Form', access: 'master:employees:manage' },
  { path: '/admin/employees/:id/edit', title: 'Edit Employee', page: 'Employee Form', access: 'master:employees:manage' },
  { path: '/admin/equipment-verification', title: 'Equipment Verification', page: 'Equipment Verification', access: 'equipment:verify + SUPER_ADMIN' },
  { path: '/audit', title: 'Audit Log', page: 'Audit Viewer', access: 'audit:read-list' },
];

export function formatDocumentTitle(title) {
  return `${APP_NAME} - ${title}`;
}
