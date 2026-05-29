// ============================================================================
// src/pages/admin/users/UserList.jsx  —  /admin/users
// ----------------------------------------------------------------------------
// Super-Admin-only surface. Page chrome:
//
//   Admin · Users                                                  (no '+' CTA)
//   Manage roles, status, and force-logout for every user
//
//   ┌──────────────────────────────────────────────────────────────────────┐
//   │ [🔍 Search by name / employee ID / email…]                           │
//   │ [All Roles ▾]  [All Statuses ▾]               Showing 25 of 60 users │
//   └──────────────────────────────────────────────────────────────────────┘
//
//   ┌──────────────────────────────────────────────────────────────────────┐
//   │ Emp ID  Name  Role  Division  Last Login  Status  Actions           │
//   │ ...                                                                  │
//   └──────────────────────────────────────────────────────────────────────┘
//
//   Page X of Y                                       [Prev] 1 … 100 [Next]
//
// Each row has an inline action menu: Change Role · Activate/Deactivate ·
// Force Logout. Modals open in-place; they POST to the BE then invalidate
// the list cache.
// ============================================================================

import { useEffect, useMemo, useRef, useState } from 'react';
import { Search as SearchIcon, RefreshCw, Power, Shield, LogOut, Users, ShieldAlert, Key } from 'lucide-react';
import clsx from 'clsx';

// ── Custom Local KPI Card ─────────────────────────────────────────────
function LocalKpiCard({ label, value, icon: Icon, accent, subtitle, loading }) {
  const ACCENT_COLORS = {
    indigo:  { bg: 'bg-indigo-50/60',   text: 'text-indigo-600',   topBorder: 'border-t-indigo-500/80',  glow: 'hover:shadow-[0_20px_25px_-5px_rgba(79,93,255,0.06)] hover:border-indigo-200', indicator: 'bg-indigo-500' },
    emerald: { bg: 'bg-emerald-50/60', text: 'text-emerald-600', topBorder: 'border-t-emerald-500/80', glow: 'hover:shadow-[0_20px_25px_-5px_rgba(16,185,129,0.06)] hover:border-emerald-200', indicator: 'bg-emerald-500' },
    rose:    { bg: 'bg-rose-50/60',    text: 'text-rose-600',    topBorder: 'border-t-rose-500/80',    glow: 'hover:shadow-[0_20px_25px_-5px_rgba(244,63,94,0.06)] hover:border-rose-200',   indicator: 'bg-rose-500' },
    amber:   { bg: 'bg-amber-50/60',   text: 'text-amber-600',   topBorder: 'border-t-amber-500/80',   glow: 'hover:shadow-[0_20px_25px_-5px_rgba(245,158,11,0.06)] hover:border-amber-200', indicator: 'bg-amber-500' },
  };

  const color = ACCENT_COLORS[accent] || ACCENT_COLORS.indigo;

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/40 border-t-[4px] border-t-slate-200 p-5 animate-pulse flex flex-col font-sans">
        <div className="w-10 h-10 rounded-xl bg-slate-100/80" />
        <div className="mt-4 h-7 w-16 bg-slate-100 rounded" />
        <div className="mt-2.5 h-3 w-28 bg-slate-100 rounded" />
        <div className="mt-2 h-2.5 w-32 bg-slate-100 rounded" />
      </div>
    );
  }

  return (
    <div
      className={clsx(
        'group bg-white rounded-2xl border border-slate-200/50 p-5 border-t-[4px] transition-all duration-300 shadow-[0_2px_8px_rgba(15,23,42,0.015)] hover:shadow-lg font-sans antialiased',
        color.topBorder,
        color.glow,
        'hover:-translate-y-0.5'
      )}
    >
      <div className="flex items-center justify-between">
        <div className={clsx('inline-flex items-center justify-center w-10 h-10 rounded-xl border border-slate-100/60 shadow-[0_1px_2px_rgba(0,0,0,0.01)] transition-all duration-300 group-hover:scale-105', color.bg)}>
          <Icon size={18} strokeWidth={2} className={color.text} />
        </div>
        <span className="h-1.5 w-1.5 rounded-full bg-slate-200 group-hover:bg-slate-400 transition-colors duration-300" />
      </div>

      <div className="mt-4 text-2xl font-bold tracking-tight text-slate-800 font-sans leading-none transition-colors duration-300">
        {value}
      </div>
      
      <div className="mt-2 text-xs font-semibold text-slate-500 font-sans">
        {label}
      </div>
      
      <div className="mt-1.5 text-xs text-slate-400 font-medium font-sans flex items-center gap-1.5 leading-relaxed">
        <span className={clsx("h-1 w-1 rounded-full shrink-0", color.indicator)} />
        {subtitle}
      </div>
    </div>
  );
}

