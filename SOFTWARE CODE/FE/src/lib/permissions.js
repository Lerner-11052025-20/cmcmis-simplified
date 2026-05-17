// ============================================================================
// src/lib/permissions.js  —  Navigation map keyed by permission code
// ----------------------------------------------------------------------------
// PURPOSE
//   Single source of truth for the sidebar navigation. Each entry pairs a
//   route with the PERMISSION CODE that the user must hold to see it.
//   Sidebar.jsx (STEP 8) filters this list via `hasPermission()` from
//   auth-context, so the UI never renders a link the user can't follow.
//
// WHY check permission codes (not roles)?
//   BR-RBAC-03 is the locked rule: never branch on role names. Roles
//   are collections of permissions; checking the role bakes that mapping
//   into UI code and makes future role-permission tweaks a refactor.
//   Permission codes are stable strings that travel inside the JWT —
//   one Array.includes() is all the FE ever has to do.
//
// THE 7 NAV ITEMS (Phase 4 only renders the Dashboard target; the rest
// land as placeholders in Phase 5+)
//   dashboard:view              — every role except VIEW_ONLY
//   equipment:read-list         — every role
//   job_request:read-own        — every role
//   job_card:read-list          — every role except VIEW_ONLY (read-own variant)
//   inquiry:search-instruments  — every role
//   audit_log:read              — SUPER_ADMIN + LAB_IN_CHARGE
//   user:read-list              — SUPER_ADMIN only
// ============================================================================

import {
  LayoutDashboard,
  Wrench,
  FileText,
  ClipboardCheck,
  Search,
  ScrollText,
  Users,
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
  { label: 'Dashboard',    to: '/dashboard',    icon: LayoutDashboard, requires: 'dashboard:view' },
  { label: 'Equipment',    to: '/equipment',    icon: Wrench,          requires: 'equipment:read-list' },
  { label: 'Job Requests', to: '/job-requests', icon: FileText,        requires: 'job_request:read-own' },
  { label: 'Job Cards',    to: '/job-cards',    icon: ClipboardCheck,  requires: 'job_card:read-list' },
  { label: 'Inquiry',      to: '/inquiry',      icon: Search,          requires: 'inquiry:search-instruments' },
  { label: 'Audit Log',    to: '/audit',        icon: ScrollText,      requires: 'audit_log:read' },
  { label: 'Manage Users', to: '/admin/users',  icon: Users,           requires: 'user:read-list' },
];

/**
 * Returns the subset of nav items the given permissions array unlocks.
 * Sidebar.jsx calls this once per render with `user.permissions`.
 *
 * @param {string[] | undefined | null} permissions
 * @returns {NavItem[]}
 */
export function visibleNavItems(permissions) {
  if (!Array.isArray(permissions) || permissions.length === 0) return [];
  const owned = new Set(permissions);
  return ALL_NAV_ITEMS.filter((item) => owned.has(item.requires));
}
