// ============================================================================
// src/pages/admin/capacity/LabCapacity.jsx  —  Lab Capacity & Live Workload
// ----------------------------------------------------------------------------
// Overhauled highly professional, premium, business-oriented dashboard.
// Gated strictly under SUPER_ADMIN and LAB_IN_CHARGE roles.
// Redesigned to use standard mixed-case / title-case Google Inter fonts 
// (no uppercase or small-caps overrides) exactly matching the rest of the app.
// ============================================================================

import { useEffect, useState, useMemo } from 'react';
import {
  RefreshCw, ClipboardList, CheckCircle, BarChart3, Users, Flame
} from 'lucide-react';
import clsx from 'clsx';
import { toast } from 'sonner';

import { Spinner } from '../../../components/ui/Spinner.jsx';
import { fetchLabCapacity } from '../../../lib/api/capacity.js';

// ── Custom Local KPI Card (Matches Admin Style) ──────────────────────
function LocalKpiCard({ label, value, icon: Icon, accent, subtitle, loading }) {
  const ACCENT_COLORS = {
    indigo:  { bg: 'bg-indigo-50/60',   text: 'text-indigo-650',   topBorder: 'border-t-indigo-500/80',  glow: 'hover:shadow-[0_20px_25px_-5px_rgba(79,93,255,0.04)] hover:border-indigo-200', indicator: 'bg-indigo-500' },
    emerald: { bg: 'bg-emerald-50/60', text: 'text-emerald-655', topBorder: 'border-t-emerald-500/80', glow: 'hover:shadow-[0_20px_25px_-5px_rgba(16,185,129,0.04)] hover:border-emerald-200', indicator: 'bg-emerald-500' },
    amber:   { bg: 'bg-amber-50/60',   text: 'text-amber-655',   topBorder: 'border-t-amber-500/80',   glow: 'hover:shadow-[0_20px_25px_-5px_rgba(245,158,11,0.04)] hover:border-amber-200', indicator: 'bg-amber-500' },
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
        'group bg-white rounded-2xl border border-slate-200/50 p-5 border-t-[4px] transition-all duration-300 shadow-[0_2px_8px_rgba(15,23,42,0.015)] hover:shadow-lg font-sans antialiased hover:-translate-y-0.5',
        color.topBorder,
        color.glow
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

// ── SLA Circular Dial Component ──────────────────────────────────────
function SlaDial({ label, rate, accent }) {
  const ACCENTS = {
    indigo:  { stroke: 'stroke-indigo-500',  text: 'text-indigo-650',  bg: 'bg-indigo-50/40' },
    emerald: { stroke: 'stroke-emerald-500', text: 'text-emerald-655', bg: 'bg-emerald-50/40' },
    amber:   { stroke: 'stroke-amber-500',   text: 'text-amber-655',   bg: 'bg-amber-50/40' },
  };
  const color = ACCENTS[accent] || ACCENTS.indigo;

  // SVG parameters
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (rate / 100) * circumference;

  return (
    <div className="bg-slate-50/60 border border-slate-200/80 p-4 rounded-xl flex items-center gap-4 shadow-sm select-none font-sans min-w-0 flex-1">
      <div className="relative w-16 h-16 shrink-0 flex items-center justify-center bg-white rounded-full shadow-inner border border-slate-100">
        <svg viewBox="0 0 64 64" className="w-full h-full -rotate-90">
          <circle
            cx="32"
            cy="32"
            r={radius}
            fill="none"
            className="stroke-slate-100"
            strokeWidth="4.5"
          />
          <circle
            cx="32"
            cy="32"
            r={radius}
            fill="none"
            className={clsx("transition-all duration-1000 ease-out", color.stroke)}
            strokeWidth="4.5"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </svg>
        <span className={clsx("absolute text-xs font-bold tracking-tight tabular-nums", color.text)}>
          {rate}%
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-semibold text-slate-500 tracking-tight truncate" title={label}>
          {label}
        </div>
        <div className="text-xs font-bold text-slate-700 mt-0.5 leading-tight">
          SLA Compliance
        </div>
        <div className="text-[10px] text-slate-400 font-normal mt-0.5 truncate">
          On-time completions
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

  return (
    <div className="space-y-6 max-w-6xl mx-auto w-full px-1 font-sans">
      
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between justify-start gap-4 select-none">
        <div>
          <h1 className="text-2xl font-bold text-ink tracking-tight">Admin · Lab Capacity & Workloads</h1>
          <p className="text-xs sm:text-sm text-ink-soft mt-1.5">
            Real-time technician allocation density, SLA turnaround stats, and instrument category bottlenecks.
          </p>
        </div>
        <button
          type="button"
          onClick={loadMetrics}
          className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-4 text-xs font-semibold text-slate-655 transition-all shadow-sm select-none active:scale-98"
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
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest animate-pulse">Retrieving Real-Time Queue Logs...</p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">

          {/* ── Section: SLA Target Dials ── */}
          <div className="bg-white rounded-2xl border border-slate-200/50 p-5 shadow-[0_2px_8px_rgba(15,23,42,0.01)] space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-3 flex items-center gap-2 select-none">
              <BarChart3 size={14} className="text-slate-400" />
              SLA Turnaround Tracker
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <SlaDial label="Overall Calibration & Repair" rate={data?.sla?.overall ?? 100} accent="indigo" />
              <SlaDial label="Calibration Workflows Only" rate={data?.sla?.calibration ?? 100} accent="emerald" />
              <SlaDial label="Repair & Maintenance Only" rate={data?.sla?.repair ?? 100} accent="amber" />
            </div>
          </div>

          {/* ── Linear Full-Width Operational View ── */}
          <div className="bg-white rounded-2xl border border-slate-200/50 shadow-[0_2px_8px_rgba(15,23,42,0.01)] p-6 space-y-5 w-full">
            <h2 className="text-xs font-bold text-slate-500 border-b border-slate-100 pb-3 flex items-center gap-2 select-none">
              <Users size={14} className="text-slate-400" />
              Technician Workload & Cycle Metrics (Spacious Roster)
            </h2>
            
            <div className="overflow-x-auto rounded-xl border border-slate-100/80 shadow-inner no-scrollbar">
              <table className="w-full text-left border-collapse text-xs select-none">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                    <th className="py-4 px-6 min-w-[240px]">Technician Details</th>
                    <th className="py-4 px-6 text-center min-w-[120px]">Active Jobs</th>
                    <th className="py-4 px-6 text-center min-w-[160px]">Pending Manager Approvals</th>
                    <th className="py-4 px-6 text-center min-w-[160px]">Average Resolution Speed</th>
                    <th className="py-4 px-6 text-center min-w-[160px]">Operational Load Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 font-sans font-medium text-slate-600">
                  {data?.engineerWorkload.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="py-10 text-center text-slate-400 font-bold uppercase tracking-wider">
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
                        statusColor = 'bg-red-50 border-red-150 text-red-700 animate-pulse-radar';
                        dotColor = 'bg-red-500';
                      } else if (jobs >= 3) {
                        statusText = 'Moderate Load';
                        statusColor = 'bg-amber-50 border-amber-100 text-amber-700';
                        dotColor = 'bg-amber-500';
                      }

                      return (
                        <tr key={tech.engineer_employee_id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-4 px-6">
                            <div className="font-bold text-slate-800 text-sm leading-normal">{tech.engineer_name}</div>
                            <div className="text-[10px] text-slate-450 font-medium uppercase tracking-wider mt-1">ID: #{tech.engineer_employee_id}</div>
                          </td>
                          <td className="py-4 px-6 text-center text-base font-bold text-slate-800 tabular-nums">
                            {jobs}
                          </td>
                          <td className="py-4 px-6 text-center text-sm font-semibold text-slate-550 tabular-nums">
                            {tech.pending_approvals}
                          </td>
                          <td className="py-4 px-6 text-center text-sm text-slate-655 font-medium tabular-nums">
                            {tech.avg_cycle_days !== null ? `${tech.avg_cycle_days} days` : '—'}
                          </td>
                          <td className="py-4 px-6 text-center select-none">
                            <span className={clsx(
                              "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border shadow-sm",
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

        </div>
      )}

    </div>
  );
}
