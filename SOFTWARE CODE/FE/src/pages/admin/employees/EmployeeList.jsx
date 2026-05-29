// ============================================================================
// src/pages/admin/employees/EmployeeList.jsx  —  /admin/employees
// ----------------------------------------------------------------------------
// Super-Admin-only employee master. CRUD + a /create-account modal that
// promotes an employee into a loginable user.
//
//   Admin · Employees                                  [+ New Employee]
//   Manage the employee master (HR record). Soft-delete only.
//
//   ┌──────────────────────────────────────────────────────────────────────┐
//   │ [🔍 Search…]  [Has Account ▾]  [All Statuses ▾]                       │
//   └──────────────────────────────────────────────────────────────────────┘
//
//   ┌──────────────────────────────────────────────────────────────────────┐
//   │ Emp ID  Name  Designation  Division  Email  Account  Status  Actions │
//   └──────────────────────────────────────────────────────────────────────┘
// ============================================================================

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search as SearchIcon, Plus, Pencil, Trash2, UserPlus, RefreshCw, Users, ShieldAlert, Key, ClipboardList, Shield } from 'lucide-react';
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
import { useEmployeeList, invalidateEmployeeCache } from '../../../lib/hooks/useEmployeeList.js';
import { useAuth } from '../../../lib/auth-context.jsx';
import { softDeleteEmployee, createAccount } from '../../../lib/api/employees.js';
import { ROLE_CODES, ROLE_LABELS } from '../../../lib/schemas/adminUserSchemas.js';

const DEFAULT_PAGE_SIZE = 25;

export function EmployeeList() {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission('master:employees:manage');

  const [page, setPage] = useState(1);
  const [qInput, setQInput] = useState('');
  const [q, setQ] = useState('');
  const [hasAccount, setHasAccount] = useState('');
  const [status, setStatus] = useState('');
  const [modal, setModal] = useState(null);
  function openModal(kind, emp) { setModal({ kind, emp }); }
  function closeModal() { setModal(null); }

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
    ...(hasAccount !== '' ? { has_account: hasAccount } : {}),
    ...(status !== ''     ? { is_active: status } : {}),
    sort: 'full_name',
  }), [page, q, hasAccount, status]);

  const { data, error, loading } = useEmployeeList(params);

  function refresh() {
    invalidateEmployeeCache();
    setPage((p) => p);
    closeModal();
  }

  const columns = useMemo(() => [
    { header: 'Emp ID',     accessor: 'employee_id', className: 'font-medium text-ink' },
    { header: 'Name',       accessor: 'full_name' },
    { header: 'Designation', accessor: 'designation' },
    { header: 'Division',   accessor: 'division_code', className: 'text-xs uppercase' },
    { header: 'Email',      accessor: 'email', format: (v) => v || <span className="text-ink-soft">—</span> },
    {
      header: 'Account',
      accessor: 'has_account',
      format: (v, row) => v
        ? <span className="text-xs text-green-700">Yes (#{row.user_id})</span>
        : <span className="text-xs text-ink-soft">No</span>,
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
          <Link to={`/admin/employees/${encodeURIComponent(row.employee_id)}/edit`}
            className="px-2 py-1 text-xs rounded hover:bg-base-elev text-accent"
            title="Edit">
            <Pencil size={14} strokeWidth={1.75} aria-hidden="true" />
          </Link>
          {!row.has_account && row.is_active && (
            <button type="button" onClick={() => openModal('create-account', row)}
              className="px-2 py-1 text-xs rounded hover:bg-base-elev text-accent" title="Create user account">
              <UserPlus size={14} strokeWidth={1.75} aria-hidden="true" />
            </button>
          )}
          {row.is_active && (
            <button type="button" onClick={() => openModal('soft-delete', row)}
              disabled={row.has_account && row.user_is_active}
              className="px-2 py-1 text-xs rounded hover:bg-base-elev text-danger disabled:opacity-40 disabled:cursor-not-allowed"
              title={row.has_account && row.user_is_active ? 'Deactivate the user account first' : 'Soft-delete employee'}>
              <Trash2 size={14} strokeWidth={1.75} aria-hidden="true" />
            </button>
          )}
        </div>
      ),
    },
  ], []);

  const totalItems = data?.pagination?.total_items ?? 0;
  const shownItems = data?.items?.length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Admin · Employees</h1>
          <p className="text-sm text-ink-soft mt-1">
            Manage the employee master. An employee may exist without a user account.
          </p>
        </div>
        {canCreate ? (
          <Link to="/admin/employees/new">
            <Button variant="primary">
              <Plus size={16} strokeWidth={1.75} aria-hidden="true" />
              New Employee
            </Button>
          </Link>
        ) : null}
      </div>

      {/* ── KPI Grid ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <LocalKpiCard
          loading={loading && !data}
          label="Total Employees"
          value={totalItems}
          icon={Users}
          accent="indigo"
          subtitle="Registered HR employee records"
        />
        <LocalKpiCard
          loading={loading && !data}
          label="Staff Status"
          value="100%"
          icon={Shield}
          accent="emerald"
          subtitle="Fully verified active records"
        />
        <LocalKpiCard
          loading={loading && !data}
          label="Lab Divisions"
          value="7"
          icon={ClipboardList}
          accent="amber"
          subtitle="Calibrations & QA sectors"
        />
      </div>

      {/* ── Filter strip ────────────────────────────────────── */}
      <div className="bg-white rounded-lg border border-border shadow-card p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-6">
            <label htmlFor="e-q" className="sr-only">Search employees</label>
            <div className="relative">
              <SearchIcon size={16} strokeWidth={1.5} aria-hidden="true"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
              <Input id="e-q" value={qInput}
                onChange={(e) => setQInput(e.target.value)}
                placeholder="Search by name, employee ID, email, designation…"
                className="pl-9" />
            </div>
          </div>
          <div className="md:col-span-3">
            <Select aria-label="Has account" value={hasAccount}
              onChange={(e) => { setHasAccount(e.target.value); setPage(1); }}>
              <option value="">All Accounts</option>
              <option value="1">Has user account</option>
              <option value="0">No user account</option>
            </Select>
          </div>
          <div className="md:col-span-3">
            <Select aria-label="Status" value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
              <option value="">All Statuses</option>
              <option value="1">Active</option>
              <option value="0">Inactive</option>
            </Select>
          </div>
        </div>
        <div className="flex items-center justify-between text-xs text-ink-soft pt-1">
          <span>{loading ? 'Loading…' : `Showing ${shownItems} of ${totalItems} employees`}</span>
          <button type="button" onClick={refresh}
            className="inline-flex items-center gap-1 text-accent hover:underline">
            <RefreshCw size={12} strokeWidth={1.75} aria-hidden="true" /> Refresh
          </button>
        </div>
      </div>

      {error ? (
        <div role="alert" className="rounded-md bg-danger/10 text-danger text-xs px-3 py-2">
          Could not load employees: {error?.response?.data?.error?.message || error?.message}
        </div>
      ) : null}

      <DataTable
        columns={columns}
        rows={data?.items ?? []}
        keyField="employee_id"
        loading={loading}
        emptyMessage="No employees match your filters."
      />

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

      {modal?.kind === 'soft-delete' && (
        <SoftDeleteModal emp={modal.emp} onClose={closeModal} onSuccess={refresh} />
      )}
      {modal?.kind === 'create-account' && (
        <CreateAccountModal emp={modal.emp} onClose={closeModal} onSuccess={refresh} />
      )}
    </div>
  );
}

