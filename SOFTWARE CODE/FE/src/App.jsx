// ============================================================================
// src/App.jsx  —  Application root: AuthProvider + Router + Routes
// ----------------------------------------------------------------------------
// COMPOSITION
//   <AuthProvider>            ← owns user state & does mount-time refresh
//     <BrowserRouter>         ← URL ↔ route table
//       <Routes> … </Routes>  ← every page declared here
//     </BrowserRouter>
//   </AuthProvider>
//
// ROUTE TABLE
//
//   /login                — Login (public; auto-redirects if already signed in)
//   /dashboard            — Dashboard (ProtectedRoute, any signed-in user)
//   /equipment            — Phase-5 placeholder (gated by equipment:read-list)
//   /job-requests         — Phase-5 placeholder (gated by job_request:read-own)
//   /job-cards            — Phase-5 placeholder (gated by job_card:read-list)
//   /inquiry              — Phase-6 placeholder (gated by inquiry:search-instruments)
//   /audit                — Phase-8 placeholder (gated by audit_log:read)
//   /admin/users          — Phase-8 placeholder (gated by user:read-list)
//   *                     — Catch-all → /dashboard
//
// PHASE-5+ PLACEHOLDER PAGES
//   Each non-dashboard route renders a minimal <ModulePlaceholder /> inside
//   the same Layout chrome the Dashboard uses. The interesting thing is
//   the ProtectedRoute wrapping — that's what proves authorize on the FE
//   side: a Normal User who manually types /admin/users in the URL bar
//   sees the Forbidden page; a Super Admin sees the placeholder.
// ============================================================================

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import { AuthProvider } from './lib/auth-context.jsx';
import { ProtectedRoute } from './components/ProtectedRoute.jsx';
import { Layout } from './components/Layout.jsx';

import { Login } from './pages/Login.jsx';
import { Dashboard } from './pages/Dashboard.jsx';

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* ── Public ────────────────────────────────────────────── */}
          <Route path="/login" element={<Login />} />

          {/* ── Protected (no extra permission) ───────────────────── */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          {/* ── Protected + permission-gated placeholders (Phase 5+) ─ */}
          <Route
            path="/equipment"
            element={
              <ProtectedRoute requiredPermission="equipment:read-list">
                <Layout>
                  <ModulePlaceholder title="Equipment" phase={5} />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/job-requests"
            element={
              <ProtectedRoute requiredPermission="job_request:read-own">
                <Layout>
                  <ModulePlaceholder title="Job Requests" phase={5} />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/job-cards"
            element={
              <ProtectedRoute requiredPermission="job_card:read-list">
                <Layout>
                  <ModulePlaceholder title="Job Cards" phase={5} />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/inquiry"
            element={
              <ProtectedRoute requiredPermission="inquiry:search-instruments">
                <Layout>
                  <ModulePlaceholder title="Inquiry" phase={6} />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/audit"
            element={
              <ProtectedRoute requiredPermission="audit_log:read">
                <Layout>
                  <ModulePlaceholder title="Audit Log" phase={8} />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute requiredPermission="user:read-list">
                <Layout>
                  <ModulePlaceholder title="Manage Users" phase={8} />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* ── Catch-all ─────────────────────────────────────────── */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

/**
 * Minimal placeholder body for routes whose real implementation arrives
 * in a later phase. Rendered inside the same <Layout> chrome the
 * Dashboard uses, so the user experiences the right shell.
 *
 * @param {Object} props
 * @param {string} props.title
 * @param {number} props.phase
 */
function ModulePlaceholder({ title, phase }) {
  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl font-semibold text-ink">{title}</h2>
      <p className="mt-2 text-sm text-ink-soft">
        This module ships in Phase {phase}. The route, permission gate, and
        layout chrome are already in place — only the page body is
        pending implementation.
      </p>
    </div>
  );
}
