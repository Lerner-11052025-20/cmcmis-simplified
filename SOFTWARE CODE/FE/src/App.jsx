// ============================================================================
// src/App.jsx  —  Application root: AuthProvider + Router + Routes
// ----------------------------------------------------------------------------
// COMPOSITION
//   <AuthProvider>            ← owns user state & does mount-time refresh + /me
//     <BrowserRouter>
//       <Routes> … </Routes>
//     </BrowserRouter>
//   </AuthProvider>
//
// ROUTE TABLE (Phase 5)
//
//   /login                — Login (public; auto-redirects if already signed in)
//   /dashboard            — Dashboard (any signed-in user with dashboard:view)
//   /equipment            — Equipment list — equipment:read-list
//   /equipment/new        — Equipment form — equipment:create
//   /equipment/:id        — Phase-6 placeholder — equipment:read-detail
//   /job-requests         — Phase-5+ placeholder — job_request:read-own
//   /job-cards            — Phase-5+ placeholder — job_card:read-list
//   /schedule             — Phase-7 placeholder — equipment:read-list
//   /procurement          — Phase-7 placeholder — equipment:read-list
//   /inquiry              — Phase-7 placeholder — inquiry:search-instruments
//   /reports              — Phase-8 placeholder — dashboard:view
//   /admin/users          — Phase-8 placeholder — user:read-list
//   /audit                — Phase-8 placeholder — audit_log:read
//   *                     — catch-all → /dashboard
// ============================================================================

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import { AuthProvider } from './lib/auth-context.jsx';
import { ProtectedRoute } from './components/ProtectedRoute.jsx';
import { Layout } from './components/Layout.jsx';

import { Login } from './pages/Login.jsx';
import { Dashboard } from './pages/Dashboard.jsx';
import { InquiryPlaceholder } from './pages/InquiryPlaceholder.jsx';
import { EquipmentList } from './pages/equipment/EquipmentList.jsx';
import { EquipmentForm } from './pages/equipment/EquipmentForm.jsx';
import { EquipmentDetailPlaceholder } from './pages/equipment/EquipmentDetailPlaceholder.jsx';

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* ── Public ─────────────────────────────────────────── */}
          <Route path="/login" element={<Login />} />

          {/* ── Dashboard ──────────────────────────────────────── */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          {/* ── Equipment module (Phase 5 implemented) ─────────── */}
          <Route
            path="/equipment"
            element={
              <ProtectedRoute requiredPermission="equipment:read-list">
                <Layout><EquipmentList /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/equipment/new"
            element={
              <ProtectedRoute requiredPermission="equipment:create">
                <Layout><EquipmentForm /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/equipment/:id"
            element={
              <ProtectedRoute requiredPermission="equipment:read-detail">
                <Layout><EquipmentDetailPlaceholder /></Layout>
              </ProtectedRoute>
            }
          />

          {/* ── Other placeholders (gated routes lock URL surface) ─ */}
          <Route
            path="/job-requests"
            element={
              <ProtectedRoute requiredPermission="job_request:read-own">
                <Layout><ModulePlaceholder title="Job Requests" phase={6} /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/job-cards"
            element={
              <ProtectedRoute requiredPermission="job_card:read-list">
                <Layout><ModulePlaceholder title="Job Cards" phase={6} /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/schedule"
            element={
              <ProtectedRoute requiredPermission="equipment:read-list">
                <Layout><ModulePlaceholder title="Schedule" phase={7} /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/procurement"
            element={
              <ProtectedRoute requiredPermission="equipment:read-list">
                <Layout><ModulePlaceholder title="Procurement" phase={7} /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/inquiry"
            element={
              <ProtectedRoute requiredPermission="inquiry:search-instruments">
                <Layout><InquiryPlaceholder /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute requiredPermission="dashboard:view">
                <Layout><ModulePlaceholder title="Reports" phase={8} /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute requiredPermission="user:read-list">
                <Layout><ModulePlaceholder title="Manage Users" phase={8} /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/audit"
            element={
              <ProtectedRoute requiredPermission="audit_log:read">
                <Layout><ModulePlaceholder title="Audit Log" phase={8} /></Layout>
              </ProtectedRoute>
            }
          />

          {/* ── Catch-all ────────────────────────────────────── */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

/**
 * Generic "this module ships in Phase N" placeholder used inside Layout.
 * @param {Object} props
 * @param {string} props.title
 * @param {number} props.phase
 */
function ModulePlaceholder({ title, phase }) {
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-ink">{title}</h1>
      <p className="mt-2 text-sm text-ink-soft">
        This module ships in Phase {phase}. The route, permission gate, and
        layout chrome are already in place — only the page body is pending
        implementation.
      </p>
    </div>
  );
}
