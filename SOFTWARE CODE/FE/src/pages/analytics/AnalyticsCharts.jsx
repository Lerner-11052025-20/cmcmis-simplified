// ============================================================================
// src/pages/analytics/AnalyticsCharts.jsx  —  12 chart cards (G1..G12)
// ----------------------------------------------------------------------------
// PHASE 11 SLICE 3 — the redesigned /analytics dashboard.
//
// VISUAL LANGUAGE (consistent across all 12 cards):
//   • Time-series charts use <AreaChart> with smooth monotone curves +
//     vertical gradient fills (stock-market wavy look). The gradient defs
//     live inside each AreaChart so they're scoped per chart.
//   • Categorical charts use rounded-top bars + transparent fills.
//   • Pies / donuts use the same palette as the legends.
//   • All charts share the same TICK / MARGIN / GRID constants from
//     chartTheme2.js so the dashboard feels like ONE document.
//
// DATA FLOW
//   Each chart calls `useChart(key, params, { refetchInterval, … })` so the
//   query layer handles polling. The card surfaces `dataUpdatedAt`,
//   `isFetching` and a per-card `refetch()` for the footer "refresh" button.
//
// LAYOUT
//   The parent <Analytics> page passes a `span` prop into hero charts
//   (Weekly Activity, Engineer Workload) so they take the full row width.
//   Other charts default to half-width on lg+ screens.
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

/**
 * Wire react-query for one chart. We refetch every `pollMs` for the
 * "dynamically reloaded" requirement and return the bits ChartCard needs.
 */
function useChartQ(key, params, pollMs) {
  return useChart(key, params, {
    refetchInterval: pollMs,
    refetchOnWindowFocus: true,
  });
}

/** CSV download handler factory — common across all cards. */
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

/** Sum a numeric field across an array — used to render hero stat badges. */
function sum(rows, key) {
  if (!Array.isArray(rows)) return 0;
  return rows.reduce((a, r) => a + (Number(r[key]) || 0), 0);
}

/** Smooth area gradient defs scoped to a chart. */
function GradientDef({ id, color, topOpacity = 0.5, bottomOpacity = 0.0 }) {
  return (
    <defs>
      <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
        <stop offset="5%"  stopColor={color} stopOpacity={topOpacity} />
        <stop offset="95%" stopColor={color} stopOpacity={bottomOpacity} />
      </linearGradient>
    </defs>
  );
}

// Recharts default tooltip is fine but we add subtle styling via wrapper props.
const TOOLTIP_STYLE = {
  contentStyle: {
    background: 'white',
    border: '1px solid #e5e7eb',
    borderRadius: 8,
    fontSize: 12,
    boxShadow: '0 4px 16px -2px rgb(0 0 0 / 0.08)',
  },
  labelStyle: { color: '#111827', fontWeight: 600, marginBottom: 4 },
  itemStyle: { color: '#374151' },
};


