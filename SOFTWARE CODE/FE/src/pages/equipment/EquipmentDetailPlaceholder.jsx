import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Boxes,
  Building2,
  CalendarClock,
  CheckCircle2,
  Clipboard,
  CreditCard,
  FileText,
  Fingerprint,
  Gauge,
  History,
  Info,
  MapPin,
  PackageCheck,
  ShieldCheck,
  Tag,
  UserRound,
  Wrench,
} from 'lucide-react';

import { fetchEquipmentDetail } from '../../lib/api/equipment.js';
import { formatIstDate, parseDateOnlyInIst, todayIstIsoDate } from '../../lib/time.js';

const TABS = [
  { key: 'overview', label: 'Overview', icon: Gauge },
  { key: 'procurement', label: 'Procurement', icon: CreditCard },
  { key: 'service', label: 'Service', icon: Wrench },
  { key: 'records', label: 'Records', icon: History },
];

const STATUS_STYLES = {
  ACTIVE: { label: 'Active / Calibrated', dot: 'bg-emerald-500', chip: 'bg-emerald-50 text-emerald-700 border-emerald-200', panel: 'bg-emerald-50 text-emerald-600' },
  PENDING_VERIFICATION: { label: 'Pending Verification', dot: 'bg-amber-500', chip: 'bg-amber-50 text-amber-700 border-amber-200', panel: 'bg-amber-50 text-amber-600' },
  UNDER_CALIBRATION: { label: 'Under Calibration', dot: 'bg-sky-500', chip: 'bg-sky-50 text-sky-700 border-sky-200', panel: 'bg-sky-50 text-sky-600' },
  UNDER_REPAIR: { label: 'Under Repair', dot: 'bg-orange-500', chip: 'bg-orange-50 text-orange-700 border-orange-200', panel: 'bg-orange-50 text-orange-600' },
  OUT_OF_TOLERANCE: { label: 'Out of Tolerance', dot: 'bg-rose-500', chip: 'bg-rose-50 text-rose-700 border-rose-200', panel: 'bg-rose-50 text-rose-600' },
  QUARANTINED: { label: 'Quarantined / Hold', dot: 'bg-rose-500', chip: 'bg-rose-50 text-rose-700 border-rose-200', panel: 'bg-rose-50 text-rose-600' },
  CONDEMNED: { label: 'Condemned', dot: 'bg-slate-500', chip: 'bg-slate-50 text-slate-700 border-slate-200', panel: 'bg-slate-50 text-slate-600' },
  RETIRED: { label: 'Retired / Archived', dot: 'bg-slate-500', chip: 'bg-slate-50 text-slate-700 border-slate-200', panel: 'bg-slate-50 text-slate-600' },
};

function display(value, fallback = '-') {
  return value === null || value === undefined || value === '' ? fallback : value;
}

function formatDate(value, fallback = '-') {
  return formatIstDate(value, fallback);
}

function daysUntil(value) {
  if (!value) return null;
  const due = parseDateOnlyInIst(value);
  const today = parseDateOnlyInIst(todayIstIsoDate());
  if (!due || !today) return null;
  return Math.round((due.getTime() - today.getTime()) / 86_400_000);
}

function FieldTile({ icon: Icon, label, value, mono = false, copyValue, emphasis = false }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    if (!copyValue && !value) return;
    navigator.clipboard?.writeText(String(copyValue || value));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }

  return (
    <div className={`group rounded-2xl border bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-md ${emphasis ? 'border-sky-200 ring-1 ring-sky-100' : 'border-slate-200'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-600 ring-1 ring-sky-100">
            <Icon size={18} strokeWidth={2.1} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-500">{label}</p>
            <p className={`mt-1 truncate text-base font-medium text-slate-950 ${mono ? 'font-mono' : ''}`}>
              {display(value)}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={copy}
          aria-label={`Copy ${label}`}
          title={copied ? 'Copied' : 'Copy'}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 opacity-0 transition-all hover:bg-slate-50 hover:text-sky-600 group-hover:opacity-100"
        >
          <Clipboard size={15} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}

function MetricCard({ label, value, icon: Icon, tone, caption }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card transition hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-md">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-1 truncate text-xl font-semibold text-slate-950">{value}</p>
          {caption ? <p className="mt-1 truncate text-sm text-slate-500">{caption}</p> : null}
        </div>
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tone}`}>
          <Icon size={21} strokeWidth={2.2} />
        </span>
      </div>
    </div>
  );
}

