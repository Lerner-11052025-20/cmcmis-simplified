// ============================================================================
// src/pages/schedule/SchedulePage.jsx  —  /schedule route
// ----------------------------------------------------------------------------
// PHASE 13 — Schedule sub-module
//
// PAGE CHROME
//
//   Schedule                                              [ + Create Schedule ]
//   Plan and track preventive maintenance and calibration schedules
//
//   ┌──────────────────────────────────────────────────────────────────────┐
//   │ Preventive Maintenance | Calibration Schedule        [list] [calendar]│
//   └──────────────────────────────────────────────────────────────────────┘
//
//   <ScheduleList /> OR <ScheduleCalendar />   (toggled by viewMode)
//
// View toggle persists in localStorage so a hard refresh respects the
// user's pick. Tab + viewMode are independent — changing one does not
// reset the other.
// ============================================================================

import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, List as ListIcon, Plus, Download } from 'lucide-react';

import { Button } from '../../components/ui/Button.jsx';
import { useAuth } from '../../lib/auth-context.jsx';
import { ScheduleList }     from './ScheduleList.jsx';
import { ScheduleCalendar } from './ScheduleCalendar.jsx';
import { ScheduleFormModal } from './ScheduleFormModal.jsx';
import { downloadSchedulesIcsBulk } from '../../lib/api/schedule.js';

// Persisted UI prefs (per-user is overkill — page-local is fine).
const TAB_KEY  = 'cmcmis.schedule.tab';   // 'PREVENTIVE_MAINTENANCE' | 'CALIBRATION'
const VIEW_KEY = 'cmcmis.schedule.view';  // 'list' | 'calendar'

function readPref(key, fallback) {
  try { return window.localStorage.getItem(key) || fallback; } catch { return fallback; }
}
function writePref(key, value) {
  try { window.localStorage.setItem(key, value); } catch { /* ignore */ }
}


export function SchedulePage() {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission('schedule:create');
  const canExport = hasPermission('schedule:export');

  // ── State ──────────────────────────────────────────────────────────
  const [tab,       setTab]       = useState(() => readPref(TAB_KEY,  'PREVENTIVE_MAINTENANCE'));
  const [viewMode,  setViewMode]  = useState(() => readPref(VIEW_KEY, 'calendar'));
  const [showModal, setShowModal] = useState(false);
  const [editing,   setEditing]   = useState(null);   // schedule row when editing

  useEffect(() => writePref(TAB_KEY,  tab),      [tab]);
  useEffect(() => writePref(VIEW_KEY, viewMode), [viewMode]);

  // ICS bulk export — uses the current tab as the type filter.
  const exportIcs = async () => {
    try {
      await downloadSchedulesIcsBulk({ type: tab });
    } catch (e) {
      // No top-level toast scaffolding for export errors yet — log + alert.
      console.error('ICS export failed', e);
      alert('Could not export ICS feed. Please try again.');
    }
  };

  const openCreate = () => { setEditing(null); setShowModal(true); };
  const openEdit   = (row) => { setEditing(row); setShowModal(true); };

  // ── Header chrome ──────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Schedule</h1>
          <p className="text-sm text-ink-soft mt-1">
            Plan and track preventive maintenance and calibration schedules
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canExport ? (
            <Button variant="secondary" onClick={exportIcs}>
              <Download size={16} strokeWidth={1.75} aria-hidden="true" />
              Export .ics
            </Button>
          ) : null}
          {canCreate ? (
            <Button variant="primary" onClick={openCreate}>
              <Plus size={16} strokeWidth={1.75} aria-hidden="true" />
              Create Schedule
            </Button>
          ) : null}
        </div>
      </div>

      {/* ── Tabs + view toggle ─────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-border">
        <nav className="flex gap-6" aria-label="Schedule tabs">
          <TabButton
            label="Preventive Maintenance"
            active={tab === 'PREVENTIVE_MAINTENANCE'}
            onClick={() => setTab('PREVENTIVE_MAINTENANCE')}
          />
          <TabButton
            label="Calibration Schedule"
            active={tab === 'CALIBRATION'}
            onClick={() => setTab('CALIBRATION')}
          />
        </nav>
        <div className="flex items-center gap-1 pb-2">
          <ViewToggle
            label="List view"
            active={viewMode === 'list'}
            icon={ListIcon}
            onClick={() => setViewMode('list')}
          />
          <ViewToggle
            label="Calendar view"
            active={viewMode === 'calendar'}
            icon={CalendarDays}
            onClick={() => setViewMode('calendar')}
          />
        </div>
      </div>

      {/* ── Content ────────────────────────────────────────────────── */}
      {viewMode === 'calendar' ? (
        <ScheduleCalendar tab={tab} onEdit={openEdit} />
      ) : (
        <ScheduleList tab={tab} onEdit={openEdit} />
      )}

      {/* ── Create/Edit modal ──────────────────────────────────────── */}
      {showModal ? (
        <ScheduleFormModal
          defaultType={tab}
          schedule={editing}
          onClose={() => setShowModal(false)}
        />
      ) : null}
    </div>
  );
}


function TabButton({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'pb-3 -mb-px text-sm font-semibold transition-colors ' +
        (active
          ? 'text-accent border-b-2 border-accent'
          : 'text-ink-soft hover:text-ink')
      }
    >
      {label}
    </button>
  );
}

function ViewToggle({ label, active, icon: Icon, onClick }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={
        'p-2 rounded-md transition-colors ' +
        (active ? 'bg-accent/10 text-accent' : 'text-ink-soft hover:bg-base-elev')
      }
    >
      <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
    </button>
  );
}
