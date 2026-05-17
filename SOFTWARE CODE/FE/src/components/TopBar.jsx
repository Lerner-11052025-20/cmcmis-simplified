// ============================================================================
// src/components/TopBar.jsx  —  Page-header strip above main content
// ----------------------------------------------------------------------------
// LAYOUT
//   56px (h-14) row spanning the content column to the right of the
//   Sidebar. Left: the current page title (auto-derived from the URL
//   against ALL_NAV_ITEMS). Right: the user's role badge and a tiny
//   "avatar" disc with their initials.
//
// WHY auto-derive the title?
//   Saves every page from re-passing the same title prop. ALL_NAV_ITEMS
//   already knows the label for every path, so we look up once per
//   render. For non-nav pages (e.g. an equipment detail page in Phase 5)
//   you can override by passing `title` explicitly.
// ============================================================================

import { useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth-context.jsx';
import { Badge } from './ui/Badge.jsx';
import { ALL_NAV_ITEMS } from '../lib/permissions.js';

/**
 * Compute the two-letter initials from an employee_id like "SA79900".
 * v1 user identities are all uppercase, so first two chars are clean.
 *
 * @param {string} sub
 */
function initialsOf(sub) {
  if (!sub) return '··';
  return sub.slice(0, 2).toUpperCase();
}

/**
 * @param {Object} props
 * @param {string} [props.title]  Override the auto-derived title.
 */
export function TopBar({ title }) {
  const { user } = useAuth();
  const location = useLocation();

  // Auto-derive: find the nav item whose `to` is a prefix of the current
  // path. Fall back to "CMCMIS" if no nav item owns this route.
  const derived = ALL_NAV_ITEMS.find((n) =>
    n.to === '/dashboard'
      ? location.pathname === '/dashboard'
      : location.pathname.startsWith(n.to),
  );
  const resolvedTitle = title || derived?.label || 'CMCMIS';

  return (
    <header
      className="h-14 shrink-0 flex items-center justify-between px-6 bg-white border-b border-border"
      aria-label="Page header"
    >
      <h1 className="text-sm font-semibold text-ink">{resolvedTitle}</h1>

      <div className="flex items-center gap-3">
        {user ? (
          <>
            <Badge color="badge">{user.role}</Badge>
            <div
              aria-label={`Signed in as ${user.sub}`}
              className="h-8 w-8 rounded-full bg-accent/10 text-accent flex items-center justify-center text-xs font-semibold"
            >
              {initialsOf(user.sub)}
            </div>
          </>
        ) : null}
      </div>
    </header>
  );
}
