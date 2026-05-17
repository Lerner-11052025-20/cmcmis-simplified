// ============================================================================
// src/components/Layout.jsx  —  Shared post-login application shell
// ----------------------------------------------------------------------------
// Sidebar on the left, sticky TopBar across the content column, scrollable
// <main> below. Pages focus on their content; this component owns structure.
//
// Phase-5 redesign change: TopBar no longer accepts a `title` prop —
// the new TopBar is a global search + notifications + user cluster. The
// per-page <h2> title lives inside each page now.
// ============================================================================

import { Sidebar } from './Sidebar.jsx';
import { TopBar } from './TopBar.jsx';

/**
 * @param {Object} props
 * @param {React.ReactNode} props.children
 */
export function Layout({ children }) {
  return (
    <div className="flex h-full min-h-screen bg-base">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <main className="flex-1 overflow-auto p-8">{children}</main>
      </div>
    </div>
  );
}
