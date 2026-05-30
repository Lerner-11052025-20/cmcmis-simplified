// ============================================================================
// src/lib/permissions.js  —  Sidebar map keyed by permission code
// ----------------------------------------------------------------------------
// Single source of truth for the sidebar navigation. Each entry pairs a
// route with the PERMISSION CODE that the user must hold to see it.
// Sidebar.jsx (STEP 8 / Phase 5) filters this list via `hasPermission()`
// from auth-context — the UI never renders a link the user cannot follow.
//
// PHASE 5 update — 9 nav items (matches the redesigned ISRO SAC shell):
//   1. Dashboard      — every role except VIEW_ONLY
//   2. Job Requests   — every role
//   3. Job Cards      — every role (read-list permission)
//   4. Equipment      — every role
//   5. Schedule       — Phase 13 ships real CRUD; gate = schedule:read-list
//   6. Procurement    — Phase 13 ships real CRUD; gate = procurement:read-list
//   7. Inquiry        — every role
//   8. Reports        — placeholder, gated by dashboard:view this phase
//   9. Admin          — SUPER_ADMIN only (user:read-list permission)
//
// Per BR-RBAC-03 we check PERMISSION CODES, never role names.
//
// PHASE 13 (2026-05-21) — Schedule + Procurement gained their own permission
// codes (migration 510). The previously-borrowed `equipment:read-list` gates
// for these two items are REPLACED below with their proper codes. View-Only
// retains visibility on both (read-list granted by mig 510) — write/order/
// export actions are gated inside the pages by their specific perms.
//
// PHASE 14 (2026-05-22) — Admin · Audit Log nav item added under the Admin
// section, gated on `audit:read-list` (migration 600). SUPER_ADMIN-only by
// default. The new gate replaces the legacy `audit_log:read` reference the
// placeholder route used between Phase 8 and Phase 13. Auto-hidden for every
// other role via visibleNavItems().
// ============================================================================

import {
  LayoutGrid,
  FileText,
  ClipboardList,
  Wrench,
  Calendar,
  Package,
  Search,
  BarChart3,
  LineChart,
  Settings,
  Users,
  IdCard,
  BadgeCheck,
  RefreshCw,
  ScrollText,
  User,
} from 'lucide-react';

/**
 * @typedef {Object} NavItem
 * @property {string}              label     Display text in the sidebar.
 * @property {string}              to        Router path.
 * @property {React.ComponentType} icon      lucide-react icon component.
 * @property {string}              requires  Permission code gate.
 */

/** @type {NavItem[]} */
export const ALL_NAV_ITEMS = [
  { label: 'Dashboard',    to: '/dashboard',    icon: LayoutGrid,     requires: 'dashboard:view' },
  { label: 'Job Requests', to: '/job-requests', icon: FileText,       requires: 'job_request:read-own' },
  // Phase 7 Slice 2 — Conversion is the LIC + SA workspace where pending
  // requests get turned into Job Cards. Gated on the approve permission,
  // which LAB_IN_CHARGE, scoped lab in-charge roles, and SUPER_ADMIN hold.
  { label: 'Conversion',   to: '/conversion',   icon: RefreshCw,      requires: 'job_request:approve' },
  { label: 'Job Cards',    to: '/job-cards',    icon: ClipboardList,  requires: 'job_card:read-list' },
  { label: 'Equipment',    to: '/equipment',    icon: Wrench,         requires: 'equipment:read-list' },
  { label: 'Schedule',     to: '/schedule',     icon: Calendar,       requires: 'schedule:read-list' },
  { label: 'Procurement',  to: '/procurement',  icon: Package,        requires: 'procurement:read-list' },
  { label: 'Inquiry',      to: '/inquiry',      icon: Search,         requires: 'inquiry:search-instruments' },
  // Phase 11 Slice 2 — standalone Analytics dashboard (8 chart cards).
  // Sits between Inquiry and Reports because it's a quick at-a-glance
  // destination; Reports remains the heavier detailed-table + PDF surface.
  { label: 'Analytics',    to: '/analytics',    icon: LineChart,      requires: 'analytics:view' },
  // Phase 10 — gated by reports:view-analytics (all 5 roles hold it),
  // so the link surface is broad. Per-card visibility inside the page is
  // enforced via the per-report reports:view-* permissions independently.
  { label: 'Reports',      to: '/reports',      icon: BarChart3,      requires: 'reports:view-analytics' },
  // Phase 7 — Admin module (Super Admin only). Old "Admin" placeholder
  // is replaced by these two flat items. Q-7 locked: flat now; future
  // Slice 2 may collapse into a collapsible group with Audit Log etc.
  { label: 'Admin · Users',     to: '/admin/users',     icon: Users,    requires: 'user:read-list' },
  { label: 'Admin · Employees', to: '/admin/employees', icon: IdCard,   requires: 'master:employees:manage' },
  { label: 'Admin · Equipment Verification', to: '/admin/equipment-verification', icon: BadgeCheck, requires: 'equipment:verify' },
  // Phase 14 — Audit Log Viewer (Super Admin only). STRICTLY read-only.
  // Gated on the new `audit:read-list` (mig 600); legacy `audit_log:read`
  // (mig 006) is left in place for any historical reference but is no
  // longer consulted by the FE.
  { label: 'Admin · Audit Log', to: '/audit',           icon: ScrollText, requires: 'audit:read-list' },
  { label: 'Profile',      to: '/profile',      icon: User,           requires: 'dashboard:view' },
];

const NORMAL_USER_NAV_LABELS = new Set([
  'Dashboard',
  'Profile',
  'Job Requests',
  'Equipment',
  'Inquiry',
]);

const VIEW_ONLY_HIDDEN_NAV_LABELS = new Set([
  'Schedule',
  'Procurement',
]);

const GLOBAL_HIDDEN_NAV_LABELS = new Set([
  'Procurement',
]);

const SUPER_ADMIN_ONLY_NAV_LABELS = new Set([
  'Admin · Equipment Verification',
]);

/**
 * Returns the subset of nav items the given permissions array unlocks.
 *
 * @param {string[] | undefined | null} permissions
 * @param {string | undefined | null} role
 * @returns {NavItem[]}
 */
export function visibleNavItems(permissions, role) {
  if (!Array.isArray(permissions) || permissions.length === 0) return [];
  const owned = new Set(permissions);
  return ALL_NAV_ITEMS.filter((item) => {
    if (item.label === 'Profile') return true; // Profile is always visible to all 13 user roles globally!
    if (GLOBAL_HIDDEN_NAV_LABELS.has(item.label)) return false;
    if (SUPER_ADMIN_ONLY_NAV_LABELS.has(item.label) && role !== 'SUPER_ADMIN') return false;
    if (!owned.has(item.requires)) return false;
    if (role === 'NORMAL_USER') return NORMAL_USER_NAV_LABELS.has(item.label);
    if (role === 'VIEW_ONLY') return !VIEW_ONLY_HIDDEN_NAV_LABELS.has(item.label);
    return true;
  });
}