// ────────────────────────────────────────────────────────────────────
//  G1 — Monthly Activity Trends   (AREA, calibrations vs repairs)
// ────────────────────────────────────────────────────────────────────
export function MonthlyActivity({ params, pollMs }) {
  const q = useChartQ('monthlyActivity', params, pollMs);
  const data = q.data || [];
  const total = sum(data, 'calibrations') + sum(data, 'repairs');
  return (
    <ChartCard
      title="Monthly Activity Trends"
      subtitle="Calibrations vs repairs by month"
      stat={{ value: total.toLocaleString(), accent: 'blue' }}
      loading={q.isLoading}
      error={q.error}
      isFetching={q.isFetching}
      dataUpdatedAt={q.dataUpdatedAt}
      onRefresh={q.refetch}
      onDownloadCsv={downloadHandler('monthlyActivity', params, 'Monthly Activity')}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={MARGIN}>
          <GradientDef id="g1-cal" color={PALETTE[0]} topOpacity={0.55} />
          <GradientDef id="g1-rep" color={PALETTE[2]} topOpacity={0.55} />
          <CartesianGrid {...GRID} />
          <XAxis dataKey="month" tick={TICK} axisLine={false} tickLine={false} />
          <YAxis tick={TICK} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip cursor={TOOLTIP_CURSOR} {...TOOLTIP_STYLE} />
          <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" iconSize={8} />
          <Area type="monotone" dataKey="calibrations" stroke={PALETTE[0]} strokeWidth={2.5}
                fill="url(#g1-cal)" animationDuration={ANIMATION_MS} animationEasing={ANIMATION_EASING} />
          <Area type="monotone" dataKey="repairs"      stroke={PALETTE[2]} strokeWidth={2.5}
                fill="url(#g1-rep)" animationDuration={ANIMATION_MS} animationEasing={ANIMATION_EASING} />
        </AreaChart>
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
    >
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="count" nameKey="status"
               innerRadius="58%" outerRadius="88%" paddingAngle={3}
               animationDuration={ANIMATION_MS} animationEasing={ANIMATION_EASING}>
            {data.map((d, i) => (
              <Cell key={d.status} fill={STATUS_COLORS[d.status] || PALETTE[i % PALETTE.length]}
                    stroke="white" strokeWidth={2} />
            ))}
          </Pie>
          <Tooltip {...TOOLTIP_STYLE} />
          <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" iconSize={8} />
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
  return (
    <ChartCard
      title="Monthly Job Trends"
      subtitle="Completed vs pending requests"
      stat={{ value: `${totalCompleted.toLocaleString()} done`, accent: 'green' }}
      loading={q.isLoading}
      error={q.error}
      isFetching={q.isFetching}
      dataUpdatedAt={q.dataUpdatedAt}
      onRefresh={q.refetch}
      onDownloadCsv={downloadHandler('monthlyJobs', params, 'Monthly Jobs')}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={MARGIN}>
          <CartesianGrid {...GRID} />
          <XAxis dataKey="month" tick={TICK} axisLine={false} tickLine={false} />
          <YAxis tick={TICK} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip cursor={{ fill: 'rgba(148, 163, 184, 0.08)' }} {...TOOLTIP_STYLE} />
          <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" iconSize={8} />
          <Bar dataKey="completed" fill={PALETTE[1]} radius={[6, 6, 0, 0]} animationDuration={ANIMATION_MS} />
          <Bar dataKey="pending"   fill={PALETTE[2]} radius={[6, 6, 0, 0]} animationDuration={ANIMATION_MS} />
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
    >
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="count" nameKey="division"
               outerRadius="80%" paddingAngle={2}
               animationDuration={ANIMATION_MS} animationEasing={ANIMATION_EASING}
               label={(d) => `${Math.round((d.percent || 0) * 100)}%`}
               labelLine={false}>
            {data.map((d, i) => (
              <Cell key={d.division} fill={PALETTE[i % PALETTE.length]} stroke="white" strokeWidth={2} />
            ))}
          </Pie>
          <Tooltip {...TOOLTIP_STYLE} />
          <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" iconSize={8} />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ────────────────────────────────────────────────────────────────────
//  G5 — Calibration Completion Trend   (AREA, on-time vs delayed)
// ────────────────────────────────────────────────────────────────────
export function CalibrationCompletion({ params, pollMs }) {
  const q = useChartQ('calibrationCompletion', params, pollMs);
  const data = q.data || [];
  const onTime = sum(data, 'on_time');
  const delayed = sum(data, 'delayed');
  const rate = (onTime + delayed) === 0 ? null : Math.round(onTime / (onTime + delayed) * 100);
  return (
    <ChartCard
      title="Calibration Completion Trend"
      subtitle="On-time vs delayed monthly"
      stat={rate !== null ? { value: `${rate}% on-time`, accent: rate >= 80 ? 'green' : 'amber' } : null}
      loading={q.isLoading}
      error={q.error}
      isFetching={q.isFetching}
      dataUpdatedAt={q.dataUpdatedAt}
      onRefresh={q.refetch}
      onDownloadCsv={downloadHandler('calibrationCompletion', params, 'Calibration Completion')}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={MARGIN}>
          <GradientDef id="g5-on"  color={PALETTE[1]} topOpacity={0.55} />
          <GradientDef id="g5-del" color={PALETTE[3]} topOpacity={0.55} />
          <CartesianGrid {...GRID} />
          <XAxis dataKey="month" tick={TICK} axisLine={false} tickLine={false} />
          <YAxis tick={TICK} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip cursor={TOOLTIP_CURSOR} {...TOOLTIP_STYLE} />
          <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" iconSize={8} />
          <Area type="monotone" dataKey="on_time" stroke={PALETTE[1]} strokeWidth={2.5}
                fill="url(#g5-on)"  animationDuration={ANIMATION_MS} animationEasing={ANIMATION_EASING} />
          <Area type="monotone" dataKey="delayed" stroke={PALETTE[3]} strokeWidth={2.5}
                fill="url(#g5-del)" animationDuration={ANIMATION_MS} animationEasing={ANIMATION_EASING} />
        </AreaChart>
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
  return (
    <ChartCard
      title="Job Type Distribution"
      subtitle="JR_JOB_TYPE counts in window"
      loading={q.isLoading}
      error={q.error}
      isFetching={q.isFetching}
      dataUpdatedAt={q.dataUpdatedAt}
      onRefresh={q.refetch}
      onDownloadCsv={downloadHandler('jobTypeDistribution', params, 'Job Type Distribution')}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={MARGIN}>
          <CartesianGrid {...GRID} />
          <XAxis dataKey="job_type" tick={TICK} axisLine={false} tickLine={false} />
          <YAxis tick={TICK} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip cursor={{ fill: 'rgba(148, 163, 184, 0.08)' }} {...TOOLTIP_STYLE} />
          <Bar dataKey="count" fill={PALETTE[4]} radius={[6, 6, 0, 0]} animationDuration={ANIMATION_MS} />
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
  return (
    <ChartCard
      title="Engineer Workload (Top 10)"
      subtitle="Open load vs completed per engineer"
      height={400}
      loading={q.isLoading}
      error={q.error}
      isFetching={q.isFetching}
      dataUpdatedAt={q.dataUpdatedAt}
      onRefresh={q.refetch}
      onDownloadCsv={downloadHandler('engineerWorkload', params, 'Engineer Workload')}
      span={2}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart layout="vertical" data={data} margin={{ ...MARGIN, left: 110 }}>
          <CartesianGrid {...GRID} horizontal={false} vertical={true} />
          <XAxis type="number" tick={TICK} axisLine={false} tickLine={false} allowDecimals={false} />
          <YAxis type="category" dataKey="engineer_name" tick={TICK} axisLine={false} tickLine={false} width={140} />
          <Tooltip cursor={{ fill: 'rgba(148, 163, 184, 0.08)' }} {...TOOLTIP_STYLE} />
          <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" iconSize={8} />
          <Bar dataKey="open_load" stackId="a" fill={PALETTE[2]} animationDuration={ANIMATION_MS} radius={[0, 0, 0, 0]} />
          <Bar dataKey="done"      stackId="a" fill={PALETTE[1]} animationDuration={ANIMATION_MS} radius={[0, 6, 6, 0]} />
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
  // Recharts RadialBar wants the colour on each row; we map ours.
  const radialData = data.map((d) => ({ ...d, fill: STATUS_COLORS[d.band] || PALETTE[0] }));
  const total = sum(data, 'count');
  const overdue = data.find((d) => d.band === 'OVERDUE')?.count || 0;
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
    >
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart innerRadius="30%" outerRadius="95%" data={radialData}
                        startAngle={90} endAngle={-270}>
          <RadialBar minAngle={8} background={{ fill: '#f3f4f6' }} dataKey="count"
                     cornerRadius={8} animationDuration={ANIMATION_MS} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
          <Tooltip {...TOOLTIP_STYLE} />
        </RadialBarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ────────────────────────────────────────────────────────────────────
//  G9 — Weekly Activity Trend   (HERO AREA, 12 weeks, wavy)
// ────────────────────────────────────────────────────────────────────
export function WeeklyActivity({ params, pollMs }) {
  const q = useChartQ('weeklyActivity', params, pollMs);
  const data = q.data || [];
  const total = sum(data, 'calibrations') + sum(data, 'repairs');
  return (
    <ChartCard
      title="Weekly Activity Trend"
      subtitle="Job Cards by ISO week — calibrations & repairs over the last 12 weeks"
      stat={{ value: `${total.toLocaleString()} JCs`, accent: 'blue' }}
      height={340}
      loading={q.isLoading}
      error={q.error}
      isFetching={q.isFetching}
      dataUpdatedAt={q.dataUpdatedAt}
      onRefresh={q.refetch}
      onDownloadCsv={downloadHandler('weeklyActivity', params, 'Weekly Activity')}
      span={2}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={MARGIN}>
          <GradientDef id="g9-cal" color={PALETTE[0]} topOpacity={0.6} />
          <GradientDef id="g9-rep" color={PALETTE[5]} topOpacity={0.5} />
          <CartesianGrid {...GRID} />
          <XAxis dataKey="week" tick={TICK} axisLine={false} tickLine={false} />
          <YAxis tick={TICK} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip cursor={TOOLTIP_CURSOR} {...TOOLTIP_STYLE} />
          <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" iconSize={8} />
          <Area type="natural" dataKey="calibrations" name="Calibrations"
                stroke={PALETTE[0]} strokeWidth={2.5} fill="url(#g9-cal)"
                animationDuration={ANIMATION_MS} animationEasing={ANIMATION_EASING} />
          <Area type="natural" dataKey="repairs"      name="Repairs"
                stroke={PALETTE[5]} strokeWidth={2.5} fill="url(#g9-rep)"
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
  // Project to funnel-friendly shape with a colour per stage.
  const funnelData = data.map((r) => ({
    name: r.stage,
    value: r.count,
    fill: STATUS_COLORS[r.stage] || PALETTE[0],
  }));
  const totalJCs = sum(data, 'count');
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
    >
      <ResponsiveContainer width="100%" height="100%">
        <FunnelChart>
          <Tooltip {...TOOLTIP_STYLE} />
          <Funnel dataKey="value" data={funnelData} isAnimationActive
                  animationDuration={ANIMATION_MS}>
            <LabelList position="right" fill="#374151"
                       stroke="none" dataKey="name" style={{ fontSize: 11 }} />
            <LabelList position="center" fill="#fff" stroke="none"
                       dataKey="value" style={{ fontSize: 12, fontWeight: 600 }} />
          </Funnel>
        </FunnelChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ────────────────────────────────────────────────────────────────────
//  G11 — Equipment Registration Trend   (AREA, monthly)
// ────────────────────────────────────────────────────────────────────
export function EquipmentRegistrationTrend({ params, pollMs }) {
  const q = useChartQ('equipmentRegistrationTrend', params, pollMs);
  const data = q.data || [];
  const total = sum(data, 'registered');
  return (
    <ChartCard
      title="Equipment Registration Trend"
      subtitle="New equipment added per month (EQM_CREATED_ON)"
      stat={{ value: `+${total.toLocaleString()} added`, accent: 'green' }}
      height={340}
      loading={q.isLoading}
      error={q.error}
      isFetching={q.isFetching}
      dataUpdatedAt={q.dataUpdatedAt}
      onRefresh={q.refetch}
      onDownloadCsv={downloadHandler('equipmentRegistrationTrend', params, 'Equipment Registration')}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={MARGIN}>
          <GradientDef id="g11-reg" color={PALETTE[7]} topOpacity={0.6} />
          <CartesianGrid {...GRID} />
          <XAxis dataKey="month" tick={TICK} axisLine={false} tickLine={false} />
          <YAxis tick={TICK} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip cursor={TOOLTIP_CURSOR} {...TOOLTIP_STYLE} />
          <Area type="natural" dataKey="registered" name="Registered" stroke={PALETTE[7]}
                strokeWidth={2.5} fill="url(#g11-reg)"
                animationDuration={ANIMATION_MS} animationEasing={ANIMATION_EASING} />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ────────────────────────────────────────────────────────────────────
//  G12 — Priority Mix Trend   (STACKED AREA, low/med/high)
// ────────────────────────────────────────────────────────────────────
export function PriorityMixTrend({ params, pollMs }) {
  const q = useChartQ('priorityMixTrend', params, pollMs);
  const data = q.data || [];
  const totalHigh = sum(data, 'high');
  return (
    <ChartCard
      title="Priority Mix Trend"
      subtitle="LOW / MEDIUM / HIGH JR priority stacked over time"
      stat={{ value: `${totalHigh.toLocaleString()} high`, accent: totalHigh > 0 ? 'amber' : 'green' }}
      height={340}
      loading={q.isLoading}
      error={q.error}
      isFetching={q.isFetching}
      dataUpdatedAt={q.dataUpdatedAt}
      onRefresh={q.refetch}
      onDownloadCsv={downloadHandler('priorityMixTrend', params, 'Priority Mix Trend')}
      span={2}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={MARGIN}>
          <GradientDef id="g12-low"  color={PALETTE[1]} topOpacity={0.55} />
          <GradientDef id="g12-med"  color={PALETTE[2]} topOpacity={0.55} />
          <GradientDef id="g12-high" color={PALETTE[3]} topOpacity={0.55} />
          <CartesianGrid {...GRID} />
          <XAxis dataKey="month" tick={TICK} axisLine={false} tickLine={false} />
          <YAxis tick={TICK} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip cursor={TOOLTIP_CURSOR} {...TOOLTIP_STYLE} />
          <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" iconSize={8} />
          <Area type="monotone" dataKey="low"    stackId="p" name="Low"    stroke={PALETTE[1]}
                strokeWidth={1.5} fill="url(#g12-low)"  animationDuration={ANIMATION_MS} />
          <Area type="monotone" dataKey="medium" stackId="p" name="Medium" stroke={PALETTE[2]}
                strokeWidth={1.5} fill="url(#g12-med)"  animationDuration={ANIMATION_MS} />
          <Area type="monotone" dataKey="high"   stackId="p" name="High"   stroke={PALETTE[3]}
                strokeWidth={1.5} fill="url(#g12-high)" animationDuration={ANIMATION_MS} />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
