// ============================================================================
// src/components/TopBar.jsx  —  Sticky page header
// ----------------------------------------------------------------------------
// LAYOUT:
//
//   [☰] [          🔍  Search equipment, job requests, vendors…          ]
//                                                  [🔔]  Name [Role] [👤▾]
//                                                                  │
//                                          (click) ────────────────┘
//                                              ┌────────────────────────┐
//                                              │ Dr. K. Kumar           │
//                                              │ k.kumar@sac.isro.gov.in│
//                                              │ EMG                    │
//                                              ├────────────────────────┤
//                                              │ [→]  Logout            │  ← red
//                                              └────────────────────────┘
//
// FOUR CLUSTERS (post Phase-7 patch, 2026-05-19):
//
//   FAR LEFT — hamburger button that toggles the Sidebar between
//              EXPANDED (w-64, icons + labels) and COLLAPSED (w-16,
//              icons only). State is owned by <Layout>; we render the
//              trigger and call the supplied onToggleSidebar callback.
//
//   LEFT     — global search bar (centered, takes available width).
//              Submitting (Enter) navigates to /inquiry?q=… so the
//              Inquiry module becomes the single source of cross-entity
//              search.
//
//   RIGHT    — bell with unread dot (visual placeholder; backend in P8).
//
//   FAR RIGHT— user cluster: display name + role pill + avatar disc +
//              chevron. Click toggles a dropdown that shows the user's
//              identity card and a red Logout action. Logout calls
//              useAuth().logout() then navigates to /login.
//
// DROPDOWN BEHAVIOUR
//   • Outside-click closes (mousedown listener with a ref check).
//   • Escape closes (window keydown listener).
//   • Resign-on-route-change is unnecessary here — Layout remounts on
//     route change because every route wraps its element in <Layout>.
//
// STICKY + Z-index — header stays visible while main scrolls. The
//   dropdown panel uses z-20 so it covers any sticky content below.
// ============================================================================

import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  ChevronDown,
  LogOut,
  Menu,
  Search as SearchIcon,
  User,
} from 'lucide-react';

import { useAuth } from '../lib/auth-context.jsx';

/**
 * Compute 2-letter initials from a display name or employee_id.
 * "Dr. A. Kumar" → "AK", "SA79900" → "SA".
 * @param {string} source
 */
