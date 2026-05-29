import { Clock } from 'lucide-react';
import clsx from 'clsx';
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

const STATUS_THEME = {
  DRAFT:           { border: 'border-slate-300',   dot: 'bg-slate-400',   line: 'bg-slate-300' },
  SUBMITTED:       { border: 'border-amber-400',   dot: 'bg-amber-500',   line: 'bg-amber-300' },
  PENDING:         { border: 'border-amber-400',   dot: 'bg-amber-500',   line: 'bg-amber-300' },
  ASSIGNED:        { border: 'border-indigo-400',  dot: 'bg-indigo-500',  line: 'bg-indigo-300' },
  APPROVED:        { border: 'border-indigo-400',  dot: 'bg-indigo-500',  line: 'bg-indigo-300' },
  IN_PROGRESS:     { border: 'border-blue-400',    dot: 'bg-blue-500',    line: 'bg-blue-300' },
  COMPLETED:       { border: 'border-emerald-400', dot: 'bg-emerald-500', line: 'bg-emerald-300' },
  VERIFIED_CLOSED: { border: 'border-emerald-500', dot: 'bg-emerald-600', line: 'bg-emerald-400' },
  REJECTED:        { border: 'border-rose-400',    dot: 'bg-rose-500',    line: 'bg-rose-300' },
  REOPENED:        { border: 'border-orange-400',  dot: 'bg-orange-500',  line: 'bg-orange-300' },
};

export function DetailTimelineCard({ jrId }) {
  const { items, loading, error } = useJobRequestHistory(jrId);

  return (
    <SectionCard
      icon={<Clock size={16} strokeWidth={1.75} aria-hidden="true" />}
      title="Status Timeline"
      accent="amber"
    >
      {loading ? (
        <div className="text-xs text-ink-soft animate-pulse">Loading history…</div>
      ) : error ? (
        <div className="text-xs text-danger">Could not load history.</div>
      ) : !items || items.length === 0 ? (
        <div className="text-xs text-ink-soft italic">No transitions yet.</div>
      ) : (
        <div className="overflow-x-auto no-scrollbar -mx-2 px-2 pb-2">
          <ol className="flex items-start gap-0 min-w-max pt-2">
            {items.map((h, i) => {
              const theme = STATUS_THEME[h.to_status] || STATUS_THEME.DRAFT;
              const isLast = i === items.length - 1;

              return (
                <li key={i} className="flex flex-col items-center relative" style={{ minWidth: '160px' }}>
                  {/* ── Node row: circle + connecting line ── */}
                  <div className="flex items-center w-full relative" style={{ height: '32px' }}>
                    {/* Left half of connecting line (from previous node) */}
                    {i > 0 && (
                      <div
                        className={clsx(
                          "absolute left-0 top-1/2 -translate-y-1/2 h-[3px] w-1/2 rounded-full",
                          theme.line
                        )}
                        aria-hidden="true"
                      />
                    )}

                    {/* Right half of connecting line (to next node) */}
                    {!isLast && (
                      <div
                        className={clsx(
                          "absolute right-0 top-1/2 -translate-y-1/2 h-[3px] w-1/2 rounded-full",
                          (STATUS_THEME[items[i + 1]?.to_status] || STATUS_THEME.DRAFT).line
                        )}
                        aria-hidden="true"
                      />
                    )}

                    {/* Bigger circular node (centered) */}
                    <span
                      className={clsx(
                        "relative z-10 mx-auto flex items-center justify-center w-8 h-8 bg-white rounded-full border-[3px] shadow-md transition-transform duration-300 hover:scale-110",
                        theme.border
                      )}
                      aria-hidden="true"
                    >
                      <span className={clsx("w-3.5 h-3.5 rounded-full", theme.dot)} />
                    </span>
                  </div>

                  {/* ── Content below the node ── */}
                  <div className="mt-3 flex flex-col items-center gap-1.5 px-2 text-center w-full">
                    {/* Destination status only */}
                    <StatusPill status={h.to_status} />

                    {/* User + timestamp */}
                    <div className="text-[10px] text-slate-400 font-sans leading-tight space-y-0.5">
                      <div className="font-semibold text-slate-500 truncate max-w-[140px]">
                        {h.transitioned_by?.name || h.transitioned_by?.employee_id || '—'}
                      </div>
                      {h.transitioned_by?.employee_id && (
                        <div className="text-slate-400 text-[9px]">({h.transitioned_by.employee_id})</div>
                      )}
                      <div
                        className="text-slate-400 text-[9px]"
                        title={absTime(h.transitioned_at)}
                      >
                        {relTime(h.transitioned_at)}
                      </div>
                    </div>

                    {/* Reason card */}
                    {h.reason ? (
                      <div className="mt-1 text-[10px] text-slate-600 bg-slate-50/60 border border-slate-100 rounded-lg px-2.5 py-1.5 leading-relaxed font-sans text-left w-full max-w-[150px]">
                        <span className="font-bold text-slate-400 uppercase text-[8px] tracking-wider block mb-0.5">Reason</span>
                        <span className="text-slate-600 break-words">{h.reason}</span>
                      </div>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </SectionCard>
  );
}
