// ============================================================================
// src/components/Layout.jsx  —  Shared post-login application shell
// ----------------------------------------------------------------------------
// PURPOSE
//   The chrome around every authenticated page: Sidebar on the left,
//   TopBar across the content column, scrollable <main> below. Pages
//   focus on their content; this component owns the structure.
//
// COMPOSITION
//
//     ┌──────────────────────────────────────────────────────────┐
//     │ Sidebar │  ╔═════════ TopBar (h-14) ════════════════════╗ │
//     │  (w-64) │  ╠══════════════════════════════════════════ │ │
//     │         │  ║                                            ║ │
//     │         │  ║    children   (p-8, scrollable)            ║ │
//     │         │  ║                                            ║ │
//     │         │  ╚════════════════════════════════════════════╝ │
//     └──────────────────────────────────────────────────────────┘
// ============================================================================

import { Sidebar } from './Sidebar.jsx';
import { TopBar } from './TopBar.jsx';

/**
 * @param {Object} props
 * @param {React.ReactNode} props.children
 * @param {string}          [props.title]  Override the auto-derived TopBar title.
 */
export function Layout({ children, title }) {
  return (
    <div className="flex h-full min-h-screen bg-base">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar title={title} />
        <main className="flex-1 overflow-auto p-8">{children}</main>
      </div>
    </div>
  );
}
