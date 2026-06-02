// ============================================================================
// pages/jobCards/components/TabSaveBar.jsx
// ----------------------------------------------------------------------------
// Sticky bottom save bar shared across all 9 data tabs. Renders:
//   • Auto-save status pill ("Saved <date>" / "Saving…" / "Save failed")
//   • Auto-save preference toggle (chevron) — D-9.2, Q-1 default ON
//   • "Save as Draft" button (silent)
//   • "Save Changes" button (primary CTA)
//
// Both buttons hit the same endpoint (PATCH /job-cards/:id) — visual
// distinction only.
//
// The parent passes:
//   • saving   — boolean (true during the active PATCH)
//   • dirty    — boolean (form has uncommitted changes)
//   • onSave   — () => Promise (called by both buttons)
//   • autoSaveStatus + lastSavedAt — from useAutoSave
//   • autoSavePref + onTogglePref  — persisted preference
// ============================================================================

import { ChevronUp, Save, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '../../../components/ui/Button.jsx';
import clsx from 'clsx';
import { formatIstDate } from '../../../lib/time.js';

function savedDate(d) {
  return formatIstDate(d);
}

export function TabSaveBar({
  saving, dirty, onSave,
  autoSaveStatus, lastSavedAt, consecutiveFails,
  autoSavePref, onTogglePref,
  disabled,                                // status != IN_PROGRESS or legacy or not own
  disabledReason,                          // tooltip explanation
}) {
  // Pill content
  let pill = null;
  if (autoSaveStatus === 'saving' || saving) {
    pill = (
      <span className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded-md border border-amber-200">
        <Loader2 size={12} strokeWidth={1.75} className="animate-spin" aria-hidden="true" />
        Saving…
      </span>
    );
  } else if (autoSaveStatus === 'error' || consecutiveFails >= 3) {
    pill = (
      <span className="inline-flex items-center gap-1 text-xs text-danger bg-danger/10 px-2 py-1 rounded-md border border-danger/30">
        <AlertTriangle size={12} strokeWidth={1.75} aria-hidden="true" />
        Save failed — retrying
      </span>
    );
  } else if (autoSaveStatus === 'saved' || lastSavedAt) {
    pill = (
      <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200">
        <CheckCircle2 size={12} strokeWidth={1.75} aria-hidden="true" />
        Saved {savedDate(lastSavedAt)}
      </span>
    );
  } else if (autoSaveStatus === 'pending') {
    pill = (
      <span className="inline-flex items-center gap-1 text-xs text-ink-soft bg-base px-2 py-1 rounded-md border border-border">
        Unsaved changes
      </span>
    );
  } else {
    pill = <span className="text-xs text-ink-soft">No unsaved changes</span>;
  }

  return (
    <div className={clsx(
      'sticky bottom-2 mt-4 bg-base-elev border border-border rounded-lg p-3',
      'flex items-center justify-between gap-3 shadow-card',
    )}>
      <div className="flex items-center gap-3 min-w-0">
        {pill}
        {/* Auto-save preference toggle */}
        <button
          type="button"
          onClick={onTogglePref}
          className="inline-flex items-center gap-1 text-xs text-ink-soft hover:text-ink"
          title={autoSavePref ? 'Auto-save is ON — click to disable' : 'Auto-save is OFF — click to enable'}
        >
          <ChevronUp
            size={12}
            strokeWidth={1.75}
            className={clsx('transition-transform', autoSavePref ? '' : 'rotate-180')}
            aria-hidden="true"
          />
          Auto-save: <span className="font-medium text-ink">{autoSavePref ? 'On' : 'Off'}</span>
        </button>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="md"
          disabled={!dirty || saving || disabled}
          onClick={onSave}
          title={disabledReason || (dirty ? 'Save without changing status' : 'No changes to save')}
        >
          Save as Draft
        </Button>
        <Button
          variant="primary"
          size="md"
          disabled={!dirty || saving || disabled}
          onClick={onSave}
          title={disabledReason || (dirty ? 'Save tab data' : 'No changes to save')}
        >
          <Save size={14} strokeWidth={1.75} aria-hidden="true" />
          {saving ? 'Saving…' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}
