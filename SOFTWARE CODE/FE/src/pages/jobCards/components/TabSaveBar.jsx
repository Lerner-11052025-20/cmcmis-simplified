import { AlertTriangle, CheckCircle2, Loader2, Save, ChevronUp } from 'lucide-react';
import clsx from 'clsx';

import { Button } from '../../../components/ui/Button.jsx';
import { formatIstDate } from '../../../lib/time.js';

function savedDate(d) {
  return formatIstDate(d);
}

export function TabSaveBar({
  saving,
  dirty,
  onSave,
  autoSaveStatus,
  lastSavedAt,
  consecutiveFails = 0,
  autoSavePref,
  onTogglePref,
  disabled,
  disabledReason,
}) {
  let pill = null;
  if (saving) {
    pill = (
      <span className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-700">
        <Loader2 size={12} strokeWidth={1.75} className="animate-spin" aria-hidden="true" />
        Saving...
      </span>
    );
  } else if (autoSaveStatus === 'error' || consecutiveFails >= 3) {
    pill = (
      <span className="inline-flex items-center gap-1 rounded-md border border-danger/30 bg-danger/10 px-2 py-1 text-xs text-danger">
        <AlertTriangle size={12} strokeWidth={1.75} aria-hidden="true" />
        Save failed
      </span>
    );
  } else if (lastSavedAt) {
    pill = (
      <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs text-emerald-700">
        <CheckCircle2 size={12} strokeWidth={1.75} aria-hidden="true" />
        Saved {savedDate(lastSavedAt)}
      </span>
    );
  } else if (dirty) {
    pill = (
      <span className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-700">
        Unsaved changes
      </span>
    );
  } else {
    pill = <span className="text-xs text-ink-soft">No unsaved changes</span>;
  }

  return (
    <div
      className={clsx(
        'sticky bottom-2 mt-4 rounded-lg border border-indigo-200 bg-white p-3 shadow-lg',
        'flex items-center justify-between gap-3',
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        {pill}
        {typeof onTogglePref === 'function' ? (
          <button
            type="button"
            onClick={onTogglePref}
            className="inline-flex items-center gap-1 text-xs text-ink-soft hover:text-ink"
            title={autoSavePref ? 'Auto-save is ON - click to disable' : 'Auto-save is OFF - click to enable'}
          >
            <ChevronUp
              size={12}
              strokeWidth={1.75}
              className={clsx('transition-transform', autoSavePref ? '' : 'rotate-180')}
              aria-hidden="true"
            />
            Auto-save: <span className="font-medium text-ink">{autoSavePref ? 'On' : 'Off'}</span>
          </button>
        ) : null}
      </div>

      <Button
        variant="primary"
        size="md"
        disabled={!dirty || saving || disabled}
        onClick={onSave}
        title={disabledReason || (dirty ? 'Save current work' : 'No changes to save')}
        className="!bg-indigo-600 px-5 shadow-md hover:!bg-indigo-700"
      >
        <Save size={14} strokeWidth={1.75} aria-hidden="true" />
        {saving ? 'Saving...' : 'Save Changes'}
      </Button>
    </div>
  );
}
