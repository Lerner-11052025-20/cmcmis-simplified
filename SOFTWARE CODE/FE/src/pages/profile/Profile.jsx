import { useMemo, useState } from 'react';
import dayjs from 'dayjs';
import {
  Activity,
  BadgeCheck,
  Building2,
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
  UserRound,
} from 'lucide-react';
import clsx from 'clsx';

import { useAuth } from '../../lib/auth-context.jsx';

const TABS = [
  { key: 'overview', label: 'Overview', icon: UserRound },
  { key: 'access', label: 'Access', icon: ShieldCheck },
  { key: 'security', label: 'Security', icon: History },
];

function initialsOf(value) {
  if (!value) return '--';
  const parts = String(value).replace(/[^A-Za-z0-9 ]/g, ' ').trim().split(/\s+/);
  if (parts.length > 1) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return String(value).slice(0, 2).toUpperCase();
}

function humanize(value) {
  if (!value) return '-';
  return String(value)
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
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

function InfoTile({ icon: Icon, label, value, onCopy, mono = false }) {
  return (
    <div className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-card transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <Icon size={20} strokeWidth={2.1} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-500">{label}</p>
            <p className={clsx('mt-1 truncate text-base font-semibold text-slate-950', mono && 'font-mono')}>
              {value || '-'}
            </p>
          </div>
        </div>
        {onCopy ? (
          <button
            type="button"
            onClick={onCopy}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 opacity-0 transition hover:bg-slate-50 hover:text-indigo-600 group-hover:opacity-100"
            title="Copy"
            aria-label={`Copy ${label}`}
          >
            <Clipboard size={16} />
          </button>
        ) : null}
      </div>
    </div>
  );
}

function Metric({ label, value, icon: Icon, tone }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-semibold text-slate-950">{value}</p>
        </div>
        <span className={clsx('flex h-11 w-11 items-center justify-center rounded-xl', tone)}>
          <Icon size={21} />
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
      lastLoginAt: user.last_login_at || null,
      createdAt: user.created_at || null,
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
      <div className="flex min-h-[50vh] items-center justify-center rounded-2xl border border-slate-200 bg-white text-sm font-medium text-slate-500">
        No active user session found. Please log in.
      </div>
    );
  }

  const audit = profile.loginHistory[selectedAudit] || profile.loginHistory[0] || null;
  const accountStatus = profile.isLocked ? 'Locked' : profile.isActive ? 'Active' : 'Secure';

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
        <div className="grid gap-0 lg:grid-cols-[1fr_360px]">
          <div className="p-6 md:p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="relative">
                <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-500 via-blue-600 to-sky-500 text-3xl font-semibold text-white shadow-lg">
                  {initialsOf(profile.displayName)}
                </div>
                <span className="absolute -bottom-2 -right-2 flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-500 text-white ring-4 ring-white">
                  <BadgeCheck size={19} strokeWidth={2.4} />
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-indigo-600">Signed-in identity</p>
                <h1 className="mt-1 truncate text-3xl font-semibold text-slate-950 md:text-4xl">{profile.displayName}</h1>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className={clsx('rounded-full border px-3 py-1.5 text-sm font-medium', roleTone(profile.role))}>
                    {humanize(profile.role)}
                  </span>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-700">
                    {profile.designation}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200 bg-slate-50 p-6 lg:border-l lg:border-t-0">
            <p className="text-sm font-medium text-slate-500">Last activity</p>
            <p className="mt-2 text-lg font-semibold text-slate-950">{formatDate(profile.lastLoginAt, 'No login record')}</p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-sm text-slate-500">Employee ID</p>
                <p className="mt-1 font-mono text-sm font-semibold text-slate-950">{profile.employeeId}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-sm text-slate-500">Session</p>
                <p className="mt-1 text-sm font-semibold text-slate-950">Version {profile.tokenVersion}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-4">
        <Metric label="Account" value={accountStatus} icon={BadgeCheck} tone="bg-emerald-50 text-emerald-600" />
        <Metric label="Permissions" value={profile.permissionsCount} icon={KeyRound} tone="bg-sky-50 text-sky-600" />
        <Metric label="Audit events" value={profile.loginHistory.length} icon={History} tone="bg-violet-50 text-violet-600" />
        <Metric label="User ID" value={profile.userId} icon={Fingerprint} tone="bg-amber-50 text-amber-600" />
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-card">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={clsx(
                'inline-flex h-11 items-center gap-2 rounded-xl px-4 text-sm font-medium transition',
                active ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
              )}
            >
              <Icon size={17} strokeWidth={2.1} />
              {tab.label}
            </button>
          );
        })}
        {copied ? (
          <span className="ml-auto rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
            Copied {copied}
          </span>
        ) : null}
      </div>

      {activeTab === 'overview' ? (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <InfoTile icon={Mail} label="Email" value={profile.email} onCopy={() => copyValue('email', profile.email)} />
          <InfoTile icon={Building2} label="Division code" value={profile.divisionCode} />
          <InfoTile icon={MapPinned} label="Division name" value={profile.divisionName} />
          <InfoTile icon={Phone} label="Lab phone" value={profile.labPhone} onCopy={() => copyValue('lab phone', profile.labPhone)} />
          <InfoTile icon={Phone} label="Room phone" value={profile.roomPhone} onCopy={() => copyValue('room phone', profile.roomPhone)} />
          <InfoTile icon={IdCard} label="Employee ID" value={profile.employeeId} mono onCopy={() => copyValue('employee id', profile.employeeId)} />
        </section>
      ) : null}

      {activeTab === 'access' ? (
        <section className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                <ShieldCheck size={23} />
              </span>
              <div>
                <h2 className="text-xl font-semibold text-slate-950">Access boundary</h2>
                <p className="text-sm text-slate-500">Role and lane authorization for the current session.</p>
              </div>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <InfoTile icon={ShieldCheck} label="Role" value={humanize(profile.role)} />
              <InfoTile icon={KeyRound} label="Permission count" value={profile.permissionsCount} />
              <InfoTile icon={Fingerprint} label="Token version" value={`Version ${profile.tokenVersion}`} />
              <InfoTile icon={Activity} label="Created at" value={formatDate(profile.createdAt)} />
            </div>
          </div>

          <aside className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
            <h2 className="text-xl font-semibold text-slate-950">Lane scopes</h2>
            <p className="mt-1 text-sm text-slate-500">Operational lanes available to this identity.</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {profile.laneScopes.length > 0 ? (
                profile.laneScopes.map((scope) => (
                  <span key={scope} className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-sm font-medium text-violet-700">
                    {humanize(scope)}
                  </span>
                ))
              ) : (
                <span className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-500">
                  No scoped lane restriction
                </span>
              )}
            </div>
          </aside>
        </section>
      ) : null}

      {activeTab === 'security' ? (
        <section className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-950">Authentication history</h2>
                <p className="mt-1 text-sm text-slate-500">Recent login and session events for your account.</p>
              </div>
              <span className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-700">
                Session V{profile.tokenVersion}
              </span>
            </div>

            <div className="mt-5 space-y-3">
              {profile.loginHistory.length > 0 ? (
                profile.loginHistory.map((log, index) => {
                  const active = index === selectedAudit;
                  return (
                    <button
                      key={log.audit_id || index}
                      type="button"
                      onClick={() => setSelectedAudit(index)}
                      className={clsx(
                        'flex w-full items-center justify-between gap-4 rounded-2xl border p-4 text-left transition',
                        active ? 'border-indigo-200 bg-indigo-50' : 'border-slate-200 bg-white hover:border-indigo-200 hover:bg-slate-50'
                      )}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-base font-semibold text-slate-900">{humanize(log.outcome)}</p>
                        <p className="mt-1 text-sm text-slate-500">{formatDate(log.attempt_at)}</p>
                      </div>
                      <span className={clsx('shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium', outcomeTone(log.outcome))}>
                        {humanize(log.outcome)}
                      </span>
                    </button>
                  );
                })
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm font-medium text-slate-500">
                  No authentication records found.
                </div>
              )}
            </div>
          </div>

          <aside className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white">
                <Laptop size={23} />
              </span>
              <div>
                <h2 className="text-xl font-semibold text-slate-950">Selected event</h2>
                <p className="text-sm text-slate-500">Audit metadata preview.</p>
              </div>
            </div>

            {audit ? (
              <div className="mt-5 space-y-4">
                <InfoTile icon={Activity} label="Outcome" value={humanize(audit.outcome)} />
                <InfoTile icon={History} label="Attempt time" value={formatDate(audit.attempt_at)} />
                <InfoTile icon={Laptop} label="IP address" value={audit.ip_address || '-'} mono />
                <InfoTile icon={Clipboard} label="Notes" value={audit.notes || '-'} />
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm font-medium text-slate-500">
                Select an audit record to inspect.
              </div>
            )}
          </aside>
        </section>
      ) : null}
    </div>
  );
}
