// ============================================================================
// src/components/Sidebar.jsx  —  ISRO SAC primary navigation (Phase 5 redesign)
// ----------------------------------------------------------------------------
// LAYOUT (matches the reference mockup at SOFTWARE CODE/TECH_DOCX):
//
//   ┌──────────────────┐
//   │ [▣] CMCMIS       │   ← logo + wordmark
//   │     ISRO SAC     │      caption below
//   ├──────────────────┤
//   │ ▢ Dashboard      │
//   │ ▤ Job Requests   │   ← permission-filtered nav
//   │ ▥ Job Cards      │      (active item in accent color)
//   │ 🔧 Equipment     │
//   │ 📅 Schedule      │
//   │ 📦 Procurement   │
//   │ 🔍 Inquiry       │
//   │ 📊 Reports       │
//   │ ⚙ Admin          │
//   ├──────────────────┤
//   │ [×]              │   ← collapse-toggle placeholder (visual only this phase)
//   └──────────────────┘
//
// CHANGES FROM PHASE 4:
//   • Logo block replaces the simple Brand wordmark.
//   • Identity card (employee_id + role pill) MOVED to TopBar.
//   • Sign-out button MOVED to TopBar (Phase 6 will add menu).
//   • Logo asset path: src/assets/isro-sac-logo.svg — gracefully falls back
//     to an Image icon if the SVG is missing.
//
// PERMISSION FILTERING (BR-RBAC-03):
//   visibleNavItems(user.permissions) is the only gate the FE applies.
//   The BE enforces the same gates on every route regardless.
// ============================================================================

import { NavLink } from 'react-router-dom';
import clsx from 'clsx';
import { Image as ImageIcon, X } from 'lucide-react';

import { useAuth } from '../lib/auth-context.jsx';
import { visibleNavItems } from '../lib/permissions.js';

export function Sidebar() {
  const { user } = useAuth();
  if (!user) return null;

  const items = visibleNavItems(user.permissions);

  return (
    <aside
      className="w-64 shrink-0 min-h-screen flex flex-col bg-base-elev border-r border-border"
      aria-label="Primary navigation"
    >
      {/* ── Header: logo + wordmark + caption ───────────────────── */}
      <div className="px-5 py-4 border-b border-border flex items-center gap-3">
        <Logo />
        <div className="leading-tight">
          <div className="text-base font-semibold text-ink">CMCMIS</div>
          <div className="text-[11px] text-ink-soft uppercase tracking-wider">
            ISRO SAC
          </div>
        </div>
      </div>

      {/* ── Nav list ──────────────────────────────────────────── */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {items.length === 0 ? (
          <p className="px-3 py-2 text-xs text-ink-soft">
            No accessible modules. Contact your Super Admin.
          </p>
        ) : (
          items.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/dashboard'}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                    isActive
                      ? 'bg-accent text-white font-medium'
                      : 'text-ink hover:bg-base hover:text-accent',
                  )
                }
              >
                <Icon size={18} strokeWidth={1.5} aria-hidden="true" />
                <span>{item.label}</span>
              </NavLink>
            );
          })
        )}
      </nav>

      {/* ── Footer: collapse placeholder ─────────────────────── */}
      <div className="p-3 border-t border-border">
        <button
          type="button"
          aria-label="Collapse sidebar (coming in Phase 6)"
          title="Collapse sidebar — coming in Phase 6"
          className="inline-flex items-center justify-center h-8 w-8 rounded-md text-ink-soft hover:bg-base hover:text-ink"
        >
          <X size={16} strokeWidth={1.5} />
        </button>
      </div>
    </aside>
  );
}

// ── Logo helper ─────────────────────────────────────────────────────────
// Tries to load the ISRO SAC logo asset; falls back to a Lucide Image icon
// in the accent color if the file is missing. The fallback is intentional —
// it's a single-line refactor to swap in the real SVG when DS adds it.
function Logo() {
  // Vite resolves the URL at build time. If the file is absent the build
  // fails loudly — but ProtectedRoute only renders Sidebar after auth, so
  // we ALSO defensively handle the runtime "image broken" case.
  let src = null;
  try {
    // eslint-disable-next-line global-require
    src = new URL('../assets/isro-sac-logo.svg', import.meta.url).href;
  } catch {
    src = null;
  }
  if (!src) {
    return (
      <div className="h-9 w-9 rounded-md bg-accent/10 text-accent flex items-center justify-center">
        <ImageIcon size={18} strokeWidth={1.5} aria-hidden="true" />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt="ISRO SAC"
      className="h-9 w-9 rounded-md object-contain"
      onError={(e) => {
        e.currentTarget.replaceWith(
          Object.assign(document.createElement('div'), {
            className:
              'h-9 w-9 rounded-md bg-accent/10 text-accent flex items-center justify-center',
            innerHTML: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>',
          }),
        );
      }}
    />
  );
}
