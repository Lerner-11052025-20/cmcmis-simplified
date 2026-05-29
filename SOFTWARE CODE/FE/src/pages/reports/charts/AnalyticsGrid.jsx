// ============================================================================
// src/pages/reports/charts/AnalyticsGrid.jsx  —  Phase-10 chart wall
// ----------------------------------------------------------------------------
// Renders all 8 chart cards (G1..G8) in parallel. react-query handles
// concurrent fetches; each card has its own loading + error state so a
// slow chart never blocks a fast one.
//
// CHART LIST (matches Phase-10 spec §3):
//   G1 Monthly Activity Trends      LINE     calibrations vs repairs
//   G2 Equipment Status             DONUT
//   G3 Monthly Job Trends           BAR      completed vs pending
//   G4 Division-wise Jobs           PIE
//   G5 Calibration Completion Trend LINE     on-time vs delayed
//   G6 Job Type Distribution        BAR
//   G7 Engineer Workload (top 10)   HBAR
//   G8 Calibration Status Breakdown PIE
// ============================================================================

import { useChart } from '../../../lib/hooks/useReport.js';
import { downloadChartCsv } from '../../../lib/api/reports.js';
import { toast } from 'sonner';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

import { ChartCard } from './ChartCard.jsx';
import { PALETTE, STATUS_COLORS, TICK, ANIMATION_MS, COMMON_MARGIN } from './chartTheme.js';

function downloadHandler(key, params, title) {
  return async () => {
    try {
      const id = toast.loading(`Preparing CSV — ${title}…`);
      const { filename } = await downloadChartCsv(key, params);
      toast.success(`Downloaded ${filename}`, { id });
    } catch (e) {
      toast.error(`CSV failed: ${e.response?.data?.error?.message || e.message}`);
    }
  };
}