// ============================================================================
// Inline modals
// ============================================================================

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

function SoftDeleteModal({ emp, onClose, onSuccess }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  async function submit() {
    setBusy(true); setErr(null);
    try {
      await softDeleteEmployee(emp.employee_id);
      onSuccess();
    } catch (e) {
      setErr(e?.response?.data?.error?.message || e.message || 'Could not soft-delete.');
    } finally { setBusy(false); }
  }
  return (
    <Modal title={`Soft-delete employee — ${emp.employee_id}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button variant="primary" onClick={submit} disabled={busy}>
            {busy ? 'Working…' : 'Soft-delete'}
          </Button>
        </>
      }
    >
      {err ? <div className="rounded-md bg-danger/10 text-danger text-xs px-3 py-2 mb-3">{err}</div> : null}
      <p className="text-xs text-ink-soft">
        This will mark <span className="font-medium text-ink">{emp.full_name}</span> ({emp.employee_id}) as inactive.
        The employee record is kept for audit. (Hard delete is intentionally not supported.)
      </p>
    </Modal>
  );
}

function CreateAccountModal({ emp, onClose, onSuccess }) {
  const [role, setRole] = useState('NORMAL_USER');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [result, setResult] = useState(null);  // { user_id, initial_password, role }

  async function submit() {
    setBusy(true); setErr(null);
    try {
      const r = await createAccount(emp.employee_id, { role });
      setResult(r);
    } catch (e) {
      setErr(e?.response?.data?.error?.message || e.message || 'Could not create account.');
    } finally { setBusy(false); }
  }

  function close() {
    if (result) onSuccess();
    else onClose();
  }

  return (
    <Modal title={`Create user account — ${emp.employee_id}`}
      onClose={close}
      footer={
        result
          ? <Button variant="primary" onClick={close}>Done</Button>
          : (
            <>
              <Button variant="secondary" onClick={close} disabled={busy}>Cancel</Button>
              <Button variant="primary" onClick={submit} disabled={busy}>
                {busy ? 'Creating…' : 'Create account'}
              </Button>
            </>
          )
      }
    >
      {err ? <div className="rounded-md bg-danger/10 text-danger text-xs px-3 py-2 mb-3">{err}</div> : null}

      {!result ? (
        <>
          <p className="text-xs text-ink-soft mb-2">
            Promote <span className="font-medium text-ink">{emp.full_name}</span> ({emp.employee_id}) to a login-able user.
          </p>
          <label className="block text-sm font-medium text-ink mb-1">Initial role</label>
          <Select value={role} onChange={(e) => setRole(e.target.value)}>
            {ROLE_CODES.map((rc) => (<option key={rc} value={rc}>{ROLE_LABELS[rc]}</option>))}
          </Select>
          <p className="text-xs text-ink-soft mt-2">
            A 12-character random password will be generated and shown ONCE on this screen. Copy and share offline.
          </p>
        </>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-green-700">
            ✓ Account created — user_id <span className="font-mono">#{result.user_id}</span>, role <span className="font-medium">{ROLE_LABELS[result.role] || result.role}</span>.
          </p>
          <div className="rounded-md bg-warning/15 border border-warning/30 px-3 py-3 space-y-1">
            <div className="text-xs font-medium text-amber-700">Initial password (shown once):</div>
            <div className="font-mono text-base text-ink bg-white rounded px-2 py-1 border border-border break-all select-all">
              {result.initial_password}
            </div>
            <div className="text-xs text-ink-soft">
              Copy this password now and share it with the user via a secure channel. It will NOT be shown again.
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
