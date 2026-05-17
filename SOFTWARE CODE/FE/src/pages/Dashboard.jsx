// ============================================================================
// src/pages/Dashboard.jsx  —  Post-login landing page (Phase 4 shell)
// ----------------------------------------------------------------------------
// PURPOSE
//   The first page a signed-in user lands on. In Phase 4 it is
//   intentionally a SHELL — it proves end-to-end auth flow:
//
//     login → JWT → /me → user object → permission-filtered Sidebar
//
//   Phase 5+ replaces this body with real widgets (open job-card count,
//   overdue calibrations, recent activity, etc.). The Layout + Sidebar
//   chrome stays.
//
// WHAT THE PAGE PROVES
//   • Auth context hydrated `user` correctly.
//   • Sidebar renders the right number of items for the user's role.
//   • TopBar shows the role badge + initials.
//   • The collapsible "View permissions" panel is a useful debug aid
//     while building the next modules.
// ============================================================================

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Layout } from '../components/Layout.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { useAuth } from '../lib/auth-context.jsx';

export function Dashboard() {
  const { user } = useAuth();
  const [showPerms, setShowPerms] = useState(false);

  // ProtectedRoute guarantees user is non-null by the time we render here,
  // but defend against the impossible to make linting / future refactors safe.
  if (!user) return null;

  return (
    <Layout>
      {/* Greeting */}
      <div className="max-w-3xl">
        <h2 className="text-2xl font-semibold text-ink">
          Welcome, {user.sub}
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          You are signed in as <Badge color="badge">{user.role}</Badge>.
        </p>

        {/* Quick stats card row — placeholder until Phase 8 wires real metrics */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard label="Permissions" value={user.permissions.length} hint="granted by role" />
          <StatCard label="Role" value={user.role} hint="single role per user" />
          <StatCard label="User ID" value={user.uid} hint="users.user_id in DB" />
        </div>

        {/* Permission inspector — collapsible, useful while we build Phase 5+ modules */}
        <div className="mt-8 bg-white rounded-lg border border-border shadow-card">
          <button
            type="button"
            onClick={() => setShowPerms((v) => !v)}
            aria-expanded={showPerms}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-ink hover:bg-base-elev rounded-lg"
          >
            <span>
              View granted permissions ({user.permissions.length})
            </span>
            {showPerms ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>

          {showPerms ? (
            <div className="px-4 pb-4 pt-1 border-t border-border">
              {user.permissions.length === 0 ? (
                <p className="text-xs text-ink-soft py-2">No permissions on this account.</p>
              ) : (
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs font-mono text-ink-soft py-2">
                  {[...user.permissions].sort().map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}
        </div>

        <p className="mt-8 text-xs text-ink-soft">
          Phase 4 shell — real widgets land in Phase 5 (Equipment), Phase 6 (Job
          Requests / Cards), Phase 8 (Dashboard).
        </p>
      </div>
    </Layout>
  );
}

/**
 * @param {Object} props
 * @param {string}             props.label
 * @param {string | number}    props.value
 * @param {string}             [props.hint]
 */
function StatCard({ label, value, hint }) {
  return (
    <div className="bg-white rounded-lg border border-border shadow-card p-4">
      <div className="text-xs uppercase tracking-wide text-ink-soft">{label}</div>
      <div className="mt-1 text-xl font-semibold text-ink truncate" title={String(value)}>
        {value}
      </div>
      {hint ? <div className="mt-0.5 text-[11px] text-ink-soft">{hint}</div> : null}
    </div>
  );
}
