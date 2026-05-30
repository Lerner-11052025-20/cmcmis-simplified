// ============================================================================
// src/pages/admin/capacity/LabCapacity.jsx  —  Lab Capacity & Live Workload
// ----------------------------------------------------------------------------
// Overhauled highly professional, premium operational dashboard.
// Restricts capacity control strictly under SUPER_ADMIN and LAB_IN_CHARGE.
// ============================================================================

import { useEffect, useState, useMemo } from 'react';
import {
  LineChart, RefreshCw, AlertCircle, Shield, ClipboardList, CheckCircle, BarChart3, Wrench, Users, Flame
} from 'lucide-react';
import clsx from 'clsx';
import { toast } from 'sonner';

import { Spinner } from '../../../components/ui/Spinner.jsx';
import { fetchLabCapacity } from '../../../lib/api/capacity.js';

// ── Custom Local KPI Card (Matches Admin Style) ──────────────────────
function LocalKpiCard({ label, value, icon: Icon, accent, subtitle, loading }) {
  const ACCENT_COLORS = {
    indigo:  { bg: 'bg-indigo-50/60',   text: 'text-indigo-600',   topBorder: 'border-t-indigo-500/80',  glow: 'hover:shadow-[0_20px_25px_-5px_rgba(79,93,255,0.06)] hover:border-indigo-200', indicator: 'bg-indigo-500' },
    emerald: { bg: 'bg-emerald-50/60', text: 'text-emerald-600', topBorder: 'border-t-emerald-500/80', glow: 'hover:shadow-[0_20px_25px_-5px_rgba(16,185,129,0.06)] hover:border-emerald-200', indicator: 'bg-emerald-500' },
    amber:   { bg: 'bg-amber-50/60',   text: 'text-amber-600',   topBorder: 'border-t-amber-500/80',   glow: 'hover:shadow-[0_20px_25px_-5px_rgba(245,158,11,0.06)] hover:border-amber-200', indicator: 'bg-amber-500' },
  };

  const color = ACCENT_COLORS[accent] || ACCENT_COLORS.indigo;

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/40 border-t-[4px] border-t-slate-200 p-5 animate-pulse flex flex-col font-sans">
        <div className="w-10 h-10 rounded-xl bg-slate-100/80" />
        <div className="mt-4 h-7 w-16 bg-slate-100 rounded" />
        <div className="mt-2.5 h-3 w-28 bg-slate-100 rounded" />
        <div className="mt-2.5 h-2.5 w-32 bg-slate-100 rounded" />
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

// ── Horizontal Progress Bar Row ──────────────────────────────────────
function ProgressBarRow({ label, count, max }) {
  const percent = max > 0 ? Math.min(Math.round((count / max) * 100), 100) : 0;
  return (
    <div className="space-y-1.5 font-sans">
      <div className="flex justify-between items-center text-xs">
        <span className="font-extrabold text-slate-700 uppercase tracking-tight">{label}</span>
        <span className="font-bold text-slate-500 tabular-nums">{count} active JCs ({percent}%)</span>
      </div>
      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-accent rounded-full transition-all duration-500 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

// ── SLA Circular Dial Component ──────────────────────────────────────
function SlaDial({ label, rate, accent }) {
  const ACCENTS = {
    indigo:  { stroke: 'stroke-indigo-600',   text: 'text-indigo-600',   bg: 'bg-indigo-50/60' },
    emerald: { stroke: 'stroke-emerald-600', text: 'text-emerald-600', bg: 'bg-emerald-50/60' },
    amber:   { stroke: 'stroke-amber-600',   text: 'text-amber-600',   bg: 'bg-amber-50/60' },
  };
  const color = ACCENTS[accent] || ACCENTS.indigo;

  // SVG parameters
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (rate / 100) * circumference;

  return (
    <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl flex items-center gap-4 shadow-sm select-none font-sans">
      <div className="relative w-18 h-18 shrink-0 flex items-center justify-center">
        <svg className="w-full h-full -rotate-90">
          <circle
            cx="36"
            cy="36"
            r={radius}
            className="stroke-slate-200 fill-none"
            strokeWidth="5"
          />
          <circle
            cx="36"
            cy="36"
            r={radius}
            className={clsx("fill-none transition-all duration-1000 ease-out", color.stroke)}
            strokeWidth="5"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </svg>
        <span className={clsx("absolute text-xs font-black tracking-tight", color.text)}>
          {rate}%
        </span>
      </div>
      <div>
        <div className="text-xs font-black uppercase text-slate-400 tracking-wider">
          {label}
        </div>
        <div className="text-sm font-extrabold text-slate-800 mt-0.5">
          SLA Compliance
        </div>
        <div className="text-[10px] text-slate-400 font-semibold mt-0.5">
          Target dates vs actuals
        </div>
      </div>
    </div>
  );
}

export function LabCapacity() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load lab metrics
  async function loadMetrics() {
    setLoading(true);
    try {
      const res = await fetchLabCapacity();
      setData(res);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load lab capacity metrics');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMetrics();
  }, []);

  // Compute metric sums for KPIs
  const kpiValues = useMemo(() => {
    if (!data) return { activeTotal: 0, criticalCount: 0, overallSla: 100 };
    const activeTotal = data.engineerWorkload.reduce((sum, e) => sum + e.active_jobs, 0);
    const criticalCount = data.engineerWorkload.filter(e => e.active_jobs > 5).length;
    return {
      activeTotal,
      criticalCount,
      overallSla: data.sla?.overall ?? 100
    };
  }, [data]);

  // Find max queue to render progress bars proportionally
  const maxQueue = useMemo(() => {
    if (!data || !data.instrumentQueue.length) return 0;
    return Math.max(...data.instrumentQueue.map(i => i.queue_count));
  }, [data]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      
      {/* ── Page Header ── */}
      <div className="flex justify-between items-center select-none">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Admin · Lab Capacity & Workloads</h1>
          <p className="text-sm text-ink-soft mt-1">
            Real-time technician allocation density, SLA turnaround stats, and instrument category bottlenecks.
          </p>
        </div>
        <button
          type="button"
          onClick={loadMetrics}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-3 text-xs font-semibold text-slate-600 transition-colors shadow-sm select-none"
          disabled={loading}
        >
          <RefreshCw size={13} className={clsx(loading && "animate-spin")} />
          Refresh Stats
        </button>
      </div>

      {/* ── KPI Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 select-none">
        <LocalKpiCard
          loading={loading && !data}
          label="Total Active Backlog"
          value={kpiValues.activeTotal}
          icon={ClipboardList}
          accent="indigo"
          subtitle="Open job cards in pipeline"
        />
        <LocalKpiCard
          loading={loading && !data}
          label="Bottleneck Alerts"
          value={`${kpiValues.criticalCount} Engineers`}
          icon={Flame}
          accent="amber"
          subtitle="Technicians holding >5 active JCs"
        />
        <LocalKpiCard
          loading={loading && !data}
          label="Overall SLA Compliance"
          value={`${kpiValues.overallSla}%`}
          icon={CheckCircle}
          accent="emerald"
          subtitle="On-time vs delayed closures"
        />
      </div>

      {loading && !data ? (
        <div className="flex h-60 items-center justify-center bg-white rounded-2xl border border-slate-200/50 shadow-sm">
          <div className="flex flex-col items-center gap-3">
            <Spinner size={32} className="text-accent" />
            <p className="text-xs font-extrabold text-slate-400 uppercase tracking-widest animate-pulse">Retrieving Real-Time Queue Logs...</p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">

          {/* ── Section: SLA Target Dials ── */}
          <div className="bg-white rounded-2xl border border-slate-200/50 p-5 shadow-[0_2px_8px_rgba(15,23,42,0.01)] space-y-4">
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 border-b border-slate-100 pb-3 flex items-center gap-1.5 select-none">
              <BarChart3 size={13} className="text-slate-400" />
              SLA Turnaround Tracker
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <SlaDial label="Overall Calibration & Repair" rate={data?.sla?.overall ?? 100} accent="indigo" />
              <SlaDial label="Calibration Workflows Only" rate={data?.sla?.calibration ?? 100} accent="emerald" />
              <SlaDial label="Repair & Maintenance Only" rate={data?.sla?.repair ?? 100} accent="amber" />
            </div>
          </div>

          {/* ── Two Column Operational View ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Left Side: Technician Workload Heatmap Table */}
            <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/50 shadow-[0_2px_8px_rgba(15,23,42,0.01)] p-5 space-y-4">
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 border-b border-slate-100 pb-3 flex items-center gap-2 select-none">
                <Users size={14} className="text-slate-400" />
                Technician Workload & cycle metrics
              </h2>
              
              <div className="overflow-x-auto rounded-xl border border-slate-100">
                <table className="w-full text-left border-collapse text-xs select-none">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <th className="py-3 px-4">Technician</th>
                      <th className="py-3 px-4 text-center">Active Jobs</th>
                      <th className="py-3 px-4 text-center">Pending Approvals</th>
                      <th className="py-3 px-4 text-center">Avg. Cycle Speed</th>
                      <th className="py-3 px-4 text-center">Load Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 font-sans font-semibold text-slate-700">
                    {data?.engineerWorkload.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="py-6 text-center text-slate-400 font-bold uppercase tracking-wider">
                          No active workloads found in queue.
                        </td>
                      </tr>
                    ) : (
                      data?.engineerWorkload.map((tech) => {
                        const jobs = tech.active_jobs;
                        // Load status thresholds
                        let statusText = 'Low Load';
                        let statusColor = 'bg-emerald-50 border-emerald-100 text-emerald-700';
                        let dotColor = 'bg-emerald-500';

                        if (jobs > 5) {
                          statusText = 'Critical Load';
                          statusColor = 'bg-red-50 border-red-150 text-red-700 animate-pulse';
                          dotColor = 'bg-red-500';
                        } else if (jobs >= 3) {
                          statusText = 'Moderate Load';
                          statusColor = 'bg-amber-50 border-amber-100 text-amber-700';
                          dotColor = 'bg-amber-500';
                        }

                        return (
                          <tr key={tech.engineer_employee_id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-3 px-4">
                              <div className="font-extrabold text-slate-800 leading-normal">{tech.engineer_name}</div>
                              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-0.5">ID: #{tech.engineer_employee_id}</div>
                            </td>
                            <td className="py-3 px-4 text-center text-sm font-bold text-slate-800 tabular-nums">
                              {jobs}
                            </td>
                            <td className="py-3 px-4 text-center font-bold text-slate-500 tabular-nums">
                              {tech.pending_approvals}
                            </td>
                            <td className="py-3 px-4 text-center text-slate-650 tabular-nums">
                              {tech.avg_cycle_days !== null ? `${tech.avg_cycle_days} days` : '—'}
                            </td>
                            <td className="py-3 px-4 text-center select-none">
                              <span className={clsx(
                                "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border shadow-sm",
                                statusColor
                              )}>
                                <span className={clsx("h-1.5 w-1.5 rounded-full shrink-0", dotColor)} />
                                {statusText}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right Side: Instrument Category Backlogs Progress Bars */}
            <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/50 shadow-[0_2px_8px_rgba(15,23,42,0.01)] p-5 space-y-4">
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 border-b border-slate-100 pb-3 flex items-center gap-2 select-none">
                <Wrench size={14} className="text-slate-400" />
                Instrument Category Backlogs
              </h2>

              <div className="space-y-4 pt-1">
                {data?.instrumentQueue.length === 0 ? (
                  <p className="text-center text-slate-400 font-bold uppercase tracking-wider text-xs py-4">
                    No active category queues.
                  </p>
                ) : (
                  data?.instrumentQueue.map((queue) => (
                    <ProgressBarRow
                      key={queue.category_name}
                      label={queue.category_name}
                      count={queue.queue_count}
                      max={maxQueue}
                    />
                  ))
                )}
              </div>

              <div className="rounded-xl bg-indigo-50/40 border border-indigo-100/50 p-4 select-none flex gap-2.5 shadow-sm font-sans mt-3">
                <AlertCircle size={15} className="text-indigo-650 shrink-0 mt-0.5" />
                <div className="text-[10.5px] font-bold text-indigo-750 leading-relaxed">
                  <span className="uppercase tracking-wider font-black block mb-0.5 text-indigo-850">Procurement Priority Tip</span>
                  Instrument groups displaying the longest backlog queues represent high laboratory utilization bottlenecks. Target these categories first in next-cycle capital equipment purchases.
                </div>
              </div>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