function initialsOf(source) {
  if (!source) return '··';
  const parts = source.replace(/[^A-Za-z0-9 ]/g, ' ').trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

/**
 * @param {Object} props
 * @param {boolean} [props.collapsed]                Whether sidebar is collapsed.
 * @param {() => void} [props.onToggleSidebar]       Toggle handler from Layout.
 */
export function TopBar({ collapsed = false, onToggleSidebar }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [q, setQ] = useState('');

  // Dropdown open/close state — local to this component, no need to lift.
  const [menuOpen, setMenuOpen] = useState(false);
  // Ref on the wrapper so we can detect "click was outside me".
  const menuRef = useRef(null);

  // Search submit — navigate to /inquiry?q=… (BE wiring in Phase 7).
  function onSearchSubmit(e) {
    e.preventDefault();
    const term = q.trim();
    if (!term) return;
    navigate('/inquiry?q=' + encodeURIComponent(term));
  }

  // ── Close-on-outside-click and close-on-escape ─────────────────────
  // Wired with useEffect so the listeners exist ONLY while the menu is
  // open. Cleaning up on close avoids running the handler 60×/second
  // while the user is doing something unrelated.
  useEffect(() => {
    if (!menuOpen) return undefined;

    function handlePointer(e) {
      // If the click landed inside the menu wrapper, ignore it — the
      // user clicked a dropdown item or the trigger itself.
      if (menuRef.current && menuRef.current.contains(e.target)) return;
      setMenuOpen(false);
    }
    function handleKey(e) {
      if (e.key === 'Escape') setMenuOpen(false);
    }

    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [menuOpen]);

  // ── Logout handler ─────────────────────────────────────────────────
  // Wrapped in useCallback so the function identity is stable across
  // renders (helps if we later memo the dropdown rows).
  //
  // The auth-context.logout() already:
  //   1. POSTs /auth/logout (best-effort; swallowed on failure)
  //   2. Clears the in-memory access + CSRF tokens
  //   3. Sets user = null
  //
  // We follow up by:
  //   4. Closing the dropdown (avoids flash-of-menu after redirect)
  //   5. Navigating to /login with replace:true so the back button
  //      doesn't return to a now-anonymous protected page.
  const handleLogout = useCallback(async () => {
    setMenuOpen(false);
    try {
      await logout();
    } finally {
      // Whether logout's network call succeeded or not, the local state
      // is cleared — push the user to /login regardless.
      navigate('/login', { replace: true });
    }
  }, [logout, navigate]);

  return (
    <header
      className="h-14 shrink-0 sticky top-0 z-10 flex items-center gap-4 px-6 bg-white border-b border-border"
      aria-label="Page header"
    >
      {/* ── Hamburger (sidebar toggle) ──────────────────────────── */}
      {/* The icon stays the same in both states; aria-label changes so
          screen readers announce the right action. */}
      <button
        type="button"
        onClick={onToggleSidebar}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        aria-expanded={!collapsed}
        aria-controls="primary-sidebar"
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className="inline-flex h-9 w-9 items-center justify-center rounded-md text-ink-soft hover:bg-base-elev hover:text-ink transition-colors"
      >
        <Menu size={18} strokeWidth={1.5} aria-hidden="true" />
      </button>

      {/* ── Global search ───────────────────────────────────────── */}
      <form onSubmit={onSearchSubmit} className="flex-1 max-w-3xl">
        <label htmlFor="topbar-search" className="sr-only">Global search</label>
        <div className="relative">
          <SearchIcon
            size={16}
            strokeWidth={1.5}
            aria-hidden="true"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft"
          />
          <input
            id="topbar-search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            type="search"
            placeholder="Search equipment, job requests, vendors…"
            className="w-full h-10 rounded-md bg-base border border-border pl-9 pr-3 text-sm text-ink placeholder:text-ink-soft focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
          />
        </div>
      </form>

      {/* ── Right cluster ───────────────────────────────────────── */}
      <div className="flex items-center gap-4">
        {/* Notifications (visual placeholder — wires up in Phase 8) */}
        <button
          type="button"
          aria-label="Notifications (coming in Phase 8)"
          title="Notifications — coming in Phase 8"
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-md text-ink-soft hover:bg-base-elev hover:text-ink"
        >
          <Bell size={18} strokeWidth={1.5} aria-hidden="true" />
          {/* Unread dot — static placeholder for now */}
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-danger" />
        </button>

        {/* ── User cluster + dropdown ─────────────────────────── */}
        {user ? (
          // Wrapper holds both the trigger button and the dropdown panel,
          // so the outside-click detector treats clicks on dropdown items
          // as "inside".
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label={`Account menu for ${user.display_name || user.sub}`}
              className={clsxCond(
                'flex items-center gap-2 pl-2 pr-1 py-1 rounded-md transition-colors',
                menuOpen
                  ? 'bg-base-elev'
                  : 'hover:bg-base-elev',
              )}
            >
              <div className="text-right leading-tight">
                <div className="text-sm font-medium text-ink truncate max-w-[12rem]">
                  {user.display_name || user.sub}
                </div>
                <div className="mt-0.5">
                  <RolePill role={user.role} />
                </div>
              </div>
              <div
                aria-hidden="true"
                className="h-8 w-8 rounded-full bg-accent/10 text-accent flex items-center justify-center text-xs font-semibold"
                title={user.sub}
              >
                {initialsOf(user.display_name || user.sub)
                  ? (
                      <span>{initialsOf(user.display_name || user.sub)}</span>
                    )
                  : <User size={16} strokeWidth={1.5} />}
              </div>
              <ChevronDown
                size={14}
                strokeWidth={1.5}
                className={clsxCond(
                  'text-ink-soft transition-transform',
                  menuOpen ? 'rotate-180' : 'rotate-0',
                )}
              />
            </button>

            {/* ── Dropdown panel ─────────────────────────────── */}
            {/* Conditionally rendered (not just hidden) so off-state has
                zero DOM weight. Positioned absolutely just below the
                trigger; right-aligned so it never overflows the viewport
                on narrow screens. */}
            {menuOpen ? (
              <div
                role="menu"
                aria-label="Account menu"
                className="absolute right-0 mt-2 w-72 rounded-lg border border-border bg-white shadow-card z-20 overflow-hidden"
              >
                {/* Identity card */}
                <div className="px-4 py-3 border-b border-border">
                  <div className="text-sm font-semibold text-ink truncate">
                    {user.display_name || user.sub}
                  </div>
                  {user.email ? (
                    <div className="mt-0.5 text-xs text-ink-soft truncate">
                      {user.email}
                    </div>
                  ) : null}
                  {/* Division / department line — falls back to the role
                      code if no division is known, so the slot always has
                      content (avoids a tighter card just for SA users). */}
                  <div className="mt-1.5 text-[11px] uppercase tracking-wider text-ink-soft">
                    {user.division_code
                      || user.division
                      || user.designation
                      || roleLabel(user.role)}
                  </div>
                </div>

                {/* Action: Logout (red, full-width, icon on the left) */}
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-danger hover:bg-danger/10 transition-colors"
                >
                  <LogOut size={16} strokeWidth={1.75} aria-hidden="true" />
                  <span>Logout</span>
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </header>
  );
}

// ── Role pill ──────────────────────────────────────────────────────────
// Coloured chip showing the user's role. Colour conveys hierarchy: red
// for Super Admin (highest authority + sensitive), blue for the working
// roles (In-Charge / Engineer), green for the everyday Normal User,
// grey for the read-only auditor. Matches the reference screenshot
// where Dr. K. Kumar (NORMAL_USER) wears the green "User" badge.
function RolePill({ role }) {
  const { label, cls } = rolePillStyle(role);
  return (
    <span
      className={clsxCond(
        'inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium',
        cls,
      )}
    >
      {label}
    </span>
  );
}

function rolePillStyle(role) {
  switch (role) {
    case 'SUPER_ADMIN':
      return { label: 'Admin', cls: 'bg-danger/10 text-danger' };
    case 'LAB_IN_CHARGE':
      return { label: 'Lab InC', cls: 'bg-accent/10 text-accent' };
    case 'LAB_ENGINEER':
      return { label: 'Lab Eng', cls: 'bg-accent/10 text-accent' };
    case 'NORMAL_USER':
      // Tailwind built-in green — sidesteps any custom-palette assumption
      // and matches the reference image's "User" badge.
      return { label: 'User', cls: 'bg-green-100 text-green-700' };
    case 'VIEW_ONLY_USER':
      return { label: 'View', cls: 'bg-gray-100 text-gray-700' };
    default:
      return { label: role || '—', cls: 'bg-gray-100 text-gray-700' };
  }
}

// Friendly short label for the role pill. Falls back to the raw role code.
// Used inside the dropdown's identity card when no division is set.
function roleLabel(role) {
  return rolePillStyle(role).label;
}

// Tiny clsx-shim so we don't have to import the lib just for two calls.
// Joins string fragments with spaces, skipping falsy values.
function clsxCond(...parts) {
  return parts.filter(Boolean).join(' ');
}
