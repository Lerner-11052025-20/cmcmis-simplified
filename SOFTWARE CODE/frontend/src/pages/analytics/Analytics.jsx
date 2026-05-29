// ============================================================================
// src/pages/analytics/Analytics.jsx  -  Business analytics dashboard
// ----------------------------------------------------------------------------
// Operational view built from trend, growth, and workload charts. The page
// intentionally avoids decorative pie/donut/funnel visuals so leaders can scan
// throughput, backlog, completion, and lane performance quickly.
// ============================================================================

import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

import { Layout } from '../../components/Layout.jsx';

import {
  MonthlyActivity,
  MonthlyJobs,
  CalibrationCompletion,
  JobTypeDistribution,
  EngineerWorkload,
  WeeklyActivity,
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

export function Analytics() {
  const [months, setMonths] = useState(6);
  const [laneCode, setLaneCode] = useState('');
  const qc = useQueryClient();

  const params = useMemo(() => ({
    months,
    laneCode: laneCode || undefined,
  }), [months, laneCode]);

  function refreshAll() {
    qc.invalidateQueries({ queryKey: ['chart'] });
    toast.message('Refreshing analytics charts...');
  }

  return (
    <Layout>
      <div className="space-y-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <h1 className="text-2xl font-semibold text-ink">Analytics</h1>

          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex rounded-lg border border-border bg-white p-1 shadow-sm">
              {WINDOW_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setMonths(option.value)}
                  className={`h-9 px-3 text-xs font-medium rounded-md transition-colors ${
                    months === option.value
                      ? 'bg-accent text-white'
                      : 'text-ink-soft hover:bg-base-elev hover:text-ink'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className="inline-flex flex-wrap rounded-lg border border-border bg-white p-1 shadow-sm">
              {LANE_OPTIONS.map((option) => (
                <button
                  key={option.value || 'all'}
                  type="button"
                  onClick={() => setLaneCode(option.value)}
                  className={`h-9 px-3 text-xs font-medium rounded-md transition-colors ${
                    laneCode === option.value
                      ? 'bg-ink text-white'
                      : 'text-ink-soft hover:bg-base-elev hover:text-ink'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={refreshAll}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-medium text-white shadow-sm hover:bg-accent/90 focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <RefreshCw size={15} strokeWidth={1.75} aria-hidden="true" />
              Refresh All
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <WeeklyActivity             params={params} pollMs={DEFAULT_POLL_MS} />
          <MonthlyActivity            params={params} pollMs={DEFAULT_POLL_MS} />
          <MonthlyJobs                params={params} pollMs={DEFAULT_POLL_MS} />
          <CalibrationCompletion      params={params} pollMs={DEFAULT_POLL_MS} />
          <PriorityMixTrend           params={params} pollMs={DEFAULT_POLL_MS} />
          <JobTypeDistribution        params={params} pollMs={DEFAULT_POLL_MS} />
          <EquipmentRegistrationTrend params={params} pollMs={DEFAULT_POLL_MS} />
          <EngineerWorkload           params={params} pollMs={DEFAULT_POLL_MS} />
        </div>
      </div>
    </Layout>
  );
}
