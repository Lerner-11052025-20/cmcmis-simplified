// ============================================================================
// src/pages/profile/Profile.jsx  —  User Profile Dashboard
// ----------------------------------------------------------------------------
// PHASE 15 — User Profile Module
//
// Presents detailed information from legacy database tables (cmms_emp_mst,
// cmms_section_mst, users, and login_audit) fetched read-only in real-time
// from the enriched /me endpoint.
//
// Upgraded to feature:
//   1. Removal of the RBAC Clearance list.
//   2. Live "Access History & Session Audits" timeline sourced from login_audit.
//   3. Upscaled typography using 100% Inter font family, customized
//      large-readable sizes, and premium small-caps first-letter-capital titles.
// ============================================================================

import { useMemo } from 'react';
import dayjs from 'dayjs';
import { useAuth } from '../../lib/auth-context.jsx';
import {
  User,
  Mail,
  Phone,
  Shield,
  Building,
  CheckCircle2,
  Hash,
  Terminal,
  Activity,
  Award,
  Lock,
  History,
  Laptop
} from 'lucide-react';

/**
 * Compute initials from display name or employee id.
 */
function initialsOf(source) {
  if (!source) return '··';
  const parts = source.replace(/[^A-Za-z0-9 ]/g, ' ').trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

/**
 * Returns a cohesive custom style class for the user's role.
 */
function getRoleBadgeStyle(role) {
  switch (role) {
    case 'SUPER_ADMIN':
      return 'bg-rose-50 border-rose-200 text-rose-600 shadow-sm shadow-rose-100/50';
    case 'LAB_IN_CHARGE':
    case 'LAB_ENGINEER':
      return 'bg-indigo-50 border-indigo-200 text-indigo-600 shadow-sm shadow-indigo-100/50';
    case 'NORMAL_USER':
      return 'bg-emerald-50 border-emerald-200 text-emerald-600 shadow-sm shadow-emerald-100/50';
    case 'VIEW_ONLY':
      return 'bg-slate-50 border-slate-200 text-slate-600 shadow-sm';
    default:
      if (role?.includes('IN_CHARGE')) {
        return 'bg-violet-50 border-violet-200 text-violet-600 shadow-sm';
      }
      if (role?.includes('ENG')) {
        return 'bg-blue-50 border-blue-200 text-blue-600 shadow-sm';
      }
      return 'bg-slate-50 border-slate-200 text-slate-600';
  }
}

/**
 * Dynamic humanized title for the role.
 */
function humanizedRole(role) {
  if (!role) return '—';
  return role
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Style classes for authentication audit log outcomes.
 */
function getOutcomeBadgeStyle(outcome) {
  switch (outcome) {
    case 'SUCCESS':
      return 'bg-emerald-50 border-emerald-200 text-emerald-600';
    case 'LOGOUT':
      return 'bg-sky-50 border-sky-200 text-sky-600';
    case 'TOKEN_REFRESH':
      return 'bg-violet-50 border-violet-200 text-violet-600';
    default:
      return 'bg-rose-50 border-rose-200 text-rose-600';
  }
}

function humanizedOutcome(outcome) {
  if (!outcome) return '—';
  return outcome
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export function Profile() {
  const { user } = useAuth();

  // Hydrate user data safely with defaults
  const profile = useMemo(() => {
    if (!user) return null;
    return {
      employeeId: user.employeeId || user.sub || '—',
      userId: user.userId || user.uid || '—',
      displayName: user.display_name || user.sub || '—',
      designation: user.designation || '—',
      email: user.email || '—',
      role: user.role || '—',
      divisionCode: user.division_code || '—',
      divisionName: user.division_name || '—',
      labPhone: user.lab_phone || '—',
      roomPhone: user.room_phone || '—',
      laneScopes: user.laneScopes || [],
      tokenVersion: user.token_version || 1,
      createdAt: user.created_at || null,
      lastLoginAt: user.last_login_at || null,
      isLocked: user.is_locked || 0,
      isActive: user.is_active || 0,
      loginHistory: user.login_history || [],
    };
  }, [user]);

  if (!profile) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-500 font-sans font-semibold text-sm">
        No active user session found. Please log in.
      </div>
    );
  }

  return (
    <div className="space-y-8 font-sans antialiased max-w-7xl mx-auto px-1">
      {/* ── Page Header ── */}
      <div>
        <span className="text-[11px] font-bold text-indigo-500 uppercase tracking-widest block mb-1.5">
          System Access Controls
        </span>
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight leading-none font-sans">
          My Profile
        </h1>
        <p className="mt-2.5 text-sm text-slate-500 font-medium font-sans">
          Detailed digital profile, legacy database parameters, and live session authentication audits.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* ── Left Overview Card ── */}
        <div className="lg:col-span-1 space-y-8">
          <div className="bg-white rounded-2xl border border-slate-200/70 shadow-card overflow-hidden">
            {/* Elegant Header Banner */}
            <div className="h-28 bg-gradient-to-r from-indigo-500 via-indigo-600 to-violet-600 relative overflow-hidden flex items-end px-6 pb-4">
              <div className="absolute inset-0 opacity-15 technical-grid-bg"></div>
              {/* Telemetry secure signal pill inside the card */}
              <div className="absolute top-5 right-5 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 backdrop-blur-md border border-white/20 select-none">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-[9px] font-bold text-white tracking-wider uppercase">ACTIVE</span>
              </div>
            </div>

            {/* Avatar block with negative margin to overlap the banner */}
            <div className="px-6 pb-8 relative flex flex-col items-center text-center">
              <div className="h-24 w-24 rounded-2xl bg-white p-1 border-2 border-white -mt-12 shadow-lg relative">
                <div className="h-full w-full rounded-xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-600 text-white flex items-center justify-center text-2xl font-bold">
                  {initialsOf(profile.displayName)}
                </div>
              </div>

              {/* Display name and basic roles */}
              <div className="mt-5">
                <h2 className="text-xl font-bold text-slate-800 tracking-tight leading-snug truncate max-w-[240px]">
                  {profile.displayName}
                </h2>
                <p className="text-xs font-bold text-slate-400 mt-1.5 uppercase tracking-wider">
                  {profile.designation}
                </p>
              </div>

              {/* Outlined Role Badge */}
              <div className="mt-5 flex justify-center">
                <span className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider ${getRoleBadgeStyle(profile.role)}`}>
                  <Shield size={14} strokeWidth={2.5} />
                  {humanizedRole(profile.role)}
                </span>
              </div>

              <hr className="w-full border-slate-100 my-6" />

              {/* Quick telemetry parameters list */}
              <div className="w-full space-y-4 text-left text-sm font-semibold text-slate-600">
                <div className="flex justify-between items-center gap-2">
                  <span className="text-slate-400 flex items-center gap-2 uppercase text-[10px] tracking-wider font-bold">
                    <Hash size={15} className="text-slate-400/80" /> Employee ID
                  </span>
                  <span className="text-indigo-600 font-bold tracking-tight">{profile.employeeId}</span>
                </div>
                <div className="flex justify-between items-center gap-2">
                  <span className="text-slate-400 flex items-center gap-2 uppercase text-[10px] tracking-wider font-bold">
                    <Terminal size={15} className="text-slate-400/80" /> User DB ID
                  </span>
                  <span className="text-slate-700 font-mono tracking-tight">{profile.userId}</span>
                </div>
                <div className="flex justify-between items-center gap-2">
                  <span className="text-slate-400 flex items-center gap-2 uppercase text-[10px] tracking-wider font-bold">
                    <Activity size={15} className="text-slate-400/80" /> Account Status
                  </span>
                  <span className="text-emerald-500 flex items-center gap-1.5 leading-none uppercase text-[10px] font-bold">
                    <CheckCircle2 size={13} strokeWidth={2.5} /> Secure
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right Detailed Information Grid ── */}
        <div className="lg:col-span-2 space-y-8">
          {/* Card 1: Legacy Database Parameters (cmms_emp_mst + cmms_section_mst) */}
          <div className="bg-white rounded-2xl border border-slate-200/70 shadow-card p-6 md:p-8 space-y-7">
            <div>
              <h3 className="text-base font-bold text-slate-800 tracking-tight flex items-center gap-2.5">
                <Building size={18} className="text-indigo-500" strokeWidth={2.5} />
                Legacy Database Details
              </h3>
              <p className="text-xs text-slate-400 font-medium mt-1">
                Enriched master parameters from ISRO SAC cmms_emp_mst & cmms_section_mst systems.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
              {/* Field 1: Name */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Full Name (EMM_NAME)</span>
                <div className="px-4 py-3 rounded-xl border border-slate-100 bg-slate-50/40 text-sm font-semibold text-slate-700">
                  {profile.displayName}
                </div>
              </div>

              {/* Field 2: Email */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Email Address (EMM_EMAIL)</span>
                <div className="px-4 py-3 rounded-xl border border-slate-100 bg-slate-50/40 text-sm font-semibold text-slate-700 flex items-center gap-2.5">
                  <Mail size={15} className="text-slate-400 shrink-0" />
                  <span className="truncate">{profile.email}</span>
                </div>
              </div>

              {/* Field 3: Designation */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Designation (EMM_DESIGNATION)</span>
                <div className="px-4 py-3 rounded-xl border border-slate-100 bg-slate-50/40 text-sm font-semibold text-slate-700 flex items-center gap-2.5">
                  <Award size={15} className="text-slate-400 shrink-0" />
                  <span>{profile.designation}</span>
                </div>
              </div>

              {/* Field 4: Division Code */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Division / Dept (SM_SHORTNAME)</span>
                <div className="px-4 py-3 rounded-xl border border-slate-100 bg-slate-50/40 text-sm font-semibold text-slate-700">
                  {profile.divisionCode ? `${profile.divisionCode} (${profile.divisionName || 'No Name'})` : '—'}
                </div>
              </div>

              {/* Field 5: Lab Phone */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Laboratory Phone (EMM_PH1)</span>
                <div className="px-4 py-3 rounded-xl border border-slate-100 bg-slate-50/40 text-sm font-semibold text-slate-700 flex items-center gap-2.5">
                  <Phone size={15} className="text-slate-400 shrink-0" />
                  <span>{profile.labPhone || '—'}</span>
                </div>
              </div>

              {/* Field 6: Room Phone */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Room / Office Phone (EMM_PH2)</span>
                <div className="px-4 py-3 rounded-xl border border-slate-100 bg-slate-50/40 text-sm font-semibold text-slate-700 flex items-center gap-2.5">
                  <Phone size={15} className="text-slate-400 shrink-0" />
                  <span>{profile.roomPhone || '—'}</span>
                </div>
              </div>
            </div>

            {/* Lane Scopes Subsection */}
            {profile.laneScopes.length > 0 && (
              <div className="pt-3 border-t border-slate-100/60">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Authorized Lane Scopes</span>
                <div className="flex flex-wrap gap-2">
                  {profile.laneScopes.map((scope) => (
                    <span
                      key={scope}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-violet-50/80 border border-violet-100 text-violet-600"
                    >
                      {scope}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Card 2: Access History & Session Audits (sourced from login_audit + users) */}
          <div className="bg-white rounded-2xl border border-slate-200/70 shadow-card p-6 md:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-800 tracking-tight flex items-center gap-2.5">
                  <History size={18} className="text-indigo-500" strokeWidth={2.5} />
                  Access History & Session Audits
                </h3>
                <p className="text-xs text-slate-400 font-medium mt-1">
                  Real-time authentication records and session indexes retrieved from database logs.
                </p>
              </div>

              {/* Token Version / Session index indicator */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-indigo-100 bg-indigo-50/40">
                <Lock size={13} className="text-indigo-500" strokeWidth={2} />
                <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider">Session Key V{profile.tokenVersion}</span>
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* Live Database Login History Timeline */}
            {profile.loginHistory.length === 0 ? (
              <div className="py-8 text-center text-xs font-semibold text-slate-400">
                No authentication records found in system audits logs.
              </div>
            ) : (
              <div className="space-y-4">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Recent Login Logs</span>
                <div className="divide-y divide-slate-100/80">
                  {profile.loginHistory.map((log, idx) => (
                    <div
                      key={log.audit_id || idx}
                      className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-semibold"
                    >
                      {/* Left side: Outcome badge + time */}
                      <div className="flex items-center gap-3">
                        <span className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${getOutcomeBadgeStyle(log.outcome)}`}>
                          {humanizedOutcome(log.outcome)}
                        </span>
                        <span className="text-slate-500 font-medium">
                          {log.attempt_at ? dayjs(log.attempt_at).format('MMM DD, YYYY · hh:mm A') : '—'}
                        </span>
                      </div>

                      {/* Right side: IP address and Agent notes */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {log.ip_address && (
                          <span className="px-2 py-0.5 rounded-md border border-slate-200 bg-slate-50 text-[10px] font-mono text-slate-500 flex items-center gap-1 leading-none shadow-sm">
                            <Laptop size={10} className="text-slate-400" />
                            {log.ip_address}
                          </span>
                        )}
                        {log.notes && (
                          <span className="text-slate-400 font-medium text-[11px] italic">
                            ({log.notes})
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
