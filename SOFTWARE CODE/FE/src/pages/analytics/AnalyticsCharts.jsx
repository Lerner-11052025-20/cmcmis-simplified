// ============================================================================
// src/pages/analytics/AnalyticsCharts.jsx  —  12 chart cards (G1..G12)
// ----------------------------------------------------------------------------
// Redesigned with:
//   • SVG drop-shadow filters for premium glowing line charts.
//   • Custom Tailwind visual tooltips with circular color markers.
//   • Rounded-radii bars for a softer look.
//   • Comprehensive table schemas for the interactive table toggle.
// ============================================================================

import { useMemo } from 'react';
import {
  AreaChart, Area,
  LineChart, Line,
  BarChart, Bar,
  PieChart, Pie, Cell,
  RadialBarChart, RadialBar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Funnel, FunnelChart, LabelList,
} from 'recharts';
import { toast } from 'sonner';

import { useChart } from '../../lib/hooks/useReport.js';
import { downloadChartCsv } from '../../lib/api/reports.js';
import {
  PALETTE, STATUS_COLORS, TICK, ANIMATION_MS, ANIMATION_EASING,
  MARGIN, GRID, TOOLTIP_CURSOR,
} from './chartTheme2.js';
import { ChartCard } from './ChartCard.jsx';

// ── Shared helpers ─────────────────────────────────────────────────────

function useChartQ(key, params, pollMs) {
  return useChart(key, params, {
    refetchInterval: pollMs,
    refetchOnWindowFocus: true,
  });
}

function downloadHandler(key, params, title) {
  return async () => {
    try {
      const id = toast.loading(`Preparing ${title} CSV…`);
      const { filename } = await downloadChartCsv(key, params);
      toast.success(`Downloaded ${filename}`, { id });
    } catch (e) {
      toast.error(`CSV failed: ${e.response?.data?.error?.message || e.message}`);
    }
  };
}

function sum(rows, key) {
  if (!Array.isArray(rows)) return 0;
  return rows.reduce((a, r) => a + (Number(r[key]) || 0), 0);
}