// ── G1 — Monthly Activity Trends (line) ────────────────────────────────
function G1MonthlyActivity({ params }) {
  const q = useChart('monthlyActivity', params);
  return (
    <ChartCard
      title="Monthly Activity Trends"
      loading={q.isLoading}
      error={q.error}
      onDownloadCsv={downloadHandler('monthlyActivity', params, 'Monthly Activity Trends')}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={q.data || []} margin={COMMON_MARGIN}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="month" tick={TICK} />
          <YAxis tick={TICK} allowDecimals={false} />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="calibrations" stroke={PALETTE[1]}
                strokeWidth={2} dot={{ r: 3 }} animationDuration={ANIMATION_MS} />
          <Line type="monotone" dataKey="repairs" stroke={PALETTE[2]}
                strokeWidth={2} dot={{ r: 3 }} animationDuration={ANIMATION_MS} />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ── G2 — Equipment Status (donut) ─────────────────────────────────────
function G2EquipmentStatus({ params }) {
  const q = useChart('equipmentStatus', params);
  const data = (q.data || []);
  return (
    <ChartCard
      title="Equipment Status"
      loading={q.isLoading}
      error={q.error}
      onDownloadCsv={downloadHandler('equipmentStatus', params, 'Equipment Status')}
    >
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="count" nameKey="status" innerRadius="55%" outerRadius="80%"
               paddingAngle={2} animationDuration={ANIMATION_MS}>
            {data.map((d, i) => (
              <Cell key={d.status} fill={STATUS_COLORS[d.status] || PALETTE[i % PALETTE.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ── G3 — Monthly Job Trends (bar) ─────────────────────────────────────
function G3MonthlyJobs({ params }) {
  const q = useChart('monthlyJobs', params);
  return (
    <ChartCard
      title="Monthly Job Trends"
      loading={q.isLoading}
      error={q.error}
      onDownloadCsv={downloadHandler('monthlyJobs', params, 'Monthly Job Trends')}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={q.data || []} margin={COMMON_MARGIN}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="month" tick={TICK} />
          <YAxis tick={TICK} allowDecimals={false} />
          <Tooltip />
          <Legend />
          <Bar dataKey="completed" fill={PALETTE[0]} radius={[3, 3, 0, 0]} animationDuration={ANIMATION_MS} />
          <Bar dataKey="pending"   fill={PALETTE[2]} radius={[3, 3, 0, 0]} animationDuration={ANIMATION_MS} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ── G4 — Division-wise Jobs (pie) ─────────────────────────────────────
function G4DivisionWise({ params }) {
  const q = useChart('divisionWise', params);
  const data = (q.data || []);
  return (
    <ChartCard
      title="Division-wise Jobs"
      loading={q.isLoading}
      error={q.error}
      onDownloadCsv={downloadHandler('divisionWise', params, 'Division-wise Jobs')}
    >
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="count" nameKey="division" outerRadius="80%"
               paddingAngle={1} animationDuration={ANIMATION_MS} label={(d) => `${d.division} ${Math.round((d.percent || 0) * 100)}%`}>
            {data.map((d, i) => <Cell key={d.division} fill={PALETTE[i % PALETTE.length]} />)}
          </Pie>
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ── G5 — Calibration Completion (line) ─────────────────────────────────
function G5CalibrationCompletion({ params }) {
  const q = useChart('calibrationCompletion', params);
  return (
    <ChartCard
      title="Calibration Completion Trend"
      loading={q.isLoading}
      error={q.error}
      onDownloadCsv={downloadHandler('calibrationCompletion', params, 'Calibration Completion')}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={q.data || []} margin={COMMON_MARGIN}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="month" tick={TICK} />
          <YAxis tick={TICK} allowDecimals={false} />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="on_time" stroke={PALETTE[0]} strokeWidth={2} dot={{ r: 3 }} animationDuration={ANIMATION_MS} />
          <Line type="monotone" dataKey="delayed" stroke={PALETTE[3]} strokeWidth={2} dot={{ r: 3 }} animationDuration={ANIMATION_MS} />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ── G6 — Job Type Distribution (bar) ───────────────────────────────────
function G6JobTypeDistribution({ params }) {
  const q = useChart('jobTypeDistribution', params);
  return (
    <ChartCard
      title="Job Type Distribution"
      loading={q.isLoading}
      error={q.error}
      onDownloadCsv={downloadHandler('jobTypeDistribution', params, 'Job Type Distribution')}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={q.data || []} margin={COMMON_MARGIN}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="job_type" tick={TICK} />
          <YAxis tick={TICK} allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="count" fill={PALETTE[4]} radius={[3, 3, 0, 0]} animationDuration={ANIMATION_MS} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ── G7 — Engineer Workload (horizontal bar, top 10) ────────────────────
function G7EngineerWorkload({ params }) {
  const q = useChart('engineerWorkload', params);
  // Recharts uses YAxis as the category axis when layout='vertical'.
  return (
    <ChartCard
      title="Engineer Workload (Top 10)"
      loading={q.isLoading}
      error={q.error}
      height={320}
      onDownloadCsv={downloadHandler('engineerWorkload', params, 'Engineer Workload')}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart layout="vertical" data={q.data || []} margin={{ ...COMMON_MARGIN, left: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis type="number" tick={TICK} allowDecimals={false} />
          <YAxis type="category" dataKey="engineer_name" tick={TICK} width={140} />
          <Tooltip />
          <Legend />
          <Bar dataKey="open_load" stackId="a" fill={PALETTE[2]} animationDuration={ANIMATION_MS} />
          <Bar dataKey="done"      stackId="a" fill={PALETTE[0]} animationDuration={ANIMATION_MS} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ── G8 — Calibration Status Breakdown (pie) ────────────────────────────
function G8CalibrationStatusBreakdown({ params }) {
  const q = useChart('calibrationStatusBreakdown', params);
  const data = (q.data || []);
  return (
    <ChartCard
      title="Calibration Status Breakdown"
      loading={q.isLoading}
      error={q.error}
      onDownloadCsv={downloadHandler('calibrationStatusBreakdown', params, 'Calibration Status Breakdown')}
    >
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="count" nameKey="band" outerRadius="80%" paddingAngle={2} animationDuration={ANIMATION_MS}>
            {data.map((d) => <Cell key={d.band} fill={STATUS_COLORS[d.band] || PALETTE[0]} />)}
          </Pie>
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ── Grid composition ──────────────────────────────────────────────────
// Two rows of 2 wide cards each on lg+; stacks 1-col on mobile.
export function AnalyticsGrid({ params }) {
  return (
    <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
      <G1MonthlyActivity        params={params} />
      <G2EquipmentStatus        params={params} />
      <G3MonthlyJobs            params={params} />
      <G4DivisionWise           params={params} />
      <G5CalibrationCompletion  params={params} />
      <G6JobTypeDistribution    params={params} />
      <G7EngineerWorkload       params={params} />
      <G8CalibrationStatusBreakdown params={params} />
    </div>
  );
}
