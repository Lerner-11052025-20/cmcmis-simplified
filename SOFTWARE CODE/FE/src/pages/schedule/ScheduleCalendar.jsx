// ============================================================================
// src/pages/schedule/ScheduleCalendar.jsx  —  calendar-view body
// ----------------------------------------------------------------------------
// PHASE 13 — Schedule sub-module
//
// Layout: month grid (Sun..Sat header + 6 rows of day cells). Each day
// shows its number and any schedule chips that fall on that date. Chip
// color = type: blue for CALIBRATION, green for PREVENTIVE_MAINTENANCE.
// Today's cell shows a filled accent circle around the day number.
//
// Performance: ONE query per visible month range fetches up to 500 rows,
// then we group by ISO date in JS — zero N+1 SQL.
// ============================================================================

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { useSchedules } from '../../lib/hooks/useSchedule.js';
import { todayIstIsoDate } from '../../lib/time.js';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function startOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfMonth(d)   { return new Date(d.getFullYear(), d.getMonth() + 1, 0); }
function addMonths(d, n) { return new Date(d.getFullYear(), d.getMonth() + n, 1); }
function isoDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}
function monthLabel(d) {
  return d.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
}
function todayIstDate() {
  return new Date(`${todayIstIsoDate()}T00:00:00+05:30`);
}


/**
 * Build the 6×7 grid of dates that the calendar will render. The grid
 * starts on the Sunday on/before the first of the month and runs 42 cells.
 */
function buildMonthGrid(anchorDate) {
  const first = startOfMonth(anchorDate);
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - first.getDay()); // back to Sunday
  const cells = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    cells.push(d);
  }
  return { cells, monthStart: first, monthEnd: endOfMonth(anchorDate) };
}


export function ScheduleCalendar({ tab, onEdit }) {
  // Anchor = the month we're showing. Starts on today's month.
  const [anchor, setAnchor] = useState(() => startOfMonth(todayIstDate()));

  const { cells, monthStart, monthEnd } = useMemo(() => buildMonthGrid(anchor), [anchor]);
  const todayIso = todayIstIsoDate();

  // Fetch every schedule in the visible 6-week range (cells[0] to cells[41]).
  const fromIso = isoDate(cells[0]);
  const toIso   = isoDate(cells[cells.length - 1]);

  const { items, loading, error } = useSchedules({
    type:      tab,
    view:      'calendar',
    from:      fromIso,
    to:        toIso,
    page:      1,
    page_size: 500,
  });

  // Group schedules by ISO date for O(1) per-cell render.
  const byDay = useMemo(() => {
    const map = new Map();
    for (const s of items) {
      if (!s.scheduled_date) continue;
      const key = s.scheduled_date.slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(s);
    }
    return map;
  }, [items]);

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <div className="bg-white rounded-lg border border-border shadow-card">
      {/* Month header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h2 className="text-lg font-semibold text-ink">{monthLabel(anchor)}</h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setAnchor(addMonths(anchor, -1))}
            className="p-2 rounded hover:bg-base-elev text-ink-soft"
            aria-label="Previous month"
          >
            <ChevronLeft size={16} strokeWidth={1.75} />
          </button>
          <button
            type="button"
            onClick={() => setAnchor(startOfMonth(todayIstDate()))}
            className="px-2 py-1 text-xs text-ink-soft hover:text-ink"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => setAnchor(addMonths(anchor, +1))}
            className="p-2 rounded hover:bg-base-elev text-ink-soft"
            aria-label="Next month"
          >
            <ChevronRight size={16} strokeWidth={1.75} />
          </button>
        </div>
      </div>

      {error ? (
        <div role="alert" className="m-4 rounded-md bg-danger/10 text-danger text-xs px-3 py-2">
          Could not load calendar.
        </div>
      ) : null}

      {/* Weekday header strip */}
      <div className="grid grid-cols-7 border-b border-border bg-base/50">
        {WEEKDAYS.map((w) => (
          <div key={w} className="px-3 py-2 text-xs font-semibold text-ink-soft text-center">
            {w}
          </div>
        ))}
      </div>

      {/* 6 × 7 grid */}
      <div className="grid grid-cols-7 grid-rows-6">
        {cells.map((d, idx) => {
          const iso = isoDate(d);
          const inMonth  = d >= monthStart && d <= monthEnd;
          const isToday  = iso === todayIso;
          const events   = byDay.get(iso) || [];
          return (
            <div
              key={idx}
              className={
                'min-h-[110px] border border-border -ml-px -mt-px p-1 align-top text-xs ' +
                (inMonth ? 'bg-white' : 'bg-base/40')
              }
            >
              <div className="flex items-center justify-between px-1">
                <span
                  className={
                    'inline-flex items-center justify-center ' +
                    (isToday
                      ? 'bg-accent text-white rounded-full w-6 h-6 text-xs font-semibold'
                      : (inMonth ? 'text-ink' : 'text-ink-soft'))
                  }
                >
                  {d.getDate()}
                </span>
              </div>
              <div className="mt-1 space-y-1">
                {events.map((e) => (
                  <EventChip key={e.id} event={e} onEdit={onEdit} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 px-4 py-3 border-t border-border text-xs text-ink-soft">
        <span className="inline-flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded-sm bg-blue-100 border border-blue-300" />
          Calibration
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded-sm bg-emerald-100 border border-emerald-300" />
          Preventive Maintenance
        </span>
        {loading ? <span className="ml-auto">Loading…</span> : null}
      </div>
    </div>
  );
}


function EventChip({ event, onEdit }) {
  const isCal = event.schedule_type === 'CALIBRATION';
  const cls = isCal
    ? 'bg-blue-50 text-blue-700 border border-blue-200'
    : 'bg-emerald-50 text-emerald-700 border border-emerald-200';
  const prefix = isCal ? 'CAL' : 'PM';
  const label  = `${prefix}: ${event.equipment_label || event.equipment_id}`;
  return (
    <button
      type="button"
      onClick={() => onEdit && onEdit(event)}
      title={`${label} — ${event.status}`}
      className={`block w-full text-left px-2 py-0.5 rounded text-xs truncate ${cls}`}
    >
      {label}
    </button>
  );
}
