// ============================================================================
// pages/jobCards/components/DetailTabBar.jsx
// ----------------------------------------------------------------------------
// 13-tab bar. Mark as Complete + Closure are conditionally rendered
// based on status + permissions (D-9.1).
// ============================================================================

import clsx from 'clsx';

export const ALL_TABS = [
  { key: 'plug-in',         label: 'Plug In / Accessories' },
  { key: 'submitted-recv',  label: 'Submitted & Received' },
  { key: 'job-card-details', label: 'Job Card Details' },
  { key: 'maintenance',     label: 'Maintenance Details' },
  { key: 'equipments-used', label: 'Equipments Used Details' },
  { key: 'awaiting',        label: 'Awaiting Information' },
  { key: 'spares',          label: 'Spares Used Details' },
  { key: 'contract',        label: 'Contract / Warranty' },
  { key: 'observations',    label: 'Observations' },
  { key: 'tasks',           label: 'Task Checklist' },
  { key: 'documents',       label: 'Documents' },
  { key: 'mark-complete',   label: 'Mark as Complete' },     // conditional
  { key: 'closure',         label: 'Closure' },              // conditional
];

/**
 * @param {Object} props
 * @param {string} props.active
 * @param {(key: string) => void} props.onChange
 * @param {Set<string>} props.visibleKeys     Subset of ALL_TABS.keys allowed for this JC + user.
 */
export function DetailTabBar({ active, onChange, visibleKeys }) {
  const tabs = ALL_TABS.filter((t) => visibleKeys.has(t.key));
  return (
    <div
      role="tablist"
      aria-label="Job Card tabs"
      className="flex items-center gap-1 overflow-x-auto border-b border-border pb-px"
    >
      {tabs.map((t) => {
        const isActive = t.key === active;
        return (
          <button
            key={t.key}
            role="tab"
            type="button"
            aria-selected={isActive}
            onClick={() => onChange(t.key)}
            className={clsx(
              'px-3 py-2 text-sm whitespace-nowrap border-b-2 -mb-px transition-colors',
              isActive
                ? 'border-accent text-accent font-semibold'
                : 'border-transparent text-ink-soft hover:text-ink',
            )}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
