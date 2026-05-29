// ============================================================================
// pages/conversion/components/ConversionTabs.jsx
// ----------------------------------------------------------------------------
// Three-tab strip for the /conversion page. Each tab is a JR.job_type
// bucket. Badge after the label = pending count (refetched every 30s by
// the parent's useConversionList hook).
//
// Pure presentation — receives the activeTab + counts as props, calls
// `onChange(value)` when the user clicks a tab.
// ============================================================================

import clsx from 'clsx';

export const CONVERSION_TABS = [
  { value: 'CALIBRATION',  label: 'Calibration' },
  { value: 'REPAIR',       label: 'Inspection' },
  { value: 'REGISTRATION', label: 'Master Data Correction' },
];

/**
 * @param {Object} props
 * @param {'CALIBRATION'|'REPAIR'|'REGISTRATION'} props.active
 * @param {(value: string) => void} props.onChange
 * @param {Record<string, number>} props.counts  e.g. { CALIBRATION: 3, REPAIR: 2, REGISTRATION: 2 }
 */
export function ConversionTabs({ active, onChange, counts }) {
  return (
    <div
      role="tablist"
      aria-label="Conversion request type"
      className="border-b border-border flex items-center gap-6"
    >
      {CONVERSION_TABS.map((tab) => {
        const isActive = tab.value === active;
        const n = counts?.[tab.value];
        return (
          <button
            key={tab.value}
            role="tab"
            type="button"
            aria-selected={isActive}
            onClick={() => onChange(tab.value)}
            className={clsx(
              'pb-2 pt-1 -mb-px border-b-2 text-sm flex items-center gap-2 transition-colors',
              isActive
                ? 'border-accent text-accent font-semibold'
                : 'border-transparent text-ink-soft hover:text-ink',
            )}
          >
            {tab.label}
            <span className={clsx(
              'inline-flex items-center justify-center min-w-[1.5rem] px-1.5 py-0.5 rounded-full text-xs',
              isActive ? 'bg-accent/10 text-accent' : 'bg-base text-ink-soft',
            )}>
              {n == null ? '…' : n}
            </span>
          </button>
        );
      })}
    </div>
  );
}
