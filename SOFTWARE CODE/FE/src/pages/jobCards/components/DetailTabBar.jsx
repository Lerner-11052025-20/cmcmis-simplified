// ============================================================================
// pages/jobCards/components/DetailTabBar.jsx
// ----------------------------------------------------------------------------
// 13-tab bar. Mark as Complete + Closure are conditionally rendered
// based on status + permissions (D-9.1).
// ============================================================================

import clsx from 'clsx';

export const ALL_TABS = [
  { key: 'information',     label: 'Information' },
  { key: 'equipment-details', label: 'Equipment Details' },
  { key: 'conversion-planning', label: 'Conversion & Planning Details' },
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

export const CALIBRATION_TABS = [
  { key: 'information', label: 'Information' },
  { key: 'equipment-details', label: 'Equipment Details' },
  { key: 'conversion-planning', label: 'Conversion & Planning Details' },
  { key: 'tasks', label: 'Task Checklist' },
  { key: 'cal-job-details', label: 'Job Card Details' },
  { key: 'cal-status', label: 'Calibration Status' },
  { key: 'cal-equipment-used', label: 'Equipment Used Details' },
  { key: 'cal-adjustments', label: 'Adjustments Details' },
  { key: 'cal-remarks', label: 'Remarks' },
  { key: 'documents', label: 'Documents' },
  { key: 'job-closing', label: 'Job Closing' },
];

export const REPAIR_TABS = [
  { key: 'information', label: 'Information' },
  { key: 'equipment-details', label: 'Equipment Details' },
  { key: 'conversion-planning', label: 'Conversion & Planning Details' },
  { key: 'repair-plug-in', label: 'Plug In / Accessories' },
  { key: 'repair-submitted-recv', label: 'Submitted & Received' },
  { key: 'repair-job-card-details', label: 'Job Card Details' },
  { key: 'repair-maintenance', label: 'Maintenance Details' },
  { key: 'repair-equipment-used', label: 'Equipments Used Details' },
  { key: 'awaiting', label: 'Awaiting Information' },
  { key: 'spares', label: 'Spares Used Details' },
  { key: 'repair-contract', label: 'Contract / Warranty' },
  { key: 'repair-fault-analysis', label: 'Fault Analysis' },
  { key: 'mark-complete', label: 'Mark as Complete' },
  { key: 'closure', label: 'Closure' },
];

/**
 * @param {Object} props
 * @param {string} props.active
 * @param {(key: string) => void} props.onChange
 * @param {Set<string>} props.visibleKeys     Subset of ALL_TABS.keys allowed for this JC + user.
 */
export function DetailTabBar({ active, onChange, visibleKeys, tabs: tabsProp = ALL_TABS }) {
  const tabs = tabsProp.filter((t) => visibleKeys.has(t.key));
  return (
    <div
      role="tablist"
      aria-label="Job Card tabs"
      className="flex items-center gap-2 overflow-x-auto border-b border-border pb-2"
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
