// ============================================================================
// src/components/Sidebar.jsx  —  ISRO SAC primary navigation
// ----------------------------------------------------------------------------
// LAYOUT (EXPANDED — w-64):
//
//   ┌──────────────────┐
//   │ [▣] CMCMIS       │   ← logo + wordmark
//   │     ISRO SAC     │      caption below
//   ├──────────────────┤
//   │ ▢ Dashboard      │
//   │ ▤ Job Requests   │   ← permission-filtered nav
//   │ ▥ Job Cards      │      (active item in accent color)
//   │ 🔧 Equipment     │
//   │ 🔍 Inquiry       │
//   │ ⚙ Admin          │
//   ├──────────────────┤
//   │ [«] Collapse     │   ← collapse trigger (mirrors TopBar hamburger)
//   └──────────────────┘
//
// LAYOUT (COLLAPSED — w-16):
//
//   ┌────┐
//   │ ▣  │       ← logo only
//   ├────┤
//   │ ▢  │       ← icons centred, label is `title` tooltip
//   │ ▤  │
//   │ ▥  │       ← active item still highlighted in accent
//   │ 🔧 │
//   │ 🔍 │
//   │ ⚙  │
//   ├────┤
//   │ »  │       ← expand trigger
//   └────┘
//
// PHASE 7 PATCH (2026-05-19)
//   • Accept `collapsed` + `onToggle` props from Layout.
//   • Switch width between w-64 and w-16 with a CSS transition.
//   • In collapsed mode: hide labels, centre icons, surface labels as
//     hover tooltips via the native `title` attribute (zero JS cost).
//   • Footer button is now wired — it calls onToggle and shows the right
//     icon depending on state (PanelLeftClose / PanelLeftOpen).
//
// PERMISSION FILTERING (BR-RBAC-03):
//   visibleNavItems(user.permissions) is the only gate the FE applies.
//   The BE enforces the same gates on every route regardless.
// ============================================================================

import { NavLink } from 'react-router-dom';
import clsx from 'clsx';
import {
  Image as ImageIcon,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';

import { useAuth } from '../lib/auth-context.jsx';
import { visibleNavItems } from '../lib/permissions.js';

/**
 * @param {Object} props
 * @param {boolean} [props.collapsed=false] Render in icons-only mode when true.
 * @param {() => void} [props.onToggle]    Called by the footer collapse button.
 */
export function Sidebar({ collapsed = false, onToggle }) {
  const { user } = useAuth();
  if (!user) return null;

  const items = visibleNavItems(user.permissions);

  return (
    <aside
      // Width is the only thing that changes between the two modes — letting
      // CSS do the work keeps the toggle smooth and means we don't have to
      // remount the nav items (NavLink active state stays intact).
      className={clsx(
        'shrink-0 min-h-screen flex flex-col bg-base-elev border-r border-border',
        'transition-[width] duration-200 ease-in-out',
        collapsed ? 'w-16' : 'w-64',
      )}
      aria-label="Primary navigation"
    >
      {/* ── Header: logo + (conditionally) wordmark ─────────────── */}
      <div
        className={clsx(
          'border-b border-border flex items-center',
          collapsed ? 'justify-center px-2 py-4' : 'px-5 py-4 gap-3',
        )}
      >
        <Logo />
        {/* The wordmark disappears in collapsed mode. Using a conditional
            render (vs. visibility:hidden) means the flex layout can shrink
            cleanly without a phantom-width gap. */}
        {!collapsed ? (
          <div className="leading-tight">
            <div className="text-base font-semibold text-ink">CMCMIS</div>
            <div className="text-[11px] text-ink-soft uppercase tracking-wider">
              ISRO SAC
            </div>
          </div>
        ) : null}
      </div>

      {/* ── Nav list ──────────────────────────────────────────── */}
      <nav
        className={clsx(
          'flex-1 overflow-y-auto space-y-1',
          collapsed ? 'p-2' : 'p-3',
        )}
      >
        {items.length === 0 ? (
          // Friendly empty state — only shown to the unusual case of a
          // signed-in user with zero permissions. Hidden completely in
          // collapsed mode to avoid a cluttered icon strip.
          collapsed ? null : (
            <p className="px-3 py-2 text-xs text-ink-soft">
              No accessible modules. Contact your Super Admin.
            </p>
          )
        ) : (
          items.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/dashboard'}
                // `title` doubles as the hover tooltip in collapsed mode.
                // Always set, so keyboard navigators get a screen-reader hint
                // even when the visible label is showing.
                title={item.label}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center rounded-md text-sm transition-colors',
                    collapsed
                      ? 'justify-center h-10 w-12 mx-auto'
                      : 'gap-3 px-3 py-2',
                    isActive
                      ? 'bg-accent text-white font-medium'
                      : 'text-ink hover:bg-base hover:text-accent',
                  )
                }
              >
                <Icon size={18} strokeWidth={1.5} aria-hidden="true" />
                {/* Label disappears in collapsed mode — `title` keeps a11y
                    intact via the hover/focus tooltip. */}
                {!collapsed ? <span>{item.label}</span> : null}
              </NavLink>
            );
          })
        )}
      </nav>

      {/* ── Footer: collapse / expand trigger ─────────────────── */}
      <div
        className={clsx(
          'border-t border-border',
          collapsed ? 'p-2 flex justify-center' : 'p-3',
        )}
      >
        <button
          type="button"
          onClick={onToggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!collapsed}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={clsx(
            'inline-flex items-center justify-center h-8 rounded-md text-ink-soft hover:bg-base hover:text-ink transition-colors',
            collapsed ? 'w-8' : 'w-full gap-2 px-3 text-xs',
          )}
        >
          {collapsed ? (
            <PanelLeftOpen size={16} strokeWidth={1.5} />
          ) : (
            <>
              <PanelLeftClose size={16} strokeWidth={1.5} />
              <span>Collapse</span>
            </>
          )}
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