function Panel({ title, subtitle, icon: Icon, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card transition hover:border-sky-200/80">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
          <Icon size={21} strokeWidth={2.2} />
        </span>
        <div>
          <h2 className="text-xl font-semibold text-slate-950">{title}</h2>
          {subtitle ? <p className="text-sm text-slate-500">{subtitle}</p> : null}
        </div>
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}

export function EquipmentDetailPlaceholder() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

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

  const summary = useMemo(() => {
    if (!data) return null;
    const dueDays = daysUntil(data.next_cal_due_date);
    const isOverdue = dueDays !== null && dueDays < 0;
    const status = STATUS_STYLES[data.status] || {
      label: data.status || 'Unknown',
      dot: 'bg-slate-500',
      chip: 'bg-slate-50 text-slate-700 border-slate-200',
      panel: 'bg-slate-50 text-slate-600',
    };

    return {
      status,
      dueDays,
      isOverdue,
      model: data.model_no || data.mfg_model_name || '-',
      type: data.type_name || data.eqm_type || '-',
      accessories: Array.isArray(data.accessories) ? data.accessories : [],
      locationParts: String(data.location_name || '').split('-').map((part) => part.trim()).filter(Boolean),
    };
  }, [data]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 font-sans antialiased">
      <Link
        to="/equipment"
        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-card transition hover:border-sky-200 hover:text-sky-700"
      >
        <ArrowLeft size={14} strokeWidth={2.3} />
        Back to Equipment Inventory
      </Link>

      {loading ? (
        <div className="flex min-h-[48vh] flex-col items-center justify-center gap-3 rounded-lg border border-slate-200 bg-white shadow-card">
          <div className="h-9 w-9 animate-spin rounded-full border-4 border-sky-600 border-t-transparent" />
          <p className="text-sm font-medium text-slate-500">Loading equipment dossier...</p>
        </div>
      ) : null}

      {error ? (
        <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 shadow-card">
          <div className="flex items-start gap-3">
            <Info className="mt-0.5 shrink-0" size={17} />
            <div>
              <h3 className="font-semibold">Equipment record could not be loaded</h3>
              <p className="mt-1 text-sm">{error.response?.data?.error?.message || error.message || 'Unknown retrieval error.'}</p>
            </div>
          </div>
        </div>
      ) : null}

      {data && summary ? (
        <>
          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-card">
            <div className="relative bg-white px-6 py-6 text-slate-900 md:px-8">
              <div className="absolute inset-0 opacity-80 technical-grid-bg" />
              <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-sky-500 via-blue-600 to-emerald-500" />
              <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex min-w-0 items-center gap-5">
                  <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-700 text-white shadow-lg ring-4 ring-sky-50">
                    <Gauge size={42} strokeWidth={1.8} />
                    <span className={`absolute -bottom-1.5 -right-1.5 h-5 w-5 rounded-full border-4 border-white ${summary.status.dot}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="inline-flex items-center gap-2 text-sm font-medium text-sky-700">
                      <PackageCheck size={14} strokeWidth={2.4} />
                      Equipment Detail Dossier
                    </p>
                    <h1 className="mt-2 truncate text-3xl font-semibold text-slate-950 md:text-4xl">{display(data.name, 'Equipment')}</h1>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 font-mono text-sm font-medium text-slate-600">
                        {display(data.equipment_code)}
                      </span>
                      <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium ${summary.status.chip}`}>
                        <span className={`h-2 w-2 rounded-full ${summary.status.dot}`} />
                        {summary.status.label}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid min-w-[280px] grid-cols-2 gap-3">
                  <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3">
                    <p className="text-sm font-medium text-slate-500">Type</p>
                    <p className="mt-1 truncate text-base font-semibold text-slate-950">{summary.type}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3">
                    <p className="text-sm font-medium text-slate-500">Serial No</p>
                    <p className="mt-1 truncate font-mono text-base font-semibold text-slate-950">{display(data.serial_no)}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-4 border-t border-slate-200 bg-slate-50/60 p-4 md:grid-cols-3">
              <MetricCard label="Health" value={summary.isOverdue ? 'Overdue' : summary.status.label} icon={summary.isOverdue ? AlertTriangle : CheckCircle2} tone={summary.isOverdue ? 'bg-rose-50 text-rose-600' : summary.status.panel} />
              <MetricCard label="Calibration Due" value={formatDate(data.next_cal_due_date)} icon={CalendarClock} tone="bg-amber-50 text-amber-600" caption={summary.dueDays === null ? 'No due date' : summary.isOverdue ? `${Math.abs(summary.dueDays)} days overdue` : `${summary.dueDays} days remaining`} />
              <MetricCard label="Accessories" value={summary.accessories.length} icon={Boxes} tone="bg-violet-50 text-violet-600" />
            </div>
          </section>

          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-card">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`inline-flex h-11 items-center gap-2 rounded-xl px-4 text-sm font-medium transition-all ${
                    active ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-sky-700'
                  }`}
                >
                  <Icon size={16} strokeWidth={2.2} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {activeTab === 'overview' ? (
            <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
              <Panel title="Core Specifications" subtitle="Identity and manufacturer details." icon={Tag}>
                <div className="grid gap-4 md:grid-cols-2">
                  <FieldTile icon={Fingerprint} label="Equipment Code" value={data.equipment_code} mono emphasis />
                  <FieldTile icon={Tag} label="Equipment Type" value={summary.type} />
                  <FieldTile icon={Building2} label="Manufacturer" value={data.make} />
                  <FieldTile icon={Gauge} label="Model Number" value={summary.model} mono />
                  <FieldTile icon={Fingerprint} label="Serial Number" value={data.serial_no} mono />
                  <FieldTile icon={ShieldCheck} label="Status Code" value={data.status} mono />
                </div>
              </Panel>

              <aside className="space-y-6">
                <Panel title="Location" subtitle="Division and room allocation." icon={MapPin}>
                  <div className="space-y-4">
                    <FieldTile icon={Building2} label="Division Code" value={data.division_code} mono />
                    <FieldTile icon={MapPin} label="Facility" value={data.location_name} />
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm font-medium text-slate-500">Parsed Location</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {(summary.locationParts.length ? summary.locationParts : ['No split location']).map((part) => (
                          <span key={part} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600">
                            {part}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </Panel>
              </aside>
            </div>
          ) : null}

          {activeTab === 'procurement' ? (
            <Panel title="Procurement and Warranty" subtitle="Purchase order and warranty information." icon={CreditCard}>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <FieldTile icon={CreditCard} label="PO Number" value={data.po_number} mono />
                <FieldTile icon={CalendarClock} label="PO Date" value={formatDate(data.po_date)} />
                <FieldTile icon={CalendarClock} label="Warranty Expiry" value={formatDate(data.warranty_expiry_date)} />
                <FieldTile icon={FileText} label="MIVR Number" value={data.mivr_number} mono />
                <FieldTile icon={Tag} label="Line Item Code" value={data.line_item_code} mono />
              </div>
            </Panel>
          ) : null}

          {activeTab === 'service' ? (
            <div className="space-y-6">
              <Panel title="Calibration and Service Health" subtitle="Operational readiness and maintenance status." icon={Wrench}>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <FieldTile icon={CalendarClock} label="Next Calibration Due" value={formatDate(data.next_cal_due_date)} emphasis={summary.isOverdue} />
                  <FieldTile icon={ShieldCheck} label="Calibration Status" value={summary.isOverdue ? 'Overdue' : 'Valid / monitored'} />
                  <FieldTile icon={Activity} label="Status Date" value={formatDate(data.status_at)} />
                  <FieldTile icon={History} label="Last Event Code" value={data.status} mono />
                </div>
              </Panel>

              <Panel title="Operational Quick Actions" subtitle="Jump into connected equipment workflows." icon={Activity}>
                <div className="grid gap-3 md:grid-cols-2">
                  <Link
                    to={`/job-requests/new?eqid=${encodeURIComponent(data.equipment_id || data.equipment_code || id)}`}
                    className="group rounded-2xl border border-slate-200 bg-slate-50 p-4 transition-all hover:-translate-y-0.5 hover:border-sky-200 hover:bg-sky-50/70 hover:shadow-md"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-base font-semibold text-slate-950">Raise Calibration / Repair Job</p>
                        <p className="mt-1 text-sm text-slate-500">Create a new job request linked to this instrument.</p>
                      </div>
                      <Wrench className="text-sky-600 transition-transform group-hover:rotate-12" size={24} />
                    </div>
                  </Link>
                  <Link
                    to={`/job-cards?eq=${encodeURIComponent(data.equipment_code || id)}`}
                    className="group rounded-2xl border border-slate-200 bg-slate-50 p-4 transition-all hover:-translate-y-0.5 hover:border-sky-200 hover:bg-sky-50/70 hover:shadow-md"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-base font-semibold text-slate-950">View Job Card History</p>
                        <p className="mt-1 text-sm text-slate-500">Review technical service records for this equipment.</p>
                      </div>
                      <History className="text-sky-600 transition-transform group-hover:translate-x-1" size={24} />
                    </div>
                  </Link>
                </div>
              </Panel>
            </div>
          ) : null}

          {activeTab === 'records' ? (
            <div className="space-y-6">
              <Panel title="Administration Records" subtitle="Creation and modification audit metadata." icon={UserRound}>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <FieldTile icon={UserRound} label="Registered By" value={data.created_by} mono />
                  <FieldTile icon={CalendarClock} label="Created On" value={formatDate(data.created_on)} />
                  <FieldTile icon={UserRound} label="Last Modified By" value={data.updated_by} mono />
                  <FieldTile icon={CalendarClock} label="Last Updated Date" value={formatDate(data.updated_on)} />
                </div>
              </Panel>

              <Panel title="Registered Accessories" subtitle="Accessories connected with this equipment." icon={Boxes}>
                {summary.accessories.length > 0 ? (
                  <div className="overflow-x-auto rounded-2xl border border-slate-200">
                    <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                      <thead className="bg-slate-50 text-slate-500">
                        <tr>
                          <th className="px-4 py-3 font-medium">ID</th>
                          <th className="px-4 py-3 font-medium">Type</th>
                          <th className="px-4 py-3 font-medium">Name</th>
                          <th className="px-4 py-3 font-medium">Serial No</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {summary.accessories.map((acc) => (
                          <tr key={acc.id || `${acc.accessory_name}-${acc.serial_no}`} className="transition-colors hover:bg-sky-50/40">
                            <td className="px-4 py-3.5 font-mono font-medium text-slate-500">{display(acc.id)}</td>
                            <td className="px-4 py-3.5 font-medium text-slate-950">{display(acc.accessory_type, 'Other')}</td>
                            <td className="px-4 py-3.5 text-slate-700">{display(acc.accessory_name)}</td>
                            <td className="px-4 py-3.5 font-mono text-slate-500">{display(acc.serial_no)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
                    <Boxes className="mx-auto text-slate-300" size={34} strokeWidth={1.7} />
                    <p className="mt-3 text-base font-semibold text-slate-600">No accessories registered</p>
                    <p className="mt-1 text-sm text-slate-500">Accessory data will appear here when linked to this equipment.</p>
                  </div>
                )}
              </Panel>

              <Panel title="Specifications and Remarks" subtitle="Additional registered notes." icon={FileText}>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <p className="whitespace-pre-wrap text-sm font-medium leading-7 text-slate-600">
                    {data.options_description || data.remarks || 'No detailed specifications or remarks registered for this equipment.'}
                  </p>
                </div>
              </Panel>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