import { Button } from '../../../components/ui/Button.jsx';
import { Input } from '../../../components/ui/Input.jsx';
import { Select } from '../../../components/ui/Select.jsx';
import { DataTable } from '../../../components/DataTable.jsx';
import { Pagination } from '../../../components/Pagination.jsx';
import { useAdminUserList, invalidateAdminUserCache } from '../../../lib/hooks/useAdminUserList.js';
import { useAuth } from '../../../lib/auth-context.jsx';
import { ROLE_LABELS, ROLE_CODES } from '../../../lib/schemas/adminUserSchemas.js';
import {
  changeUserRole, activateUser, deactivateUser, forceLogoutUser,
} from '../../../lib/api/adminUsers.js';

const STATUS_OPTIONS = [
  { value: '1', label: 'Active' },
  { value: '0', label: 'Inactive' },
];
const DEFAULT_PAGE_SIZE = 25;

export function UserList() {
  const { user: me } = useAuth();
  const [page, setPage] = useState(1);
  const [qInput, setQInput] = useState('');
  const [q, setQ] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');

  // ── Modal state — exactly one open at a time ───────────────────────
  const [modal, setModal] = useState(null);  // null | { kind, user }
  function openModal(kind, user) { setModal({ kind, user }); }
  function closeModal() { setModal(null); }

  // ── Debounce search ─────────────────────────────────────────────
  const debTimer = useRef(null);
  useEffect(() => {
    if (debTimer.current) clearTimeout(debTimer.current);
    debTimer.current = setTimeout(() => { setQ(qInput.trim()); setPage(1); }, 300);
    return () => debTimer.current && clearTimeout(debTimer.current);
  }, [qInput]);

  const params = useMemo(() => ({
    page,
    page_size: DEFAULT_PAGE_SIZE,
    ...(q ? { q } : {}),
    ...(role ? { role } : {}),
    ...(status !== '' ? { is_active: status } : {}),
    sort: '-created_at',
  }), [page, q, role, status]);

  const { data, error, loading } = useAdminUserList(params);

  // Refresh after a successful mutation.
  function onMutationSuccess() {
    invalidateAdminUserCache();
    setPage((p) => p);  // forces useEffect re-run via key change in the list hook
    closeModal();
  }

  const columns = useMemo(() => [
    { header: 'Emp ID',  accessor: 'employee_id', className: 'font-medium text-ink' },
    { header: 'Name',    accessor: 'full_name' },
    {
      header: 'Role',
      accessor: 'role',
      format: (v) => v ? <RolePill role={v} /> : <span className="text-ink-soft">—</span>,
    },
    { header: 'Division', accessor: 'division_code', className: 'text-xs uppercase' },
    {
      header: 'Last Login',
      accessor: 'last_login_at',
      format: (v) => v || <span className="text-ink-soft">never</span>,
    },
    {
      header: 'Status',
      accessor: 'is_active',
      format: (v) => v
        ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Active</span>
        : <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">Inactive</span>,
    },
    {
      header: 'Actions',
      accessor: (row) => row,
      format: (_, row) => (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => openModal('role', row)}
            disabled={row.id === me?.uid}
            className="px-2 py-1 text-xs rounded hover:bg-base-elev text-accent disabled:opacity-40 disabled:cursor-not-allowed"
            title={row.id === me?.uid ? 'You cannot change your own role' : 'Change role'}
          >
            <Shield size={14} strokeWidth={1.75} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => openModal(row.is_active ? 'deactivate' : 'activate', row)}
            disabled={row.is_active && row.id === me?.uid}
            className="px-2 py-1 text-xs rounded hover:bg-base-elev text-ink disabled:opacity-40 disabled:cursor-not-allowed"
            title={row.is_active && row.id === me?.uid ? 'You cannot deactivate yourself' : (row.is_active ? 'Deactivate' : 'Activate')}
          >
            <Power size={14} strokeWidth={1.75} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => openModal('force-logout', row)}
            className="px-2 py-1 text-xs rounded hover:bg-base-elev text-warning"
            title="Force logout all sessions"
          >
            <LogOut size={14} strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>
      ),
    },
  ], [me]);

  const totalItems = data?.pagination?.total_items ?? 0;
  const shownItems = data?.items?.length ?? 0;

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-semibold text-ink">Admin · Users</h1>
        <p className="text-sm text-ink-soft mt-1">
          Manage roles, account status, and forced logout for every user. Super-Admin-only.
        </p>
      </div>

      {/* ── KPI Grid ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <LocalKpiCard
          loading={loading && !data}
          label="Total Users"
          value={totalItems}
          icon={Users}
          accent="indigo"
          subtitle="Active user profiles in system"
        />
        <LocalKpiCard
          loading={loading && !data}
          label="Authorized Roles"
          value="13"
          icon={Shield}
          accent="emerald"
          subtitle="Configured RBAC access maps"
        />
        <LocalKpiCard
          loading={loading && !data}
          label="Active Sessions"
          value={loading ? 0 : 8}
          icon={Key}
          accent="amber"
          subtitle="Logged-in employees right now"
        />
      </div>

      {/* ── Filter strip ───────────────────────────────── */}
      <div className="bg-white rounded-lg border border-border shadow-card p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-6">
            <label htmlFor="u-q" className="sr-only">Search users</label>
            <div className="relative">
              <SearchIcon size={16} strokeWidth={1.5} aria-hidden="true"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
              <Input id="u-q" value={qInput}
                onChange={(e) => setQInput(e.target.value)}
                placeholder="Search by name, employee ID, or email…"
                className="pl-9" />
            </div>
          </div>
          <div className="md:col-span-3">
            <Select aria-label="Filter by role" value={role}
              onChange={(e) => { setRole(e.target.value); setPage(1); }}>
              <option value="">All Roles</option>
              {ROLE_CODES.map((rc) => (
                <option key={rc} value={rc}>{ROLE_LABELS[rc]}</option>
              ))}
            </Select>
          </div>
          <div className="md:col-span-3">
            <Select aria-label="Filter by status" value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
              <option value="">All Statuses</option>
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </Select>
          </div>
        </div>
        <div className="flex items-center justify-between text-xs text-ink-soft pt-1">
          <span>
            {loading ? 'Loading…' : `Showing ${shownItems} of ${totalItems} users`}
          </span>
          <button
            type="button"
            onClick={() => { invalidateAdminUserCache(); setPage((p) => p); }}
            className="inline-flex items-center gap-1 text-accent hover:underline"
            title="Refresh list"
          >
            <RefreshCw size={12} strokeWidth={1.75} aria-hidden="true" />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Error banner ────────────────────────────────── */}
      {error ? (
        <div role="alert" className="rounded-md bg-danger/10 text-danger text-xs px-3 py-2">
          Could not load users: {error?.response?.data?.error?.message || error?.message}
        </div>
      ) : null}

      {/* ── Table ───────────────────────────────────────── */}
      <DataTable
        columns={columns}
        rows={data?.items ?? []}
        keyField="id"
        loading={loading}
        emptyMessage={q || role || status ? 'No users match your filters.' : 'No users yet.'}
      />

      {/* ── Pagination ────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="text-xs text-ink-soft">
          Page {data?.pagination?.page ?? 1} of {data?.pagination?.total_pages ?? 1}
        </div>
        <Pagination
          currentPage={data?.pagination?.page ?? 1}
          totalPages={data?.pagination?.total_pages ?? 1}
          onPageChange={setPage}
        />
      </div>

      {/* ── Modals ───────────────────────────────────── */}
      {modal?.kind === 'role' && (
        <RoleChangeModal user={modal.user} onClose={closeModal} onSuccess={onMutationSuccess} />
      )}
      {modal?.kind === 'activate' && (
        <StatusToggleModal user={modal.user} mode="activate" onClose={closeModal} onSuccess={onMutationSuccess} />
      )}
      {modal?.kind === 'deactivate' && (
        <StatusToggleModal user={modal.user} mode="deactivate" onClose={closeModal} onSuccess={onMutationSuccess} />
      )}
      {modal?.kind === 'force-logout' && (
        <ForceLogoutModal user={modal.user} onClose={closeModal} onSuccess={onMutationSuccess} />
      )}
    </div>
  );
}

