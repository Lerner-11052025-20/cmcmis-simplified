// ============================================================================
// src/lib/permissions.js  —  Sidebar map keyed by permission code
// ----------------------------------------------------------------------------
// Single source of truth for the sidebar navigation. Each entry pairs a
// route with the PERMISSION CODE that the user must hold to see it.
// Sidebar.jsx (STEP 8 / Phase 5) filters this list via `hasPermission()`
// from auth-context — the UI never renders a link the user cannot follow.
//
// PHASE 5 update — 9 nav items (matches the redesigned ISRO SAC shell):
//   1. Dashboard      — every role except VIEW_ONLY_USER
//   2. Job Requests   — every role
//   3. Job Cards      — every role (read-list permission)
//   4. Equipment      — every role
//   5. Schedule       — placeholder, gated by equipment:read-list this phase
//   6. Procurement    — placeholder, gated by equipment:read-list this phase
//   7. Inquiry        — every role
//   8. Reports        — placeholder, gated by dashboard:view this phase
//   9. Admin          — SUPER_ADMIN only (user:read-list permission)
//
// Per BR-RBAC-03 we check PERMISSION CODES, never role names.
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
  Settings,
  Users,
  IdCard,
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
  { label: 'Job Cards',    to: '/job-cards',    icon: ClipboardList,  requires: 'job_card:read-list' },
  { label: 'Equipment',    to: '/equipment',    icon: Wrench,         requires: 'equipment:read-list' },
  { label: 'Schedule',     to: '/schedule',     icon: Calendar,       requires: 'equipment:read-list' },
  { label: 'Procurement',  to: '/procurement',  icon: Package,        requires: 'equipment:read-list' },
  { label: 'Inquiry',      to: '/inquiry',      icon: Search,         requires: 'inquiry:search-instruments' },
  { label: 'Reports',      to: '/reports',      icon: BarChart3,      requires: 'dashboard:view' },
  // Phase 7 — Admin module (Super Admin only). Old "Admin" placeholder
  // is replaced by these two flat items. Q-7 locked: flat now; future
  // Slice 2 may collapse into a collapsible group with Audit Log etc.
  { label: 'Admin · Users',     to: '/admin/users',     icon: Users,    requires: 'user:read-list' },
  { label: 'Admin · Employees', to: '/admin/employees', icon: IdCard,   requires: 'master:employees:manage' },
];

/**
 * Returns the subset of nav items the given permissions array unlocks.
 *
 * @param {string[] | undefined | null} permissions
 * @returns {NavItem[]}
 */
export function visibleNavItems(permissions) {
  if (!Array.isArray(permissions) || permissions.length === 0) return [];
  const owned = new Set(permissions);
  return ALL_NAV_ITEMS.filter((item) => owned.has(item.requires));
}
