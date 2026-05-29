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
//   • Footer button is now wired — it calls onToggle and shows the right
//     icon depending on state (PanelLeftClose / PanelLeftOpen).
// ============================================================================

import { NavLink } from 'react-router-dom';
import clsx from 'clsx';
import {
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';

import { useAuth } from '../lib/auth-context.jsx';
import { visibleNavItems } from '../lib/permissions.js';

// Meta definitions for semantic navigation grouping
const GROUPS_META = {
  core: { title: 'Core Operations' },
  lab: { title: 'Laboratory' },
  reports: { title: 'Analytics & Reports' },
  admin: { title: 'System Controls' },
};

/**
 * Classifies a navigation item into one of the four groups based on path.
 */
function getGroupForItem(item) {
  const path = item.to;
  if (path === '/dashboard' || path.startsWith('/job-requests') || path === '/conversion' || path.startsWith('/job-cards')) {
    return 'core';
  }
  if (path.startsWith('/equipment') || path === '/schedule' || path === '/inquiry' || path === '/procurement') {
    return 'lab';
  }
  if (path === '/analytics' || path === '/reports') {
    return 'reports';
  }
  if (path.startsWith('/admin') || path === '/audit') {
    return 'admin';
  }
  return 'core';
}

/**
 * Compute initials from a user's display name or email.
 */
function initialsOf(source) {
  if (!source) return '··';
  const parts = source.replace(/[^A-Za-z0-9 ]/g, ' ').trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

/**
 * @param {Object} props
 * @param {boolean} [props.collapsed=false] Render in icons-only mode when true.
 * @param {() => void} [props.onToggle]    Called by the footer collapse button.
 */
export function Sidebar({ collapsed = false, onToggle }) {
  const { user } = useAuth();
  if (!user) return null;

  const items = visibleNavItems(user.permissions, user.role);

  // Group navigation items dynamically
  const groupedItems = items.reduce(
    (acc, item) => {
      const groupKey = getGroupForItem(item);
      acc[groupKey].push(item);
      return acc;
    },
    { core: [], lab: [], reports: [], admin: [] }
  );

  return (
    <aside
      className={clsx(
        'shrink-0 min-h-screen flex flex-col bg-white border-r border-slate-100 shadow-sm z-30',
        'transition-[width] duration-300 ease-in-out',
        collapsed ? 'w-16' : 'w-64',
      )}
      aria-label="Primary navigation"
    >
      {/* ── Header: logo + technical branding ──────────────────── */}
      <div
        className={clsx(
          'border-b border-slate-100 flex flex-col justify-center transition-all duration-300 shrink-0',
          collapsed ? 'px-2 py-5 items-center' : 'px-5 py-5 gap-3.5',
        )}
      >
        <div className="flex items-center gap-3.5">
          <div className="relative group">
            {/* Elegant telemetry glow ring around the logo block */}
            <div className="absolute -inset-0.5 bg-gradient-to-tr from-accent/20 to-accent/0 rounded-lg blur opacity-75 group-hover:opacity-100 transition duration-300"></div>
            <div className="relative h-11 w-11 rounded-lg p-1.5 bg-white border border-slate-100 shadow-sm flex items-center justify-center">
              <Logo />
            </div>
            {/* Technical LED indicator badge */}
            <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-success ring-2 ring-white"></span>
          </div>

          {!collapsed ? (
            <div className="leading-tight">
              <div className="text-sm font-bold text-ink tracking-tight">
                CMCMIS
              </div>
              <div className="text-[10px] font-bold text-ink-soft/75 uppercase tracking-wider mt-0.5">
                ISRO SAC Portal
              </div>
            </div>
          ) : null}
        </div>

        {/* Telemetry live status message */}
        {!collapsed ? (
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-100/50">
            <span className="relative flex h-1.5 w-1.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-success"></span>
            </span>
            <span className="text-[9px] font-bold text-ink-soft/70 tracking-widest uppercase leading-none">
              TELEMETRY: SECURE
            </span>
          </div>
        ) : null}
      </div>

      {/* ── Nav list grouped by module type ────────────────────── */}
      <nav
        className={clsx(
          'flex-1 overflow-y-auto no-scrollbar space-y-4 py-4',
          collapsed ? 'px-1' : 'px-2',
        )}
      >
        {items.length === 0 ? (
          collapsed ? null : (
            <p className="px-4 py-3 text-xs text-ink-soft/80 font-medium text-center bg-slate-50 rounded-xl mx-2">
              No accessible modules.<br />Contact your Super Admin.
            </p>
          )
        ) : (
          Object.keys(GROUPS_META).map((groupKey) => {
            const groupItems = groupedItems[groupKey] || [];
            if (groupItems.length === 0) return null;

            return (
              <div key={groupKey} className="space-y-1">
                {/* Group subheader */}
                {!collapsed ? (
                  <div className="px-4 pt-3 pb-1.5 flex items-center gap-2 select-none">
                    {/* Small technical highlight dot */}
                    <span className="h-1.5 w-1.5 rounded-full bg-sky-400 shrink-0"></span>
                    <span className="text-[11px] font-bold text-slate-500 tracking-wide font-sans">
                      {GROUPS_META[groupKey].title}
                    </span>
                    {/* Fine light highlighter line */}
                    <span className="flex-1 h-[1px] bg-slate-100/70 ml-1"></span>
                  </div>
                ) : (
                  // Inline group divider in collapsed mode
                  <div className="mx-2 my-2 border-t border-slate-100/80" />
                )}

                <div className="space-y-0.5">
                  {groupItems.map((item) => {
                    const Icon = item.icon;
                    // Strip visual prefix "Admin · "
                    const cleanLabel = item.label.replace(/^Admin\s*·\s*/i, '');
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.to === '/dashboard'}
                        title={item.label}
                        className={({ isActive }) =>
                          clsx(
                            'group relative flex items-center rounded-xl text-xs transition-all duration-200 font-medium border border-transparent',
                            collapsed
                              ? 'justify-center h-10 w-11 mx-auto'
                              : 'gap-3 px-3 py-2.5 mx-2',
                            isActive
                              ? 'bg-sky-50 text-sky-700 border-sky-100/50 shadow-sm font-semibold'
                              : 'text-ink-soft hover:bg-sky-50/30 hover:text-sky-600 hover:border-sky-100/20',
                          )
                        }
                      >
                        {({ isActive }) => (
                          <>
                            {/* Premium Left Capsule Active Indicator - sky-500 matching sky-50 active badge */}
                            {isActive && (
                              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.5)] animate-fadeIn" />
                            )}
                            <Icon
                              size={16}
                              strokeWidth={isActive ? 2 : 1.5}
                              className={clsx(
                                'transition-all duration-200 shrink-0',
                                isActive
                                  ? 'text-sky-700 scale-105'
                                  : 'text-ink-soft group-hover:text-sky-600 group-hover:scale-105 group-hover:translate-x-[1px]',
                              )}
                              aria-hidden="true"
                            />
                            {!collapsed ? (
                              <span className="transition-all duration-200 truncate">
                                {cleanLabel}
                              </span>
                            ) : null}
                          </>
                        )}
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </nav>

      {/* ── User Profile Card: Emp ID & Email only ────────────── */}
      {!collapsed ? (
        <div className="mt-auto border-t border-slate-100 p-3.5 shrink-0 transition-all duration-300 animate-fadeIn">
          <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl leading-normal text-[11px] font-sans">
            <div className="flex justify-between items-center gap-2">
              <span className="text-[10px] font-bold text-ink-soft/60 uppercase tracking-wider">Emp ID</span>
              <span className="text-sky-700 font-bold tracking-tight text-[11px]">{user.sub}</span>
            </div>
            <div className="text-ink-soft/85 truncate mt-1 text-[10px]" title={user.email}>
              {user.email || 'no-email@sac.isro.gov.in'}
            </div>
          </div>
        </div>
      ) : null}

      {/* ── Footer: collapse / expand trigger ─────────────────── */}
      <div
        className={clsx(
          'border-t border-slate-100 shrink-0',
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
            'inline-flex items-center justify-center h-9 rounded-xl text-ink-soft hover:bg-slate-50 hover:text-ink border border-transparent hover:border-slate-100 transition-all duration-200 font-medium',
            collapsed ? 'w-9' : 'w-full gap-2 px-3 text-xs',
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
function Logo() {
  const src = new URL('../assets/isro-logo.svg', import.meta.url).href;
  return (
    <img
      src={src}
      alt="ISRO SAC Logo"
      className="h-full w-full object-contain"
    />
  );
}
