// ============================================================================
// src/components/ProtectedRoute.jsx  —  Route guard
// ----------------------------------------------------------------------------
// PURPOSE
//   Wraps a route element. Three possible outcomes:
//
//     1. AuthProvider is still doing its mount-time silent refresh
//        (loading=true) — render a centered Spinner. We MUST NOT bounce
//        the user to /login while loading; that would race the refresh
//        and produce a flash of "/login → /dashboard" navigation.
//
//     2. No user after loading completes → <Navigate to="/login" replace />
//        with `state.from` so Login.jsx can bounce back after success.
//
//     3. User present + (optional) permission held → render children.
//
//     4. User present + permission MISSING → render <Forbidden /> in
//        place of the page (NOT a redirect — we want the URL to stay so
//        the user can copy/paste it after their role is upgraded).
//
// USAGE
//
//     <Route path="/dashboard" element={
//       <ProtectedRoute>
//         <Dashboard />
//       </ProtectedRoute>
//     } />
//
//     <Route path="/admin/users" element={
//       <ProtectedRoute requiredPermission="user:read-list">
//         <ManageUsers />
//       </ProtectedRoute>
//     } />
// ============================================================================

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth-context.jsx';
import { Spinner } from './ui/Spinner.jsx';
import { Forbidden } from '../pages/Forbidden.jsx';

/**
 * @param {Object} props
 * @param {React.ReactNode} props.children
 * @param {string} [props.requiredPermission] Permission code that must be held.
 */
export function ProtectedRoute({ children, requiredPermission }) {
  const { user, loading, hasPermission } = useAuth();
  const location = useLocation();

  // ── 1. Still hydrating ───────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size={28} className="text-ink-soft" />
      </div>
    );
  }

  // ── 2. Anonymous — bounce to login, remember where they were headed ──
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // ── 3. Permission check (optional) ───────────────────────────────────
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <Forbidden requiredPermission={requiredPermission} />;
  }

  // ── 4. All good — render the protected element ───────────────────────
  return children;
}
