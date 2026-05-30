import { useMemo, useState } from 'react';
import dayjs from 'dayjs';
import {
  Activity,
  Award,
  BadgeCheck,
  Building2,
  CheckCircle2,
  Clipboard,
  Fingerprint,
  History,
  IdCard,
  KeyRound,
  Laptop,
  Mail,
  MapPinned,
  Phone,
  ShieldCheck,
  Sparkles,
  UserRound,
} from 'lucide-react';

import { useAuth } from '../../lib/auth-context.jsx';

const TABS = [
  { key: 'overview', label: 'Overview', icon: UserRound },
  { key: 'records', label: 'Records', icon: IdCard },
  { key: 'security', label: 'Security', icon: ShieldCheck },
];

function initialsOf(source) {
  if (!source) return '--';
  const parts = source.replace(/[^A-Za-z0-9 ]/g, ' ').trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

function humanize(value) {
  if (!value) return '-';
  return String(value)
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function formatDate(value, fallback = 'Not available') {
  if (!value) return fallback;
  return dayjs(typeof value === 'string' ? value.replace('Z', '') : value).format('MMM DD, YYYY - hh:mm A');
}

function roleTone(role) {
  if (role === 'SUPER_ADMIN') return 'bg-rose-50 text-rose-700 border-rose-200';
  if (role === 'NORMAL_USER') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (role === 'VIEW_ONLY') return 'bg-slate-50 text-slate-700 border-slate-200';
  if (role?.includes('IN_CHARGE')) return 'bg-violet-50 text-violet-700 border-violet-200';
  if (role?.includes('ENG')) return 'bg-sky-50 text-sky-700 border-sky-200';
  return 'bg-indigo-50 text-indigo-700 border-indigo-200';
}

function outcomeTone(outcome) {
  if (outcome === 'SUCCESS') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (outcome === 'LOGOUT') return 'bg-sky-50 text-sky-700 border-sky-200';
  if (outcome === 'TOKEN_REFRESH') return 'bg-violet-50 text-violet-700 border-violet-200';
  return 'bg-rose-50 text-rose-700 border-rose-200';
}

function FieldTile({ icon: Icon, label, value, mono = false, onCopy }) {
  return (
    <div className="group rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-600 ring-1 ring-sky-100">
            <Icon size={18} strokeWidth={2.1} />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
            <p className={`mt-1 truncate text-sm font-semibold text-slate-800 ${mono ? 'font-mono' : ''}`}>
              {value || '-'}
            </p>
          </div>
        </div>
        {onCopy ? (
          <button
            type="button"
            onClick={onCopy}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 opacity-0 transition-all hover:bg-slate-50 hover:text-sky-600 group-hover:opacity-100"
            title="Copy"
            aria-label={`Copy ${label}`}
          >
            <Clipboard size={15} strokeWidth={2} />
          </button>
        ) : null}
      </div>
    </div>
  );
}

function StatTile({ label, value, icon: Icon, tone }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
          <p className="mt-1 text-xl font-bold tracking-tight text-slate-900">{value}</p>
        </div>
        <span className={`flex h-11 w-11 items-center justify-center rounded-lg ${tone}`}>
          <Icon size={20} strokeWidth={2.2} />
        </span>
      </div>
    </div>
  );
}

export function Profile() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedAudit, setSelectedAudit] = useState(0);
  const [copied, setCopied] = useState('');

  const profile = useMemo(() => {
    if (!user) return null;
    return {
      employeeId: user.employeeId || user.sub || '-',
      userId: user.userId || user.uid || '-',
      displayName: user.display_name || user.sub || '-',
      designation: user.designation || '-',
      email: user.email || '-',
      role: user.role || '-',
      divisionCode: user.division_code || '-',
      divisionName: user.division_name || '-',
      labPhone: user.lab_phone || '-',
      roomPhone: user.room_phone || '-',
      laneScopes: user.laneScopes || [],
      tokenVersion: user.token_version || 1,
      createdAt: user.created_at || null,
      lastLoginAt: user.last_login_at || null,
      isLocked: Number(user.is_locked || 0),
      isActive: Number(user.is_active || 0),
      loginHistory: user.login_history || [],
      permissionsCount: Array.isArray(user.permissions) ? user.permissions.length : 0,
    };
  }, [user]);

  function copyValue(label, value) {
    if (!value || value === '-') return;
    navigator.clipboard?.writeText(String(value));
    setCopied(label);
    window.setTimeout(() => setCopied(''), 1400);
  }

  if (!profile) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm font-semibold text-slate-500">
        No active user session found. Please log in.
      </div>
    );
  }

  const audit = profile.loginHistory[selectedAudit] || profile.loginHistory[0] || null;
  const accountStatus = profile.isLocked ? 'Locked' : profile.isActive ? 'Active' : 'Secure';

  return (
    <div className="mx-auto max-w-7xl space-y-6 font-sans antialiased">
      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-card">
        <div className="relative bg-slate-950 px-6 py-7 text-white md:px-8">
          <div className="absolute inset-0 opacity-20 technical-grid-bg" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-5">
              <div className="relative">
                <div className="flex h-24 w-24 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-700 text-3xl font-extrabold shadow-lg ring-4 ring-white/10">
                  {initialsOf(profile.displayName)}
                </div>
                <span className="absolute -bottom-2 -right-2 flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500 text-white ring-4 ring-slate-950">
                  <CheckCircle2 size={18} strokeWidth={2.5} />
                </span>
              </div>
              <div>
                <p className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-sky-200">
                  <Sparkles size={14} strokeWidth={2.4} />
                  Digital Identity Profile
                </p>
                <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">{profile.displayName}</h1>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className={`inline-flex rounded-lg border px-3 py-1.5 text-xs font-bold uppercase tracking-wider ${roleTone(profile.role)}`}>
                    {humanize(profile.role)}
                  </span>
                  <span className="inline-flex rounded-lg border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-white/80">
                    {profile.designation}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid min-w-[280px] grid-cols-2 gap-3">
              <div className="rounded-lg border border-white/10 bg-white/10 p-4 backdrop-blur">
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/50">Employee ID</p>
                <p className="mt-1 font-mono text-lg font-bold text-white">{profile.employeeId}</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/10 p-4 backdrop-blur">
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/50">Last Login</p>
                <p className="mt-1 text-sm font-bold text-white">{formatDate(profile.lastLoginAt, 'No login record')}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 bg-slate-50/70 p-4 md:grid-cols-4">
          <StatTile label="Account" value={accountStatus} icon={BadgeCheck} tone="bg-emerald-50 text-emerald-600" />
          <StatTile label="Permissions" value={profile.permissionsCount} icon={KeyRound} tone="bg-sky-50 text-sky-600" />
          <StatTile label="Session Key" value={`V${profile.tokenVersion}`} icon={Fingerprint} tone="bg-violet-50 text-violet-600" />
          <StatTile label="Audit Logs" value={profile.loginHistory.length} icon={History} tone="bg-orange-50 text-orange-600" />
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-bold transition-all ${
                active
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-sky-700'
              }`}
            >
              <Icon size={16} strokeWidth={2.2} />
              {tab.label}
            </button>
          );
        })}
        {copied ? (
          <span className="ml-auto rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">
            Copied {copied}
          </span>
        ) : null}
      </div>

      {activeTab === 'overview' ? (
        <section className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-card">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
                <UserRound size={21} strokeWidth={2.2} />
              </span>
              <div>
                <h2 className="text-lg font-bold tracking-tight text-slate-900">Profile Snapshot</h2>
                <p className="text-xs font-medium text-slate-400">Primary user information from the active session.</p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <FieldTile icon={Mail} label="Email" value={profile.email} onCopy={() => copyValue('email', profile.email)} />
              <FieldTile icon={Award} label="Designation" value={profile.designation} />
              <FieldTile icon={Building2} label="Division Code" value={profile.divisionCode} />
              <FieldTile icon={MapPinned} label="Division Name" value={profile.divisionName} />
              <FieldTile icon={Phone} label="Laboratory Phone" value={profile.labPhone} onCopy={() => copyValue('lab phone', profile.labPhone)} />
              <FieldTile icon={Phone} label="Room Phone" value={profile.roomPhone} onCopy={() => copyValue('room phone', profile.roomPhone)} />
            </div>
          </div>

          <aside className="rounded-lg border border-slate-200 bg-white p-6 shadow-card">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold tracking-tight text-slate-900">Access Scope</h2>
                <p className="text-xs font-medium text-slate-400">Authorized lanes and role boundary.</p>
              </div>
              <ShieldCheck className="text-sky-600" size={24} strokeWidth={2.2} />
            </div>

            <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Current Role</p>
              <p className="mt-1 text-base font-bold text-slate-900">{humanize(profile.role)}</p>
            </div>

            <div className="mt-5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Lane Scopes</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {profile.laneScopes.length > 0 ? (
                  profile.laneScopes.map((scope) => (
                    <span key={scope} className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-violet-700">
                      {scope}
                    </span>
                  ))
                ) : (
                  <span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-500">
                    No scoped lane restriction
                  </span>
                )}
              </div>
            </div>
          </aside>
        </section>
      ) : null}

      {activeTab === 'records' ? (
        <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-card">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <IdCard size={21} strokeWidth={2.2} />
            </span>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-slate-900">Legacy Database Records</h2>
              <p className="text-xs font-medium text-slate-400">Mapped values from employee, user, and section master records.</p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <FieldTile icon={UserRound} label="Full Name" value={profile.displayName} />
            <FieldTile icon={IdCard} label="Employee ID" value={profile.employeeId} mono onCopy={() => copyValue('employee id', profile.employeeId)} />
            <FieldTile icon={Fingerprint} label="User DB ID" value={profile.userId} mono onCopy={() => copyValue('user id', profile.userId)} />
            <FieldTile icon={Mail} label="EMM Email" value={profile.email} />
            <FieldTile icon={Award} label="EMM Designation" value={profile.designation} />
            <FieldTile icon={Building2} label="SM Shortname" value={profile.divisionCode} />
            <FieldTile icon={MapPinned} label="Section Name" value={profile.divisionName} />
            <FieldTile icon={Phone} label="EMM PH1" value={profile.labPhone} />
            <FieldTile icon={Phone} label="EMM PH2" value={profile.roomPhone} />
          </div>
        </section>
      ) : null}

      {activeTab === 'security' ? (
        <section className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-card">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
                  <History size={21} strokeWidth={2.2} />
                </span>
                <div>
                  <h2 className="text-lg font-bold tracking-tight text-slate-900">Session Audit Timeline</h2>
                  <p className="text-xs font-medium text-slate-400">Recent authentication events associated with this user.</p>
                </div>
              </div>
              <span className="rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-indigo-700">
                Session V{profile.tokenVersion}
              </span>
            </div>

            <div className="mt-6 space-y-3">
              {profile.loginHistory.length > 0 ? (
                profile.loginHistory.map((log, index) => {
                  const active = index === selectedAudit;
                  return (
                    <button
                      key={log.audit_id || index}
                      type="button"
                      onClick={() => setSelectedAudit(index)}
                      className={`flex w-full items-center justify-between gap-4 rounded-lg border p-4 text-left transition-all ${
                        active
                          ? 'border-sky-200 bg-sky-50/70 shadow-sm'
                          : 'border-slate-200 bg-white hover:border-sky-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${log.outcome === 'SUCCESS' ? 'bg-emerald-500' : 'bg-sky-500'}`} />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-slate-800">{humanize(log.outcome)}</p>
                          <p className="mt-0.5 text-xs font-medium text-slate-400">{formatDate(log.attempt_at)}</p>
                        </div>
                      </div>
                      <span className={`shrink-0 rounded-lg border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${outcomeTone(log.outcome)}`}>
                        {log.outcome || 'EVENT'}
                      </span>
                    </button>
                  );
                })
              ) : (
                <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm font-semibold text-slate-400">
                  No authentication records found in audit logs.
                </div>
              )}
            </div>
          </div>

          <aside className="rounded-lg border border-slate-200 bg-white p-6 shadow-card">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-900 text-white">
                <Laptop size={21} strokeWidth={2.2} />
              </span>
              <div>
                <h2 className="text-lg font-bold tracking-tight text-slate-900">Selected Event</h2>
                <p className="text-xs font-medium text-slate-400">Audit metadata preview.</p>
              </div>
            </div>

            {audit ? (
              <div className="mt-6 space-y-3">
                <FieldTile icon={Activity} label="Outcome" value={humanize(audit.outcome)} />
                <FieldTile icon={History} label="Attempt Time" value={formatDate(audit.attempt_at)} />
                <FieldTile icon={Laptop} label="IP Address" value={audit.ip_address || '-'} mono />
                <FieldTile icon={Clipboard} label="Notes" value={audit.notes || '-'} />
              </div>
            ) : (
              <div className="mt-6 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-6 text-sm font-semibold text-slate-400">
                Select an audit record to inspect.
              </div>
            )}
          </aside>
        </section>
      ) : null}
    </div>
  );
}
