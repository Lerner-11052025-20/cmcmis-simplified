// ============================================================================
// src/components/Brand.jsx  —  Reusable CMCMIS wordmark
// ----------------------------------------------------------------------------
// PURPOSE
//   Single source of truth for the CMCMIS visual identity. Used in three
//   places: above the Login card, in the Sidebar header, and anywhere
//   else we need a quiet brand mark. The page-level subtitle ("Calibration
//   & Maintenance Management / ISRO SAC") lives on Login.jsx, not here —
//   that keeps Brand reusable in tight contexts (Sidebar) without
//   duplicating layout logic.
//
// VISUAL
//   "CMCMIS" in ink color (slightly tracked for solidity), followed by a
//   small accent dot. The dot is the only chromatic element — it's our
//   visual anchor and matches the accent CTA color exactly so the brand
//   reads as "part of the same family" as the primary actions.
// ============================================================================

import clsx from 'clsx';

// Lookup table for per-size styling. Keys are the values accepted by the
// `size` prop; values are Tailwind class strings.
const SIZE_STYLES = {
  sm: 'text-base tracking-tight',
  md: 'text-xl tracking-tight',
  lg: 'text-3xl tracking-tight',
};

/**
 * Brand wordmark.
 *
 * @param {Object} props
 * @param {'sm'|'md'|'lg'} [props.size]   Display size; defaults to 'md'.
 * @param {string}         [props.className]  Optional className for outer fine-tuning.
 */
export function Brand({ size = 'md', className }) {
  return (
    <span
      className={clsx('font-semibold text-ink select-none', SIZE_STYLES[size], className)}
      aria-label="CMCMIS"
    >
      CMCMIS
      <span className="text-accent ml-0.5" aria-hidden="true">
        ·
      </span>
    </span>
  );
}
