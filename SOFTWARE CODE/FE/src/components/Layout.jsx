// ============================================================================
// src/components/Layout.jsx  —  Shared post-login application shell
// ----------------------------------------------------------------------------
// Sidebar on the left, sticky TopBar across the content column, scrollable
// <main> below. Pages focus on their content; this component owns structure.
//
// PHASE 7 PATCH (2026-05-19) — collapsible sidebar
//
//   The Sidebar now has two width modes:
//     • EXPANDED  (w-64)   icons + labels
//     • COLLAPSED (w-16)   icons only, labels become hover-tooltips
//
//   The hamburger trigger lives in the TopBar (top-left). Clicking it
//   flips a `collapsed` boolean held HERE in Layout. We pass:
//
//     • `collapsed`              → Sidebar  (so it can re-render at width)
//     • `collapsed` + `onToggle` → TopBar   (so it can render the button
//                                            AND change its aria-label)
//
//   The sidebar width transition is CSS (tailwind's transition-all
//   duration-200 ease-in-out) — no JS animation needed. The main column
//   grows naturally with `flex-1` taking the freed space.
//
//   Persistence: the collapsed flag is written to localStorage under the
//   key `cmcmis.sidebar.collapsed` so a hard refresh remembers the user's
//   preferred mode. We READ from localStorage during state init (lazy
//   initialiser) so the very first paint is correct — no flash from
//   expanded → collapsed on mount.
// ============================================================================

import { useCallback, useEffect, useState } from 'react';

import { Sidebar } from './Sidebar.jsx';
import { TopBar } from './TopBar.jsx';

// Single source of truth for the localStorage key — exported in case a
// future hook (e.g. a "collapse on mobile" effect) wants to write it too.
export const SIDEBAR_COLLAPSED_KEY = 'cmcmis.sidebar.collapsed';

/**
 * Read the persisted collapsed flag. Returns `false` on first visit or
 * when localStorage is unavailable (private mode, blocked storage, SSR).
 * Wrapped in try/catch because some browsers throw on access in incognito.
 */
function readPersistedCollapsed() {
  try {
    return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * @param {Object} props
 * @param {React.ReactNode} props.children
 */
export function Layout({ children }) {
  // Lazy initialiser — readPersistedCollapsed runs ONCE on mount, never
  // on subsequent renders. Without the function-form initialiser React
  // would re-evaluate the call on every render (cheap, but wasteful).
  const [collapsed, setCollapsed] = useState(() => readPersistedCollapsed());

  // Persist on change. Wrapped in try/catch for the same reason as
  // readPersistedCollapsed — a user with blocked storage can still
  // toggle in-memory; we just don't remember it next time.
  useEffect(() => {
    try {
      window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? '1' : '0');
    } catch {
      // intentional swallow — UX continues without persistence
    }
  }, [collapsed]);

  // useCallback gives us a stable function identity so TopBar's memoised
  // children (if any) don't have to re-render just because Layout did.
  const handleToggleSidebar = useCallback(() => {
    setCollapsed((c) => !c);
  }, []);

  return (
    <div className="flex h-full min-h-screen bg-base">
      <Sidebar collapsed={collapsed} onToggle={handleToggleSidebar} />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar collapsed={collapsed} onToggleSidebar={handleToggleSidebar} />
        <main className="flex-1 overflow-auto p-8">{children}</main>
      </div>
    </div>
  );
}