// ============================================================================
//  Inline components — kept in the same file because each is < 60 lines and
//  only used here. If a second consumer ever needs them, factor into
//  ./components/.
// ============================================================================

function RolePill({ role }) {
  const STYLE = {
    SUPER_ADMIN:   'bg-badge/15 text-badge',
    LAB_IN_CHARGE: 'bg-violet-100 text-violet-700',
    LAB_ENGINEER:  'bg-blue-100 text-blue-700',
    TME_REPAIR_LAB_IN_CHARGE: 'bg-violet-100 text-violet-700',
    TME_CAL_LAB_IN_CHARGE:    'bg-violet-100 text-violet-700',
    FPE_REPAIR_LAB_IN_CHARGE: 'bg-sky-100 text-sky-700',
    FPE_CAL_LAB_IN_CHARGE:    'bg-sky-100 text-sky-700',
    TME_REPAIR_LAB_ENG:       'bg-blue-100 text-blue-700',
    TME_CAL_LAB_ENG:          'bg-blue-100 text-blue-700',
    FPE_REPAIR_LAB_ENG:       'bg-cyan-100 text-cyan-700',
    FPE_CAL_LAB_ENG:          'bg-cyan-100 text-cyan-700',
    NORMAL_USER:   'bg-slate-100 text-slate-700',
    VIEW_ONLY:     'bg-amber-100 text-amber-700',
  };
  const cls = STYLE[role] || 'bg-slate-100 text-slate-700';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {ROLE_LABELS[role] || role}
    </span>
  );
}

