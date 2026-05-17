// ============================================================================
// src/components/TopBar.jsx  —  Sticky page header (Phase 5 redesign)
// ----------------------------------------------------------------------------
// LAYOUT:
//
//   [          🔍  Search equipment, job requests, vendors…          ]
//                                                  [🔔]  Name [Admin] [👤▾]
//
// THREE CLUSTERS:
//
//   LEFT  — global search bar (centered, takes available width).
//           Submitting (Enter) navigates to /inquiry?q=… so the Inquiry
//           module (Phase 7) becomes the single source of cross-entity
//           search. UI is real; backend wiring lands in Phase 7.
//
//   CENTER— (none — search expands)
//
//   RIGHT — bell with unread dot, user display name + role pill +
//           avatar disc with initials + chevron. The cluster is a button
//           placeholder; the menu (sign out, profile) lands Phase 6.
//
// STICKY + Z-index — header stays visible while main scrolls.
// ============================================================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, ChevronDown, Search as SearchIcon, User } from 'lucide-react';

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

export function TopBar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [q, setQ] = useState('');

  function onSubmit(e) {
    e.preventDefault();
    const term = q.trim();
    if (!term) return;
    navigate('/inquiry?q=' + encodeURIComponent(term));
  }

  return (
    <header
      className="h-14 shrink-0 sticky top-0 z-10 flex items-center gap-4 px-6 bg-white border-b border-border"
      aria-label="Page header"
    >
      {/* ── Global search ───────────────────────────────────────── */}
      <form onSubmit={onSubmit} className="flex-1 max-w-3xl">
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
        {/* Notifications */}
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

        {/* User cluster */}
        {user ? (
          <button
            type="button"
            aria-label={`Signed in as ${user.display_name || user.sub}; account menu coming Phase 6`}
            title="Account menu — coming in Phase 6"
            className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-md hover:bg-base-elev"
          >
            <div className="text-right leading-tight">
              <div className="text-sm font-medium text-ink truncate max-w-[12rem]">
                {user.display_name || user.sub}
              </div>
              <div className="mt-0.5">
                <span className="inline-flex items-center rounded-md bg-danger/10 text-danger px-1.5 py-0.5 text-[10px] font-medium">
                  {roleLabel(user.role)}
                </span>
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
            <ChevronDown size={14} strokeWidth={1.5} className="text-ink-soft" />
          </button>
        ) : null}
      </div>
    </header>
  );
}

// Friendly short label for the role pill. Falls back to the raw role code.
function roleLabel(role) {
  switch (role) {
    case 'SUPER_ADMIN':     return 'Admin';
    case 'LAB_IN_CHARGE':   return 'Lab InC';
    case 'LAB_ENGINEER':    return 'Lab Eng';
    case 'NORMAL_USER':     return 'User';
    case 'VIEW_ONLY_USER':  return 'View';
    default:                return role || '—';
  }
}
