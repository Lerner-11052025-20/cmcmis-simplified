import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { 
  ArrowLeft, 
  Tag, 
  MapPin, 
  CreditCard, 
  Calendar, 
  User, 
  FileText, 
  Info, 
  ShieldCheck, 
  Wrench, 
  Activity 
} from 'lucide-react';
import dayjs from 'dayjs';
import clsx from 'clsx';
import { fetchEquipmentDetail } from '../../lib/api/equipment.js';

// ── Status badge colors mapping ──────────────────────────────────────
const STATUS_STYLES = {
  ACTIVE: {
    bg: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 border-emerald-100',
    dot: 'bg-emerald-500',
    border: 'border-emerald-500',
    title: 'Active / Calibrated'
  },
  PENDING_VERIFICATION: {
    bg: 'bg-amber-50 text-amber-700 ring-amber-600/20 border-amber-100',
    dot: 'bg-amber-500',
    border: 'border-amber-500',
    title: 'Pending Verification'
  },
  UNDER_CALIBRATION: {
    bg: 'bg-sky-50 text-sky-700 ring-sky-600/20 border-sky-100',
    dot: 'bg-sky-500',
    border: 'border-sky-500',
    title: 'Under Calibration'
  },
  UNDER_REPAIR: {
    bg: 'bg-orange-50 text-orange-700 ring-orange-600/20 border-orange-100',
    dot: 'bg-orange-500',
    border: 'border-orange-500',
    title: 'Under Repair'
  },
  OUT_OF_TOLERANCE: {
    bg: 'bg-rose-50 text-rose-700 ring-rose-600/20 border-rose-100',
    dot: 'bg-rose-500',
    border: 'border-rose-500',
    title: 'Out of Tolerance'
  },
  QUARANTINED: {
    bg: 'bg-rose-50 text-rose-700 ring-rose-600/20 border-rose-100',
    dot: 'bg-rose-500',
    border: 'border-rose-500',
    title: 'Quarantined / Hold'
  },
  CONDEMNED: {
    bg: 'bg-slate-50 text-slate-700 ring-slate-600/20 border-slate-100',
    dot: 'bg-slate-500',
    border: 'border-slate-500',
    title: 'Condemned'
  },
  RETIRED: {
    bg: 'bg-slate-50 text-slate-700 ring-slate-600/20 border-slate-100',
    dot: 'bg-slate-500',
    border: 'border-slate-500',
    title: 'Retired / Archived'
  }
};

function formatDisplayDate(value) {
  if (!value) return '—';
  return dayjs(value).format('DD MMM YYYY');
}

function SectionCard({ title, icon: Icon, borderColor, children }) {
  return (
    <div className={clsx(
      'bg-white rounded-xl border border-border shadow-card overflow-hidden transition-all duration-200 hover:shadow-md border-l-4',
      borderColor
    )}>
      <div className="bg-slate-50/50 px-5 py-4 border-b border-border flex items-center gap-2.5">
        <div className={clsx('p-1.5 rounded-lg bg-white border border-border', borderColor.replace('border-l-4', '').trim())}>
          <Icon size={16} className="text-ink" />
        </div>
        <h2 className="text-sm font-semibold text-ink uppercase tracking-wider">{title}</h2>
      </div>
      <div className="p-5 space-y-4">
        {children}
      </div>
    </div>
  );
}

function DetailRow({ label, value, isMonospaced = false, isHighlighted = false }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2.5 border-b border-border/60 last:border-b-0 gap-1.5">
      <span className="text-xs font-semibold text-ink-soft tracking-wide uppercase sm:max-w-[40%]">{label}</span>
      <span className={clsx(
        'text-sm font-medium text-ink text-left sm:text-right break-all',
        isMonospaced && 'font-mono text-xs tracking-wider bg-slate-50 px-2 py-0.5 rounded border border-border/80',
        isHighlighted && 'text-red-600 font-semibold bg-rose-50 px-2.5 py-0.5 rounded border border-rose-100'
      )}>
        {value || '—'}
      </span>
    </div>
  );
}

