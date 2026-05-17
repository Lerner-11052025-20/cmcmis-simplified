// ============================================================================
// src/pages/Forbidden.jsx  —  403 page rendered when permission is missing
// ----------------------------------------------------------------------------
// PURPOSE
//   Shown when a user IS authenticated but does NOT hold the permission
//   required by the route they tried to load. We deliberately render
//   this page in-place rather than redirecting — the URL stays so the
//   user can hand it to an admin ("I get a 403 on /admin/users") or
//   retry after a role upgrade.
//
// UX
//   • Quiet card centred in the viewport — no scary stack traces.
//   • Names the missing permission in code style so the admin upgrading
//     the role knows exactly what to grant.
//   • Two CTAs: "Back to dashboard" (primary) and "Sign out" (ghost),
//     because the most common cause of an unexpected 403 is "wrong user
//     signed in on shared workstation".
// ============================================================================

import { Link } from 'react-router-dom';
import { ShieldOff } from 'lucide-react';
import { Button } from '../components/ui/Button.jsx';
import { useAuth } from '../lib/auth-context.jsx';

/**
 * @param {Object} props
 * @param {string} [props.requiredPermission] The permission code that was missing.
 */
export function Forbidden({ requiredPermission }) {
  const { user, logout } = useAuth();

  return (
    <main className="min-h-screen flex items-center justify-center p-8 bg-base">
      <div className="w-full max-w-md bg-white rounded-lg border border-border shadow-card p-8 text-center">
        <ShieldOff
          size={40}
          strokeWidth={1.5}
          className="mx-auto text-danger mb-4"
          aria-hidden="true"
        />

        <h1 className="text-xl font-semibold text-ink">
          403 — Insufficient permissions
        </h1>

        <p className="mt-2 text-sm text-ink-soft">
          You are signed in as{' '}
          <span className="font-medium text-ink">{user?.sub ?? 'anonymous'}</span>
          {user?.role ? <> ({user.role})</> : null}, but this page requires the
          permission:
        </p>

        {requiredPermission ? (
          <code className="inline-block mt-2 px-2 py-1 rounded bg-base-elev text-xs text-ink-soft">
            {requiredPermission}
          </code>
        ) : null}

        <p className="mt-4 text-xs text-ink-soft">
          Ask your Super Admin to grant this permission to your role, or sign in
          as a user who has it.
        </p>

        <div className="mt-6 flex items-center justify-center gap-2">
          <Link to="/dashboard">
            <Button variant="primary">Back to dashboard</Button>
          </Link>
          <Button variant="ghost" onClick={logout}>Sign out</Button>
        </div>
      </div>
    </main>
  );
}
