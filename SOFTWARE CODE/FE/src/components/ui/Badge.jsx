// ============================================================================
// src/components/ui/Badge.jsx  —  Tiny pill for status/role tags
// ----------------------------------------------------------------------------
// PURPOSE
//   Small inline label used in:
//     • Sidebar / TopBar role pill (color="badge" for SUPER_ADMIN etc.)
//     • Equipment / JR / JC status chips (success / warning / danger)
//     • "Coming soon" markers on disabled features
//
// COLOR PROP
//   Maps to one of the status tokens defined in tailwind.config.js.
//   Each color renders the pill with a soft tint (10% opacity bg) and
//   the full-strength color on the text — gentle on a dense page.
// ============================================================================

import clsx from 'clsx';

// Tailwind purges any class string it can't see literally in source —
// so we list each variant explicitly rather than building strings.
const COLORS = {
  badge:   'bg-badge/10   text-badge',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  danger:  'bg-danger/10  text-danger',
  accent:  'bg-accent/10  text-accent',
  ink:     'bg-base-elev   text-ink-soft',
};

/**
 * Pill badge.
 *
 * @param {Object} props
 * @param {keyof typeof COLORS} [props.color]   Defaults to 'ink' (neutral).
 * @param {string}              [props.className]
 * @param {React.ReactNode}     props.children
 */
export function Badge({ color = 'ink', className, children }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium',
        COLORS[color],
        className,
      )}
    >
      {children}
    </span>
  );
}