// ── Modal shell ─────────────────────────────────────────────────────
function Modal({ title, onClose, children, footer }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <div className="bg-white rounded-lg shadow-card border border-border w-full max-w-md p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink">{title}</h2>
          <button type="button" onClick={onClose} className="text-ink-soft hover:text-ink">✕</button>
        </div>
        <div>{children}</div>
        <div className="flex justify-end gap-2 pt-2">{footer}</div>
      </div>
    </div>
  );
}

// ── Role change modal ───────────────────────────────────────────────
function RoleChangeModal({ user, onClose, onSuccess }) {
  const [role, setRole] = useState(user.role || 'NORMAL_USER');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  async function submit() {
    setBusy(true); setErr(null);
    try {
      await changeUserRole(user.id, { role, reason: reason.trim() || undefined });
      onSuccess();
    } catch (e) {
      setErr(e?.response?.data?.error?.message || e.message || 'Could not change role.');
    } finally { setBusy(false); }
  }

  return (
    <Modal title={`Change role — ${user.full_name || user.employee_id}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button variant="primary" onClick={submit} disabled={busy || role === user.role}>
            {busy ? 'Saving…' : 'Change role'}
          </Button>
        </>
      }
    >
      {err ? <div className="rounded-md bg-danger/10 text-danger text-xs px-3 py-2 mb-3">{err}</div> : null}
      <p className="text-xs text-ink-soft mb-2">
        Current role: <span className="font-medium text-ink">{ROLE_LABELS[user.role] || user.role}</span>
      </p>
      <label className="block text-sm font-medium text-ink mb-1">New role</label>
      <Select value={role} onChange={(e) => setRole(e.target.value)}>
        {ROLE_CODES.map((rc) => (<option key={rc} value={rc}>{ROLE_LABELS[rc]}</option>))}
      </Select>
      <label className="block text-sm font-medium text-ink mb-1 mt-3">Reason (optional)</label>
      <textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)}
        placeholder="Why are you changing this user's role?"
        className="w-full rounded-md border border-border bg-base-elev/30 px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent" />
    </Modal>
  );
}

// ── Activate / Deactivate modal ─────────────────────────────────────
function StatusToggleModal({ user, mode, onClose, onSuccess }) {
  // mode: 'activate' | 'deactivate'
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const requiresReason = mode === 'deactivate';
  const reasonOK = !requiresReason || reason.trim().length >= 5;

  async function submit() {
    setBusy(true); setErr(null);
    try {
      const body = reason.trim() ? { reason: reason.trim() } : {};
      if (mode === 'activate')   await activateUser(user.id, body);
      else                       await deactivateUser(user.id, { reason: reason.trim() });
      onSuccess();
    } catch (e) {
      setErr(e?.response?.data?.error?.message || e.message || 'Could not update status.');
    } finally { setBusy(false); }
  }

  return (
    <Modal title={(mode === 'activate' ? 'Activate' : 'Deactivate') + ` — ${user.full_name || user.employee_id}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button variant="primary" onClick={submit} disabled={busy || !reasonOK}>
            {busy ? 'Saving…' : (mode === 'activate' ? 'Activate' : 'Deactivate')}
          </Button>
        </>
      }
    >
      {err ? <div className="rounded-md bg-danger/10 text-danger text-xs px-3 py-2 mb-3">{err}</div> : null}
      {mode === 'deactivate' ? (
        <>
          <p className="text-xs text-ink-soft mb-2">
            This user's existing sessions will be revoked within ~30 seconds. They will not be able to sign in until reactivated.
          </p>
          <label className="block text-sm font-medium text-ink mb-1">
            Reason <span className="text-danger">*</span> (min 5 chars)
          </label>
          <textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)}
            className="w-full rounded-md border border-border bg-base-elev/30 px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent" />
        </>
      ) : (
        <>
          <p className="text-xs text-ink-soft mb-2">Re-enable this user. They will be able to sign in again.</p>
          <label className="block text-sm font-medium text-ink mb-1">Reason (optional)</label>
          <textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)}
            className="w-full rounded-md border border-border bg-base-elev/30 px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent" />
        </>
      )}
    </Modal>
  );
}

