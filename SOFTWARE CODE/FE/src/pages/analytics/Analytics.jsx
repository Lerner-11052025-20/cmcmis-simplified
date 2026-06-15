// ============================================================================
// src/pages/analytics/Analytics.jsx  -  Business analytics dashboard
// ----------------------------------------------------------------------------
// Redesigned with:
//   • Top row mini-KPI cards mapping live statuses from useDashboardKpis.
//   • Sleek iOS-style segmented button filters.
//   • Responsive layouts and premium action triggers.
// ============================================================================

import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

import { Layout } from '../../components/Layout.jsx';
import { useDashboardKpis } from '../../lib/hooks/useDashboardKpis.js';

import {
  MonthlyActivity,
  EquipmentStatus,
  MonthlyJobs,
  DivisionWise,
  CalibrationCompletion,
  JobTypeDistribution,
  EngineerWorkload,
  CalibrationStatusBreakdown,
  WeeklyActivity,
  JcLifecycleFunnel,
  EquipmentRegistrationTrend,
  PriorityMixTrend,
} from './AnalyticsCharts.jsx';

const DEFAULT_POLL_MS = 30_000;

const WINDOW_OPTIONS = [
  { value: 3, label: '3M' },
  { value: 6, label: '6M' },
  { value: 12, label: '12M' },
  { value: 24, label: '24M' },
];

const LANE_OPTIONS = [
  { value: '', label: 'All Lanes' },
  { value: 'TME_CAL', label: 'TME CAL' },
  { value: 'TME_REPAIR', label: 'TME REPAIR' },
  { value: 'FPE_CAL', label: 'FPE CAL' },
  { value: 'FPE_REPAIR', label: 'FPE REPAIR' },
];

function MiniKpiCard({ title, value, subtitle, accent = 'indigo', loading }) {
  const accentBorder = 
    accent === 'amber' ? 'border-l-amber-500' :
    accent === 'green' ? 'border-l-emerald-500' :
    accent === 'blue' ? 'border-l-sky-500' :
    'border-l-indigo-500';

  const accentText = 
    accent === 'amber' ? 'text-amber-500' :
    accent === 'green' ? 'text-emerald-500' :
    accent === 'blue' ? 'text-sky-500' :
    'text-indigo-500';

  return (
    <div className={`rounded-xl border border-slate-200/50 border-l-4 ${accentBorder} bg-white p-4 shadow-[0_2px_8px_rgba(15,23,42,0.015)] hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between h-20`}>
      {loading ? (
        <div className="space-y-2 animate-pulse w-full">
          <div className="h-3 w-2/3 bg-slate-100 rounded" />
          <div className="h-6 w-1/3 bg-slate-100 rounded" />
        </div>
      ) : (
        <>
          <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider font-sans">{title}</p>
          <div className="flex items-baseline justify-between mt-1 font-sans">
            <span className="text-xl font-black text-slate-800 tracking-tight tabular-nums">{value}</span>
            {subtitle && (
              <span className={`text-[10px] font-bold ${accentText} ml-2`}>{subtitle}</span>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export function Analytics() {
  const [months, setMonths] = useState(6);
  const [laneCode, setLaneCode] = useState('');
  const qc = useQueryClient();

  const { data: kpiData, loading: kpisLoading } = useDashboardKpis();

  const params = useMemo(() => ({
    months,
    laneCode: laneCode || undefined,
  }), [months, laneCode]);

  function refreshAll() {
    qc.invalidateQueries({ queryKey: ['chart'] });
    toast.message('Refreshing analytics charts...');
  }

  // extract KPI values for stats row
  const cards = kpiData?.cards || [];
  const pendingVal = cards.find(c => c.id === 'pending_jobs' || c.id === 'active_requests')?.value ?? '-';
  const progressVal = cards.find(c => c.id === 'in_progress_jobs' || c.id === 'in_progress')?.value ?? '-';
  const completedVal = cards.find(c => c.id === 'completed_this_week' || c.id === 'completed_this_month')?.value ?? '-';
  const equipmentVal = cards.find(c => c.id === 'total_active_equipment' || c.id === 'my_equipment')?.value ?? '-';

  return (
    <Layout>
      <div className="space-y-6">
        
        {/* Header Section */}
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-800 font-sans">Analytics</h1>
            <p className="text-xs font-semibold text-slate-400 font-sans mt-0.5">Real-time operational metrics and performance charts</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Time Window Option Buttons */}
            <div className="inline-flex rounded-xl bg-slate-100 p-0.5 border border-slate-200/20">
              {WINDOW_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setMonths(option.value)}
                  className={`h-8 px-4 text-xs font-bold rounded-lg transition-all ${
                    months === option.value
                      ? 'bg-white text-indigo-600 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {/* Lane Selection Option Buttons */}
            <div className="inline-flex flex-wrap rounded-xl bg-slate-100 p-0.5 border border-slate-200/20">
              {LANE_OPTIONS.map((option) => (
                <button
                  key={option.value || 'all'}
                  type="button"
                  onClick={() => setLaneCode(option.value)}
                  className={`h-8 px-3 text-xs font-bold rounded-lg transition-all ${
                    laneCode === option.value
                      ? 'bg-white text-slate-800 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={refreshAll}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-4 text-xs font-bold text-white shadow-md shadow-indigo-100 transition-all hover:-translate-y-0.5"
            >
              <RefreshCw size={13} strokeWidth={2.5} />
              Refresh All
            </button>
          </div>
        </div>

        {/* Live KPI Statistics Row */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MiniKpiCard
            title="Pending For Conversion"
            value={pendingVal}
            subtitle="Job requests waiting"
            accent="amber"
            loading={kpisLoading}
          />
          <MiniKpiCard
            title="Job On Hand"
            value={progressVal}
            subtitle="Open active requests"
            accent="blue"
            loading={kpisLoading}
          />
          <MiniKpiCard
            title="Review Pending"
            value={completedVal}
            subtitle="Completed this week"
            accent="green"
            loading={kpisLoading}
          />
          <MiniKpiCard
            title="Active Equipment"
            value={equipmentVal}
            subtitle="Total registered assets"
            accent="indigo"
            loading={kpisLoading}
          />
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <WeeklyActivity             params={params} pollMs={DEFAULT_POLL_MS} />
          <MonthlyActivity            params={params} pollMs={DEFAULT_POLL_MS} />
          <MonthlyJobs                params={params} pollMs={DEFAULT_POLL_MS} />
          <CalibrationCompletion      params={params} pollMs={DEFAULT_POLL_MS} />
          <PriorityMixTrend           params={params} pollMs={DEFAULT_POLL_MS} />
          <JobTypeDistribution        params={params} pollMs={DEFAULT_POLL_MS} />
          <EquipmentRegistrationTrend params={params} pollMs={DEFAULT_POLL_MS} />
          <EngineerWorkload           params={params} pollMs={DEFAULT_POLL_MS} />
          <EquipmentStatus            params={params} pollMs={DEFAULT_POLL_MS} />
          <DivisionWise               params={params} pollMs={DEFAULT_POLL_MS} />
          <CalibrationStatusBreakdown params={params} pollMs={DEFAULT_POLL_MS} />
          <JcLifecycleFunnel          params={params} pollMs={DEFAULT_POLL_MS} />
        </div>
      </div>
    </Layout>
  );
}

