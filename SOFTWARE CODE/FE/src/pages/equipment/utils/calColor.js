// ============================================================================
// src/pages/equipment/utils/calColor.js  —  Calibration-due colour rule
// ----------------------------------------------------------------------------
// FR-E-05 / BR-EQP-05:
//   • Overdue (days < 0)       → danger (red)
//   • Due soon (0 ≤ days < 30) → warning (amber)
//   • Valid (days ≥ 30)        → ink (neutral)
//   • Null / no due date       → ink-soft (greyed out — F&PE not required)
// ============================================================================

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * @param {string|null|undefined} dueDateStr  YYYY-MM-DD or null
 * @returns Tailwind class string
 */
export function calDueClass(dueDateStr) {
  if (!dueDateStr) return 'text-ink-soft';
  const due = new Date(dueDateStr + 'T00:00:00Z').getTime();
  if (Number.isNaN(due)) return 'text-ink-soft';
  const today = Date.now();
  const days = Math.floor((due - today) / MS_PER_DAY);
  if (days < 0) return 'text-danger font-medium';
  if (days < 30) return 'text-warning font-medium';
  return 'text-ink';
}
