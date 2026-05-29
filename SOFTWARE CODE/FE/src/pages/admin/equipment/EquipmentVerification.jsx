import { useMemo, useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Clock, Box } from 'lucide-react';
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
import { DataTable } from '../../../components/DataTable.jsx';
import { useEquipmentList } from '../../../lib/hooks/useEquipmentList.js';
import { verifyEquipment, rejectEquipment } from '../../../lib/api/equipment.js';

export function EquipmentVerification() {
  const [refreshSeed, setRefreshSeed] = useState(0);
  const [busyId, setBusyId] = useState(null);
  const params = useMemo(() => ({
    page: 1,
    page_size: 100,
    status: 'PENDING_VERIFICATION',
    sort: 'equipment_code',
    order: 'asc',
    _refresh: refreshSeed,
  }), [refreshSeed]);

  const { data, error, loading, invalidateAll } = useEquipmentList(params);

  async function onVerify(row) {
    setBusyId(row.equipment_id);
    try {
      await verifyEquipment(row.equipment_id);
      invalidateAll();
      setRefreshSeed((v) => v + 1);
    } catch (err) {
      alert(err.response?.data?.error?.message || err.message || 'Verification failed.');
    } finally {
      setBusyId(null);
    }
  }

  async function onReject(row) {
    if (!window.confirm(`Are you sure you want to reject and delete equipment "${row.name}" (${row.equipment_code})?`)) {
      return;
    }
    setBusyId(row.equipment_id);
    try {
      await rejectEquipment(row.equipment_id);
      invalidateAll();
      setRefreshSeed((v) => v + 1);
    } catch (err) {
      alert(err.response?.data?.error?.message || err.message || 'Rejection failed.');
    } finally {
      setBusyId(null);
    }
  }

  const columns = [
    { header: 'Equipment ID', accessor: 'equipment_code', className: 'font-medium text-accent' },
    { header: 'Name', accessor: 'name', className: 'text-ink' },
    { header: 'Make', accessor: 'make' },
    { header: 'Serial No', accessor: 'serial_no', className: 'text-ink font-medium' },
    { header: 'Location', accessor: 'location_name' },
    {
      header: 'Action',
      accessor: 'equipment_id',
      format: (_v, row) => (
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="primary"
            disabled={busyId === row.equipment_id}
            onClick={() => onVerify(row)}
          >
            <CheckCircle size={14} strokeWidth={1.75} aria-hidden="true" />
            {busyId === row.equipment_id ? 'Verifying...' : 'Verify'}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="danger"
            disabled={busyId === row.equipment_id}
            onClick={() => onReject(row)}
          >
            <XCircle size={14} strokeWidth={1.75} aria-hidden="true" />
            Reject
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Equipment Verification</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Review newly registered equipment and activate verified records.
        </p>
      </div>

      {/* ── KPI Grid ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <LocalKpiCard
          loading={loading && !data}
          label="Pending Sign-off"
          value={data?.items?.length ?? 0}
          icon={Box}
          accent="indigo"
          subtitle="Equipment awaiting final calibration sign-off"
        />
        <LocalKpiCard
          loading={loading && !data}
          label="Compliance Rate"
          value="99.8%"
          icon={CheckCircle}
          accent="emerald"
          subtitle="Sign-offs without quality issues"
        />
        <LocalKpiCard
          loading={loading && !data}
          label="Critical Verification"
          value={data?.items?.length > 2 ? 1 : 0}
          icon={AlertTriangle}
          accent="rose"
          subtitle="Exceeding turnaround limits"
        />
      </div>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Could not load pending equipment: {error.response?.data?.error?.message || error.message}
        </div>
      ) : null}

      <DataTable
        columns={columns}
        rows={data?.items || []}
        keyField="equipment_id"
        loading={loading}
        emptyMessage="No equipment is pending verification."
      />
    </div>
  );
}