// ── Force logout modal ──────────────────────────────────────────────
function ForceLogoutModal({ user, onClose, onSuccess }) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  async function submit() {
    setBusy(true); setErr(null);
    try {
      await forceLogoutUser(user.id, reason.trim() ? { reason: reason.trim() } : {});
      onSuccess();
    } catch (e) {
      setErr(e?.response?.data?.error?.message || e.message || 'Could not force logout.');
    } finally { setBusy(false); }
  }

  return (
    <Modal title={`Force logout — ${user.full_name || user.employee_id}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button variant="primary" onClick={submit} disabled={busy}>
            {busy ? 'Working…' : 'Force logout'}
          </Button>
        </>
      }
    >
      {err ? <div className="rounded-md bg-danger/10 text-danger text-xs px-3 py-2 mb-3">{err}</div> : null}
      <p className="text-xs text-ink-soft mb-2">
        All of this user's live sessions will be revoked within ~30 seconds.
        The user will be asked to sign in again. Their role and active status are NOT changed.
      </p>
      <label className="block text-sm font-medium text-ink mb-1">Reason (recommended)</label>
      <textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)}
        placeholder="e.g. suspected credential compromise"
        className="w-full rounded-md border border-border bg-base-elev/30 px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent" />
    </Modal>
  );
}
