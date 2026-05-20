// ============================================================================
// src/components/MadeWithLove.jsx  —  Authorship credit pill (everywhere)
// ----------------------------------------------------------------------------
// PURPOSE
//   A single, reusable, "highlighted box" credit that appears at the BOTTOM
//   of every page, every popup, every form, every drawer. One source of
//   truth so the wording / styling never drifts across screens.
//
// PEOPLE
//   • Deep Sorathiya (DS) — Core Developer
//   • Moksh Gandhi        — Designer
//
// STYLE
//   A small rounded pill with:
//     • soft rose → amber gradient background (visible but not loud)
//     • rose-200 border ring for the "highlighted box" feel
//     • a filled rose-500 Heart icon to anchor the "made with love" line
//     • Tailwind drop-shadow + a tiny inset highlight on hover
//   The pill is centered horizontally and sits on its own border-top so it
//   reads as a footer band wherever it's placed.
//
// VARIANTS
//   <MadeWithLove />          default — full pill with both names + roles
//   <MadeWithLove size="sm"/> condensed — same line, tighter padding,
//                              ideal inside modal/drawer footers where
//                              vertical space is at a premium
//
// USAGE
//   Bottom of any page body:
//     <MadeWithLove />
//
//   Bottom of any modal/drawer (inside the footer strip):
//     <MadeWithLove size="sm" />
//
//   ZERO dependencies on routing/auth — it's a pure presentational chip
//   that can be dropped anywhere a React node fits.
// ============================================================================

import { Heart } from 'lucide-react';

/**
 * @param {Object} props
 * @param {'sm'|'md'} [props.size]   'md' (default) — full footer pill.
 *                                    'sm' — condensed for modal footers.
 * @param {string}    [props.className] Extra wrapper classes (margins etc).
 */
export function MadeWithLove({ size = 'md', className = '' }) {
  // ── Size knobs ─────────────────────────────────────────────────────
  // We deliberately keep the typography small at both sizes so the pill
  // never competes with primary CTAs. The 'sm' variant trims padding +
  // gap so it slots cleanly into a 3rem-tall modal footer.
  const isCompact = size === 'sm';
  const wrapPad   = isCompact ? 'py-2'             : 'py-3 mt-6 pt-4 border-t border-border';
  const pillPad   = isCompact ? 'px-3 py-1 gap-1.5' : 'px-4 py-1.5 gap-2';
  const heartSz   = isCompact ? 11                 : 12;
  const textSz    = isCompact ? 'text-[10px]'      : 'text-[11px]';
  const sep       = <span className="text-rose-300/70" aria-hidden="true">·</span>;

  return (
    <div
      className={[
        'flex items-center justify-center',
        wrapPad,
        className,
      ].join(' ')}
    >
      {/* The pill itself — the "highlighted box". Gradient ↔ border ↔ Heart. */}
      <div
        className={[
          'inline-flex items-center rounded-full select-none',
          pillPad,
          textSz,
          // Soft gradient — rose → amber → rose. Distinct, never blends in.
          'bg-gradient-to-r from-rose-50 via-amber-50 to-rose-50',
          // Highlighted-box ring + subtle shadow.
          'border border-rose-200 shadow-sm',
          // Gentle hover lift — gives the pill some "life" without being noisy.
          'transition-shadow hover:shadow-md',
        ].join(' ')}
        role="contentinfo"
        aria-label="Authorship credit"
      >
        <Heart
          size={heartSz}
          strokeWidth={1.75}
          aria-hidden="true"
          className="text-rose-500 fill-rose-500"
        />
        <span className="text-ink-soft">Made with</span>
        <Heart
          size={heartSz - 2}
          strokeWidth={1.75}
          aria-hidden="true"
          className="text-rose-500 fill-rose-500"
        />
        <span className="text-ink-soft">by</span>

        <span className="font-semibold text-ink">Deep Sorathiya (DS)</span>
        <span className="text-rose-700 font-medium">Core Developer</span>

        {sep}

        <span className="font-semibold text-ink">Moksh Gandhi</span>
        <span className="text-rose-700 font-medium">Designer</span>
      </div>
    </div>
  );
}