export function EquipmentDetailPlaceholder() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    setError(null);
    fetchEquipmentDetail(id, ctrl.signal)
      .then(setData)
      .catch((e) => {
        if (e.name === 'CanceledError' || e.code === 'ERR_CANCELED') return;
        setError(e);
      })
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  }, [id]);

  const statusInfo = data ? (STATUS_STYLES[data.status] || {
    bg: 'bg-gray-50 text-gray-700 ring-gray-600/20 border-gray-100',
    dot: 'bg-gray-500',
    border: 'border-gray-500',
    title: data.status || 'Unknown'
  }) : null;

  // Determine if calibration is overdue
  const isOverdue = data && data.next_cal_due_date && dayjs(data.next_cal_due_date).isBefore(dayjs());

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-1">
      {/* ── Breadcrumbs ─────────────────────────────────────── */}
      <Link
        to="/equipment"
        className="inline-flex items-center gap-2 text-xs font-semibold text-ink-soft uppercase tracking-wider hover:text-accent transition-colors duration-150"
      >
        <ArrowLeft size={14} strokeWidth={2.25} />
        Back to Equipment Inventory
      </Link>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
          <div className="text-sm font-semibold text-ink-soft animate-pulse">Loading equipment records...</div>
        </div>
      ) : null}

      {error ? (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-start gap-3 shadow-card">
          <Info className="shrink-0 mt-0.5" size={16} />
          <div>
            <h3 className="font-semibold">Retrieval Error</h3>
            <p className="mt-1 text-xs text-red-600">{error.response?.data?.error?.message || error.message || 'The equipment record could not be fetched.'}</p>
          </div>
        </div>
      ) : null}

      {data ? (
        <div className="animate-[fadeSlideDown_200ms_ease-out] space-y-6">
          {/* ── Dynamic Gradient Hero Card ────────────────────── */}
          <div className="bg-gradient-to-r from-[#0F172A] to-[#1E3A8A] rounded-2xl p-6 md:p-8 text-white shadow-lg border border-slate-800 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="absolute -right-16 -top-16 opacity-10 pointer-events-none">
              <Activity size={180} strokeWidth={1} />
            </div>
            
            <div className="space-y-2 z-10">
              <div className="flex flex-wrap items-center gap-3">
                <span className="bg-sky-500/20 text-sky-300 font-mono text-[10px] tracking-widest uppercase px-2.5 py-1 rounded border border-sky-400/20 shadow-inner">
                  {data.type_name || data.eqm_type}
                </span>
                <span className="bg-white/10 text-slate-200 font-mono text-[10px] tracking-widest uppercase px-2.5 py-1 rounded border border-white/10 shadow-inner">
                  {data.equipment_code}
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">{data.name}</h1>
              <p className="text-xs md:text-sm text-slate-300 font-medium tracking-wide flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
                {data.make} Manufacturer &bull; Model {data.model_no || data.mfg_model_name || '—'}
              </p>
            </div>

            {/* Premium Status Ring */}
            <div className="z-10 shrink-0 flex items-center gap-3 bg-white/5 border border-white/10 p-4 rounded-xl shadow-card">
              <span className={clsx(
                'inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-semibold tracking-wide uppercase border shadow-sm ring-1 ring-inset',
                statusInfo.bg
              )}>
                <span className={clsx('h-2 w-2 rounded-full', statusInfo.dot)} />
                {statusInfo.title}
              </span>
            </div>
          </div>

          {/* ── Section-Wise Color-Coded Detail Panels ────────── */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* CARD 1: Core Identifiers */}
            <SectionCard title="Core Specifications" icon={Tag} borderColor="border-l-accent border-accent/25">
              <DetailRow label="Equipment ID" value={data.equipment_code} isMonospaced />
              <DetailRow label="Asset Category" value={data.type_name || data.eqm_type} />
              <DetailRow label="Manufacturer" value={data.make} />
              <DetailRow label="Model No" value={data.model_no || data.mfg_model_name} isMonospaced />
              <DetailRow label="Serial Number" value={data.serial_no} isMonospaced />
            </SectionCard>

            {/* CARD 2: Location & Division */}
            <SectionCard title="Location & Division" icon={MapPin} borderColor="border-l-purple border-purple-500/25">
              <DetailRow label="Division Code" value={data.division_code} isMonospaced />
              <DetailRow label="Facility Name" value={data.location_name} />
              <DetailRow label="Operational Section" value={data.location_name ? String(data.location_name).split('-')[0].trim() : '—'} />
              <DetailRow label="Room Allocation" value={data.location_name && String(data.location_name).includes('-') ? String(data.location_name).split('-').slice(1).join('-').trim() : '—'} />
            </SectionCard>

            {/* CARD 3: Procurement & Value */}
            <SectionCard title="Procurement Assets" icon={CreditCard} borderColor="border-l-orange border-orange-500/25">
              <DetailRow label="PO Number" value={data.po_number || '—'} isMonospaced />
              <DetailRow label="PO Date" value={formatDisplayDate(data.po_date)} />
              <DetailRow label="Purchase Cost" value={data.cost ? `${Number(data.cost).toLocaleString('en-IN', { minimumFractionDigits: 2 })} ${data.currency || 'INR'}` : '—'} />
              <DetailRow label="Warranty Expiry" value={formatDisplayDate(data.warranty_expiry_date)} />
            </SectionCard>

            {/* CARD 4: Calibration & Status */}
            <SectionCard title="Calibration & Health" icon={Calendar} borderColor="border-l-amber border-warning/25">
              <DetailRow 
                label="Next Cal Due" 
                value={formatDisplayDate(data.next_cal_due_date)} 
                isHighlighted={isOverdue} 
              />
              <DetailRow 
                label="Calibration Status" 
                value={isOverdue ? '⚠️ Overdue' : '🟢 Calibrated / Valid'} 
              />
              <DetailRow label="Status Updated At" value={formatDisplayDate(data.status_at)} />
              <DetailRow label="Last Event Code" value={data.status} isMonospaced />
            </SectionCard>

            {/* CARD 5: System Administration */}
            <SectionCard title="Administration" icon={User} borderColor="border-l-slate-400 border-slate-300">
              <DetailRow label="Registered By" value={data.created_by} isMonospaced />
              <DetailRow label="Created On" value={formatDisplayDate(data.created_on)} />
              <DetailRow label="Last Modified By" value={data.updated_by} isMonospaced />
              <DetailRow label="Last Updated On" value={formatDisplayDate(data.updated_on)} />
            </SectionCard>

            {/* CARD 6: Interactive Quick Tools */}
            <SectionCard title="Operational Quick Actions" icon={Wrench} borderColor="border-l-sky-500 border-sky-400/25">
              <div className="grid grid-cols-1 gap-2 pt-1.5">
                <Link to={`/job-requests/new?eqid=${encodeURIComponent(data.equipment_id)}`}>
                  <button className="w-full text-left inline-flex items-center justify-between px-4 py-2.5 bg-slate-50 border border-border/80 rounded-lg text-xs font-semibold text-ink hover:bg-accent/5 hover:border-accent hover:text-accent transition-all duration-150">
                    <span>Raise Calibration/Repair Job</span>
                    <span>➔</span>
                  </button>
                </Link>
                <Link to={`/job-cards?eq=${encodeURIComponent(data.equipment_code)}`}>
                  <button className="w-full text-left inline-flex items-center justify-between px-4 py-2.5 bg-slate-50 border border-border/80 rounded-lg text-xs font-semibold text-ink hover:bg-accent/5 hover:border-accent hover:text-accent transition-all duration-150">
                    <span>View Technical Job Cards History</span>
                    <span>➔</span>
                  </button>
                </Link>
              </div>
            </SectionCard>

          </div>

          {/* ── Registered Accessories ─────────────────────────── */}
          {data.accessories && data.accessories.length > 0 && (
            <div className="bg-white rounded-xl border border-border shadow-card overflow-hidden border-l-4 border-l-indigo-600 transition-all duration-200 hover:shadow-md">
              <div className="bg-slate-50/50 px-5 py-4 border-b border-border flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-white border border-border">
                  <Activity size={16} className="text-indigo-600" />
                </div>
                <h2 className="text-sm font-semibold text-ink uppercase tracking-wider">Registered Accessories</h2>
              </div>
              <div className="p-6">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-border text-left text-xs">
                    <thead>
                      <tr className="text-ink-soft uppercase tracking-wider font-semibold bg-slate-50/50">
                        <th className="px-4 py-3">ID</th>
                        <th className="px-4 py-3">Accessory Type</th>
                        <th className="px-4 py-3">Accessory Name</th>
                        <th className="px-4 py-3">Serial No</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {data.accessories.map((acc) => (
                        <tr key={acc.id} className="hover:bg-slate-50/30 transition-colors duration-150">
                          <td className="px-4 py-3.5 font-mono font-medium text-ink-soft">{acc.id}</td>
                          <td className="px-4 py-3.5 font-semibold text-ink">{acc.accessory_type || 'Other'}</td>
                          <td className="px-4 py-3.5 text-ink">{acc.accessory_name}</td>
                          <td className="px-4 py-3.5 font-mono text-ink-soft">{acc.serial_no || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── Options / Technical Remarks ────────────────────── */}
          <div className="bg-white rounded-xl border border-border shadow-card overflow-hidden border-l-4 border-l-slate-700 transition-all duration-200 hover:shadow-md">
            <div className="bg-slate-50/50 px-5 py-4 border-b border-border flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-white border border-border">
                <FileText size={16} className="text-ink" />
              </div>
              <h2 className="text-sm font-semibold text-ink uppercase tracking-wider">Specifications & Remarks</h2>
            </div>
            <div className="p-6">
              <p className="whitespace-pre-wrap text-sm text-ink-soft leading-relaxed">
                {data.options_description || data.remarks || 'No detailed specifications or remarks registered for this equipment.'}
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
