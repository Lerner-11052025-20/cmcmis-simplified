// ============================================================================
// pages/jobRequests/components/DetailTimelineCard.jsx
// ----------------------------------------------------------------------------
// Full chronological status_history timeline (decision Q-7 LOCKED:
// audit-grade transparency, not a summary). Each transition row carries:
//   • from_status → to_status     (visualised with an arrow)
//   • actor (employee_id + name)
//   • timestamp (relative + absolute on hover)
//   • reason (only for REJECTED / REOPENED transitions)
//
// Data source: useJobRequestHistory hook.
// ============================================================================

import { Clock, ChevronRight } from 'lucide-react';
import { SectionCard } from './detailPrimitives.jsx';
import { StatusPill } from '../../../components/StatusPill.jsx';
import { useJobRequestHistory } from '../../../lib/hooks/useJobRequestHistory.js';

function relTime(iso) {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const diffSec = Math.floor((Date.now() - t) / 1000);
  if (diffSec < 60)         return 'just now';
  if (diffSec < 3600)       return `${Math.floor(diffSec / 60)} min ago`;
  if (diffSec < 86_400)     return `${Math.floor(diffSec / 3600)} hr ago`;
  if (diffSec < 30 * 86400) return `${Math.floor(diffSec / 86_400)} days ago`;
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}
function absTime(iso) {
  if (!iso) return '';
  try { return new Date(iso).toLocaleString(); } catch { return iso; }
}

export function DetailTimelineCard({ jrId }) {
  const { items, loading, error } = useJobRequestHistory(jrId);

  return (
    <SectionCard
      icon={<Clock size={16} strokeWidth={1.75} aria-hidden="true" />}
      title="Status Timeline"
    >
      {loading ? (
        <div className="text-xs text-ink-soft">Loading history…</div>
      ) : error ? (
        <div className="text-xs text-danger">Could not load history.</div>
      ) : !items || items.length === 0 ? (
        <div className="text-xs text-ink-soft italic">No transitions yet.</div>
      ) : (
        <ol className="space-y-3">
          {items.map((h, i) => (
            <li key={i} className="flex items-start gap-3">
              {/* Time-bar dot */}
              <div
                className="mt-1.5 w-2 h-2 rounded-full bg-accent shrink-0"
                aria-hidden="true"
              />
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  {h.from_status ? <StatusPill status={h.from_status} /> : (
                    <span className="text-xs text-ink-soft italic">(initial)</span>
                  )}
                  <ChevronRight size={14} strokeWidth={1.75} aria-hidden="true" className="text-ink-soft" />
                  <StatusPill status={h.to_status} />
                </div>
                <div className="mt-1 text-xs text-ink-soft">
                  by{' '}
                  <span className="font-medium text-ink">
                    {h.transitioned_by?.name || h.transitioned_by?.employee_id || '—'}
                  </span>
                  {h.transitioned_by?.employee_id ? (
                    <span className="text-ink-soft"> ({h.transitioned_by.employee_id})</span>
                  ) : null}
                  {' · '}
                  <span title={absTime(h.transitioned_at)}>{relTime(h.transitioned_at)}</span>
                </div>
                {h.reason ? (
                  <div className="mt-1 text-xs text-ink bg-base rounded-md p-2 whitespace-pre-wrap">
                    <span className="text-ink-soft">Reason: </span>
                    {h.reason}
                  </div>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      )}
    </SectionCard>
  );
}
