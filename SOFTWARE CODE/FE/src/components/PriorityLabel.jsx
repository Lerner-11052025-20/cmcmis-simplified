// ============================================================================
// src/components/PriorityLabel.jsx  —  Colour-coded priority text
// ----------------------------------------------------------------------------
// Renders the priority as a coloured *label* (not a pill — matches the
// reference screen). High=red, Medium=amber, Low=green.
// ============================================================================

import clsx from 'clsx';

const STYLE = {
  HIGH:   'text-red-600 font-medium',
  MEDIUM: 'text-amber-600 font-medium',
  LOW:    'text-green-600 font-medium',
};

const LABEL = {
  HIGH:   'High',
  MEDIUM: 'Medium',
  LOW:    'Low',
};

/**
 * @param {Object} props
 * @param {string} props.priority  LOW | MEDIUM | HIGH
 */
export function PriorityLabel({ priority }) {
  const cls = STYLE[priority] || 'text-ink-soft';
  const label = LABEL[priority] || priority || '—';
  return <span className={clsx(cls)}>{label}</span>;
}