/** Custom premium tooltip component */
function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border border-slate-100 bg-white/95 p-3 shadow-[0_10px_25px_-5px_rgba(15,23,42,0.08)] backdrop-blur-md font-sans">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">{label}</p>
        <div className="space-y-1.5">
          {payload.map((item, idx) => (
            <div key={idx} className="flex items-center gap-3 text-xs">
              <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: item.color || item.fill }} />
              <span className="text-slate-500 font-semibold">{item.name}</span>
              <span className="font-bold text-slate-800 ml-auto tabular-nums">
                {Number(item.value).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
}

// ────────────────────────────────────────────────────────────────────
//  G1 — Monthly Activity Trends   (BAR, calibrations vs repairs)
// ────────────────────────────────────────────────────────────────────
export function MonthlyActivity({ params, pollMs }) {
  const q = useChartQ('monthlyActivity', params, pollMs);
  const data = q.data || [];
  const total = sum(data, 'calibrations') + sum(data, 'repairs');

  const columns = [
    { header: 'Month', key: 'month' },
    { header: 'Calibrations', key: 'calibrations', format: (v) => v.toLocaleString() },
    { header: 'Repairs', key: 'repairs', format: (v) => v.toLocaleString() },
  ];

  return (
    <ChartCard
      title="Monthly Throughput Growth"
      subtitle="Calibration and repair volume"
      stat={{ value: total.toLocaleString(), accent: 'blue' }}
      loading={q.isLoading}
      error={q.error}
      isFetching={q.isFetching}
      dataUpdatedAt={q.dataUpdatedAt}
      onRefresh={q.refetch}
      onDownloadCsv={downloadHandler('monthlyActivity', params, 'Monthly Activity')}
      data={data}
      columns={columns}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={MARGIN}>
          <CartesianGrid {...GRID} />
          <XAxis dataKey="month" tick={TICK} axisLine={false} tickLine={false} />
          <YAxis tick={TICK} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip cursor={{ fill: 'rgba(148, 163, 184, 0.04)' }} content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: 11, fontWeight: 500 }} iconType="circle" iconSize={8} />
          <Bar dataKey="calibrations" name="Calibrations" fill={PALETTE[0]} radius={[5, 5, 0, 0]} animationDuration={ANIMATION_MS} />
          <Bar dataKey="repairs" name="Repairs" fill={PALETTE[2]} radius={[5, 5, 0, 0]} animationDuration={ANIMATION_MS} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ────────────────────────────────────────────────────────────────────
//  G2 — Equipment Status   (DONUT)
// ────────────────────────────────────────────────────────────────────
export function EquipmentStatus({ params, pollMs }) {
  const q = useChartQ('equipmentStatus', params, pollMs);
  const data = q.data || [];
  const total = sum(data, 'count');

  const columns = [
    { header: 'Status', key: 'status' },
    { header: 'Count', key: 'count', format: (v) => v.toLocaleString() },
  ];

  return (
    <ChartCard
      title="Equipment Status"
      subtitle="Live distribution from cmms_eqip_mst"
      stat={{ value: `${total.toLocaleString()} total`, accent: 'green' }}
      loading={q.isLoading}
      error={q.error}
      isFetching={q.isFetching}
      dataUpdatedAt={q.dataUpdatedAt}
      onRefresh={q.refetch}
      onDownloadCsv={downloadHandler('equipmentStatus', params, 'Equipment Status')}
      data={data}
      columns={columns}
    >
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="count" nameKey="status"
               innerRadius="62%" outerRadius="88%" paddingAngle={3}
               animationDuration={ANIMATION_MS} animationEasing={ANIMATION_EASING}>
            {data.map((d, i) => (
              <Cell key={d.status} fill={STATUS_COLORS[d.status] || PALETTE[i % PALETTE.length]}
                    stroke="white" strokeWidth={2.5} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: 11, fontWeight: 500 }} iconType="circle" iconSize={8} />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ────────────────────────────────────────────────────────────────────
//  G3 — Monthly Job Trends   (BAR, completed vs pending)
// ────────────────────────────────────────────────────────────────────
export function MonthlyJobs({ params, pollMs }) {
  const q = useChartQ('monthlyJobs', params, pollMs);
  const data = q.data || [];
  const totalCompleted = sum(data, 'completed');

  const columns = [
    { header: 'Month', key: 'month' },
    { header: 'Completed', key: 'completed', format: (v) => v.toLocaleString() },
    { header: 'Pending', key: 'pending', format: (v) => v.toLocaleString() },
  ];

  return (
    <ChartCard
      title="Request Closure Performance"
      subtitle="Completed work compared with open demand"
      stat={{ value: `${totalCompleted.toLocaleString()} done`, accent: 'green' }}
      loading={q.isLoading}
      error={q.error}
      isFetching={q.isFetching}
      dataUpdatedAt={q.dataUpdatedAt}
      onRefresh={q.refetch}
      onDownloadCsv={downloadHandler('monthlyJobs', params, 'Monthly Jobs')}
      data={data}
      columns={columns}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={MARGIN}>
          <CartesianGrid {...GRID} />
          <XAxis dataKey="month" tick={TICK} axisLine={false} tickLine={false} />
          <YAxis tick={TICK} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip cursor={{ fill: 'rgba(148, 163, 184, 0.04)' }} content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: 11, fontWeight: 500 }} iconType="circle" iconSize={8} />
          <Bar dataKey="completed" name="Completed" fill={PALETTE[1]} radius={[5, 5, 0, 0]} animationDuration={ANIMATION_MS} />
          <Bar dataKey="pending"   name="Pending" fill={PALETTE[2]} radius={[5, 5, 0, 0]} animationDuration={ANIMATION_MS} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ────────────────────────────────────────────────────────────────────
//  G4 — Division-wise Jobs   (PIE)
// ────────────────────────────────────────────────────────────────────
export function DivisionWise({ params, pollMs }) {
  const q = useChartQ('divisionWise', params, pollMs);
  const data = q.data || [];

  const columns = [
    { header: 'Division', key: 'division' },
    { header: 'Volume', key: 'count', format: (v) => v.toLocaleString() },
  ];

  return (
    <ChartCard
      title="Division-wise Jobs"
      subtitle="Top 8 divisions by JR volume"
      loading={q.isLoading}
      error={q.error}
      isFetching={q.isFetching}
      dataUpdatedAt={q.dataUpdatedAt}
      onRefresh={q.refetch}
      onDownloadCsv={downloadHandler('divisionWise', params, 'Division-wise Jobs')}
      data={data}
      columns={columns}
    >
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="count" nameKey="division"
               outerRadius="82%" paddingAngle={2}
               animationDuration={ANIMATION_MS} animationEasing={ANIMATION_EASING}
               label={(d) => `${Math.round((d.percent || 0) * 100)}%`}
               labelLine={false}>
            {data.map((d, i) => (
              <Cell key={d.division} fill={PALETTE[i % PALETTE.length]} stroke="white" strokeWidth={2} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: 11, fontWeight: 500 }} iconType="circle" iconSize={8} />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ────────────────────────────────────────────────────────────────────
//  G5 — Calibration Completion Trend   (BAR, on-time vs delayed)
// ────────────────────────────────────────────────────────────────────
export function CalibrationCompletion({ params, pollMs }) {
  const q = useChartQ('calibrationCompletion', params, pollMs);
  const data = q.data || [];
  const onTime = sum(data, 'on_time');
  const delayed = sum(data, 'delayed');
  const rate = (onTime + delayed) === 0 ? null : Math.round(onTime / (onTime + delayed) * 100);

  const columns = [
    { header: 'Month', key: 'month' },
    { header: 'On Time', key: 'on_time', format: (v) => v.toLocaleString() },
    { header: 'Delayed', key: 'delayed', format: (v) => v.toLocaleString() },
  ];

  return (
    <ChartCard
      title="Calibration SLA Trend"
      subtitle="On-time completions against delayed work"
      stat={rate !== null ? { value: `${rate}% on-time`, accent: rate >= 80 ? 'green' : 'amber' } : null}
      loading={q.isLoading}
      error={q.error}
      isFetching={q.isFetching}
      dataUpdatedAt={q.dataUpdatedAt}
      onRefresh={q.refetch}
      onDownloadCsv={downloadHandler('calibrationCompletion', params, 'Calibration Completion')}
      data={data}
      columns={columns}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={MARGIN}>
          <CartesianGrid {...GRID} />
          <XAxis dataKey="month" tick={TICK} axisLine={false} tickLine={false} />
          <YAxis tick={TICK} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip cursor={{ fill: 'rgba(148, 163, 184, 0.04)' }} content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: 11, fontWeight: 500 }} iconType="circle" iconSize={8} />
          <Bar dataKey="on_time" name="On Time" fill={PALETTE[1]} radius={[5, 5, 0, 0]} animationDuration={ANIMATION_MS} />
          <Bar dataKey="delayed" name="Delayed" fill={PALETTE[3]} radius={[5, 5, 0, 0]} animationDuration={ANIMATION_MS} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ────────────────────────────────────────────────────────────────────
//  G6 — Job Type Distribution   (BAR)
// ────────────────────────────────────────────────────────────────────
export function JobTypeDistribution({ params, pollMs }) {
  const q = useChartQ('jobTypeDistribution', params, pollMs);
  const data = q.data || [];

  const columns = [
    { header: 'Job Type', key: 'job_type' },
    { header: 'Volume', key: 'count', format: (v) => v.toLocaleString() },
  ];

  return (
    <ChartCard
      title="Lane Mix by Job Type"
      subtitle="Calibration and repair demand split"
      loading={q.isLoading}
      error={q.error}
      isFetching={q.isFetching}
      dataUpdatedAt={q.dataUpdatedAt}
      onRefresh={q.refetch}
      onDownloadCsv={downloadHandler('jobTypeDistribution', params, 'Job Type Distribution')}
      data={data}
      columns={columns}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={MARGIN}>
          <CartesianGrid {...GRID} />
          <XAxis dataKey="job_type" tick={TICK} axisLine={false} tickLine={false} />
          <YAxis tick={TICK} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip cursor={{ fill: 'rgba(148, 163, 184, 0.04)' }} content={<CustomTooltip />} />
          <Bar dataKey="count" name="Volume" fill={PALETTE[4]} radius={[5, 5, 0, 0]} animationDuration={ANIMATION_MS} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ────────────────────────────────────────────────────────────────────
//  G7 — Engineer Workload (Top 10)   (HORIZONTAL stacked BAR)
// ────────────────────────────────────────────────────────────────────
export function EngineerWorkload({ params, pollMs }) {
  const q = useChartQ('engineerWorkload', params, pollMs);
  const data = q.data || [];

  const columns = [
    { header: 'Engineer Name', key: 'engineer_name' },
    { header: 'Open Load', key: 'open_load', format: (v) => v.toLocaleString() },
    { header: 'Completed', key: 'done', format: (v) => v.toLocaleString() },
  ];

  return (
    <ChartCard
      title="Engineer Workload (Top 10)"
      subtitle="Open load and completed work per engineer"
      height={400}
      loading={q.isLoading}
      error={q.error}
      isFetching={q.isFetching}
      dataUpdatedAt={q.dataUpdatedAt}
      onRefresh={q.refetch}
      onDownloadCsv={downloadHandler('engineerWorkload', params, 'Engineer Workload')}
      span={2}
      data={data}
      columns={columns}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 16, right: 16, bottom: 56, left: 4 }}>
          <CartesianGrid {...GRID} />
          <XAxis
            dataKey="engineer_name"
            tick={TICK}
            axisLine={false}
            tickLine={false}
            angle={-24}
            textAnchor="end"
            interval={0}
            height={64}
          />
          <YAxis tick={TICK} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip cursor={{ fill: 'rgba(148, 163, 184, 0.04)' }} content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: 11, fontWeight: 500 }} iconType="circle" iconSize={8} />
          <Bar dataKey="open_load" name="Open Load" fill={PALETTE[2]} animationDuration={ANIMATION_MS} radius={[5, 5, 0, 0]} />
          <Bar dataKey="done" name="Completed" fill={PALETTE[1]} animationDuration={ANIMATION_MS} radius={[5, 5, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ────────────────────────────────────────────────────────────────────
//  G8 — Calibration Status Breakdown   (RADIAL BAR — more "stocky")
// ────────────────────────────────────────────────────────────────────
export function CalibrationStatusBreakdown({ params, pollMs }) {
  const q = useChartQ('calibrationStatusBreakdown', params, pollMs);
  const data = q.data || [];
  const radialData = data.map((d) => ({ ...d, fill: STATUS_COLORS[d.band] || PALETTE[0] }));
  const total = sum(data, 'count');
  const overdue = data.find((d) => d.band === 'OVERDUE')?.count || 0;

  const columns = [
    { header: 'Status Band', key: 'band' },
    { header: 'Count', key: 'count', format: (v) => v.toLocaleString() },
  ];

  return (
    <ChartCard
      title="Calibration Status Breakdown"
      subtitle="VALID / DUE_SOON / OVERDUE bands"
      stat={overdue > 0 ? { value: `${overdue} overdue`, accent: 'red' } : { value: `${total} active`, accent: 'green' }}
      loading={q.isLoading}
      error={q.error}
      isFetching={q.isFetching}
      dataUpdatedAt={q.dataUpdatedAt}
      onRefresh={q.refetch}
      onDownloadCsv={downloadHandler('calibrationStatusBreakdown', params, 'Calibration Status')}
      data={data}
      columns={columns}
    >
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart innerRadius="35%" outerRadius="95%" data={radialData}
                        startAngle={90} endAngle={-270}>
          <RadialBar minAngle={8} background={{ fill: '#f8fafc' }} dataKey="count"
                     cornerRadius={8} animationDuration={ANIMATION_MS} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, fontWeight: 500 }} />
          <Tooltip content={<CustomTooltip />} />
        </RadialBarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ────────────────────────────────────────────────────────────────────
//  G9 — Weekly Activity Trend   (HERO AREA, 12 weeks, wavy/glow)
// ────────────────────────────────────────────────────────────────────
export function WeeklyActivity({ params, pollMs }) {
  const q = useChartQ('weeklyActivity', params, pollMs);
  const data = q.data || [];
  const total = sum(data, 'calibrations') + sum(data, 'repairs');

  const columns = [
    { header: 'Week', key: 'week' },
    { header: 'Calibrations', key: 'calibrations', format: (v) => v.toLocaleString() },
    { header: 'Repairs', key: 'repairs', format: (v) => v.toLocaleString() },
  ];

  return (
    <ChartCard
      title="Weekly Activity Trend"
      subtitle="Weekly job-card growth across calibration and repair"
      stat={{ value: `${total.toLocaleString()} JCs`, accent: 'blue' }}
      height={340}
      loading={q.isLoading}
      error={q.error}
      isFetching={q.isFetching}
      dataUpdatedAt={q.dataUpdatedAt}
      onRefresh={q.refetch}
      onDownloadCsv={downloadHandler('weeklyActivity', params, 'Weekly Activity')}
      span={2}
      data={data}
      columns={columns}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={MARGIN}>
          <defs>
            <linearGradient id="g9-cal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={PALETTE[0]} stopOpacity={0.25} />
              <stop offset="95%" stopColor={PALETTE[0]} stopOpacity={0.0} />
            </linearGradient>
            <linearGradient id="g9-rep" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={PALETTE[5]} stopOpacity={0.2} />
              <stop offset="95%" stopColor={PALETTE[5]} stopOpacity={0.0} />
            </linearGradient>
            <filter id="glow-g9-cal" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="5" stdDeviation="5" floodColor={PALETTE[0]} floodOpacity={0.15} />
            </filter>
            <filter id="glow-g9-rep" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="5" stdDeviation="5" floodColor={PALETTE[5]} floodOpacity={0.15} />
            </filter>
          </defs>
          <CartesianGrid {...GRID} />
          <XAxis dataKey="week" tick={TICK} axisLine={false} tickLine={false} />
          <YAxis tick={TICK} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip cursor={TOOLTIP_CURSOR} content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: 11, fontWeight: 500 }} iconType="circle" iconSize={8} />
          <Area type="natural" dataKey="calibrations" name="Calibrations"
                stroke={PALETTE[0]} strokeWidth={3} fill="url(#g9-cal)" filter="url(#glow-g9-cal)"
                activeDot={{ r: 6, strokeWidth: 0, fill: PALETTE[0] }}
                animationDuration={ANIMATION_MS} animationEasing={ANIMATION_EASING} />
          <Area type="natural" dataKey="repairs"      name="Repairs"
                stroke={PALETTE[5]} strokeWidth={3} fill="url(#g9-rep)" filter="url(#glow-g9-rep)"
                activeDot={{ r: 6, strokeWidth: 0, fill: PALETTE[5] }}
                animationDuration={ANIMATION_MS} animationEasing={ANIMATION_EASING} />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ────────────────────────────────────────────────────────────────────
//  G10 — Job Card Lifecycle Funnel   (FUNNEL)
// ────────────────────────────────────────────────────────────────────
export function JcLifecycleFunnel({ params, pollMs }) {
  const q = useChartQ('jcLifecycleFunnel', params, pollMs);
  const data = q.data || [];
  const funnelData = data.map((r) => ({
    name: r.stage,
    value: r.count,
    fill: STATUS_COLORS[r.stage] || PALETTE[0],
  }));
  const totalJCs = sum(data, 'count');

  const columns = [
    { header: 'Workflow Stage', key: 'stage' },
    { header: 'Card Count', key: 'count', format: (v) => v.toLocaleString() },
  ];

  return (
    <ChartCard
      title="Job Card Lifecycle Funnel"
      subtitle="Counts by current JM_MVP_STATUS"
      stat={{ value: `${totalJCs.toLocaleString()} JCs`, accent: 'blue' }}
      height={340}
      loading={q.isLoading}
      error={q.error}
      isFetching={q.isFetching}
      dataUpdatedAt={q.dataUpdatedAt}
      onRefresh={q.refetch}
      onDownloadCsv={downloadHandler('jcLifecycleFunnel', params, 'JC Lifecycle Funnel')}
      data={data}
      columns={columns}
    >
      <ResponsiveContainer width="100%" height="100%">
        <FunnelChart>
          <Tooltip content={<CustomTooltip />} />
          <Funnel dataKey="value" data={funnelData} isAnimationActive
                  animationDuration={ANIMATION_MS}>
            <LabelList position="right" fill="#475569"
                       stroke="none" dataKey="name" style={{ fontSize: 11, fontWeight: 500 }} />
            <LabelList position="center" fill="#fff" stroke="none"
                       dataKey="value" style={{ fontSize: 12, fontWeight: 700 }} />
          </Funnel>
        </FunnelChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ────────────────────────────────────────────────────────────────────
//  G11 — Equipment Registration Trend   (AREA, monthly/glow)
// ────────────────────────────────────────────────────────────────────
export function EquipmentRegistrationTrend({ params, pollMs }) {
  const q = useChartQ('equipmentRegistrationTrend', params, pollMs);
  const data = q.data || [];
  const total = sum(data, 'registered');

  const columns = [
    { header: 'Month', key: 'month' },
    { header: 'Registered Assets', key: 'registered', format: (v) => v.toLocaleString() },
  ];

  return (
    <ChartCard
      title="Asset Base Growth"
      subtitle="New equipment registered per month"
      stat={{ value: `+${total.toLocaleString()} added`, accent: 'green' }}
      height={340}
      loading={q.isLoading}
      error={q.error}
      isFetching={q.isFetching}
      dataUpdatedAt={q.dataUpdatedAt}
      onRefresh={q.refetch}
      onDownloadCsv={downloadHandler('equipmentRegistrationTrend', params, 'Equipment Registration')}
      data={data}
      columns={columns}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={MARGIN}>
          <defs>
            <linearGradient id="g11-reg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={PALETTE[7]} stopOpacity={0.25} />
              <stop offset="95%" stopColor={PALETTE[7]} stopOpacity={0.0} />
            </linearGradient>
            <filter id="glow-g11" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="5" stdDeviation="5" floodColor={PALETTE[7]} floodOpacity={0.15} />
            </filter>
          </defs>
          <CartesianGrid {...GRID} />
          <XAxis dataKey="month" tick={TICK} axisLine={false} tickLine={false} />
          <YAxis tick={TICK} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip cursor={TOOLTIP_CURSOR} content={<CustomTooltip />} />
          <Area type="natural" dataKey="registered" name="Registered" stroke={PALETTE[7]}
                strokeWidth={3} fill="url(#g11-reg)" filter="url(#glow-g11)"
                activeDot={{ r: 6, strokeWidth: 0, fill: PALETTE[7] }}
                animationDuration={ANIMATION_MS} animationEasing={ANIMATION_EASING} />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ── G12 - Priority Mix Wave   (3-wave dynamic area chart/glow) ──────────────
export function PriorityMixTrend({ params, pollMs }) {
  const q = useChartQ('priorityMixTrend', params, pollMs);
  const data = q.data || [];
  const total = sum(data, 'low') + sum(data, 'medium') + sum(data, 'high');

  const columns = [
    { header: 'Month', key: 'month' },
    { header: 'Low Priority', key: 'low', format: (v) => v.toLocaleString() },
    { header: 'Medium Priority', key: 'medium', format: (v) => v.toLocaleString() },
    { header: 'High Priority', key: 'high', format: (v) => v.toLocaleString() },
  ];

  return (
    <ChartCard
      title="Priority Mix Wave"
      subtitle="Low, medium, and high demand waves by month"
      stat={{ value: total.toLocaleString(), accent: 'blue' }}
      height={340}
      loading={q.isLoading}
      error={q.error}
      isFetching={q.isFetching}
      dataUpdatedAt={q.dataUpdatedAt}
      onRefresh={q.refetch}
      onDownloadCsv={downloadHandler('priorityMixTrend', params, 'Priority Mix Wave')}
      span={2}
      data={data}
      columns={columns}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={MARGIN}>
          <defs>
            <linearGradient id="g12-low" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={PALETTE[1]} stopOpacity={0.2} />
              <stop offset="95%" stopColor={PALETTE[1]} stopOpacity={0.0} />
            </linearGradient>
            <linearGradient id="g12-medium" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={PALETTE[2]} stopOpacity={0.2} />
              <stop offset="95%" stopColor={PALETTE[2]} stopOpacity={0.0} />
            </linearGradient>
            <linearGradient id="g12-high" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={PALETTE[3]} stopOpacity={0.2} />
              <stop offset="95%" stopColor={PALETTE[3]} stopOpacity={0.0} />
            </linearGradient>
            <filter id="glow-low" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor={PALETTE[1]} floodOpacity={0.12} />
            </filter>
            <filter id="glow-medium" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor={PALETTE[2]} floodOpacity={0.12} />
            </filter>
            <filter id="glow-high" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor={PALETTE[3]} floodOpacity={0.12} />
            </filter>
          </defs>
          <CartesianGrid {...GRID} />
          <XAxis dataKey="month" tick={TICK} axisLine={false} tickLine={false} />
          <YAxis tick={TICK} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip cursor={TOOLTIP_CURSOR} content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: 11, fontWeight: 500 }} iconType="circle" iconSize={8} />
          <Area type="natural" dataKey="low" name="Low" stroke={PALETTE[1]} strokeWidth={3}
                fill="url(#g12-low)" filter="url(#glow-low)" activeDot={{ r: 5, strokeWidth: 0, fill: PALETTE[1] }}
                animationDuration={ANIMATION_MS} animationEasing={ANIMATION_EASING} />
          <Area type="natural" dataKey="medium" name="Medium" stroke={PALETTE[2]} strokeWidth={3}
                fill="url(#g12-medium)" filter="url(#glow-medium)" activeDot={{ r: 5, strokeWidth: 0, fill: PALETTE[2] }}
                animationDuration={ANIMATION_MS} animationEasing={ANIMATION_EASING} />
          <Area type="natural" dataKey="high" name="High" stroke={PALETTE[3]} strokeWidth={3}
                fill="url(#g12-high)" filter="url(#glow-high)" activeDot={{ r: 5, strokeWidth: 0, fill: PALETTE[3] }}
                animationDuration={ANIMATION_MS} animationEasing={ANIMATION_EASING} />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

