// ============================================================================
// src/components/Sidebar.jsx  —  Left navigation rail
// ----------------------------------------------------------------------------
// LAYOUT
//   w-64 column on the left side of the Dashboard layout. Top: Brand
//   mark + signed-in user identity (employee_id + role pill). Middle:
//   the filtered nav list. Bottom: sign-out ghost button.
//
// PERMISSION FILTERING
//   `visibleNavItems(user.permissions)` returns only the items the user
//   is allowed to follow — so a Normal User never sees "Manage Users"
//   in the menu. The BE *also* gates those routes server-side, so the
//   UI filter is defence in depth, not the security boundary itself.
//
// ACTIVE-LINK STYLING
//   react-router-dom's <NavLink> sets `isActive` automatically when the
//   current route matches the link's `to`. We render the active item in
//   the accent color so the user always knows where they are.
// ============================================================================

import { NavLink, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { LogOut } from 'lucide-react';

import { Brand } from './Brand.jsx';
import { Badge } from './ui/Badge.jsx';
import { Button } from './ui/Button.jsx';
import { useAuth } from '../lib/auth-context.jsx';
import { visibleNavItems } from '../lib/permissions.js';

export function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Anonymous shouldn't see the sidebar at all — ProtectedRoute should
  // have bounced them before we reach this render. Defensive null.
  if (!user) return null;

  const items = visibleNavItems(user.permissions);

  async function handleSignOut() {
    await logout();
    // Replace so the (no-longer-authenticated) dashboard URL isn't in history.
    navigate('/login', { replace: true });
  }

  return (
    <aside
      className="w-64 shrink-0 min-h-screen flex flex-col bg-base-elev border-r border-border"
      aria-label="Primary navigation"
    >
      {/* ── Header: brand + identity ───────────────────────────────── */}
      <div className="px-5 py-5 border-b border-border">
        <Brand size="md" />
        <div className="mt-4">
          <div className="text-sm font-medium text-ink">{user.sub}</div>
          <div className="mt-1">
            <Badge color="badge">{user.role}</Badge>
          </div>
        </div>
      </div>

      {/* ── Nav list ──────────────────────────────────────────────── */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/dashboard'}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors',
                  isActive
                    ? 'bg-accent text-white font-medium'
                    : 'text-ink hover:bg-base hover:text-accent',
                )
              }
            >
              <Icon size={18} strokeWidth={1.5} aria-hidden="true" />
              {item.label}
            </NavLink>
          );
        })}
        {items.length === 0 ? (
          <p className="px-3 py-2 text-xs text-ink-soft">
            No accessible modules. Contact your Super Admin.
          </p>
        ) : null}
      </nav>

      {/* ── Footer: sign out ──────────────────────────────────────── */}
      <div className="p-3 border-t border-border">
        <Button variant="ghost" className="w-full justify-start" onClick={handleSignOut}>
          <LogOut size={16} strokeWidth={1.5} aria-hidden="true" />
          Sign out
        </Button>
      </div>
    </aside>
  );
}
