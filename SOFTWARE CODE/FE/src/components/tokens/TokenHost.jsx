// ============================================================================
// src/components/tokens/TokenHost.jsx  —  Capsule strip below the TopBar
// ----------------------------------------------------------------------------
// PHASE 12 — Task 2 (Tokens)
//
// POSITION
//   Anchored inside <Layout> in the band BETWEEN the sticky TopBar and
//   the main page content (i.e. above whatever the page renders). We
//   do NOT use position:fixed; the host is just a centred flex container
//   so the capsules float over the page while remaining part of the
//   normal layout flow (no overlap with sidebar / TopBar).
//
// CAPSULE
//   Pill-shaped (fully rounded ends), single-line message + optional
//   sub-line, date stamp on the right, × close button. Variants
//   colour the background + ring; text uses the darkest shade of the
//   same family (not plain black) per spec §4.1.
//
//   Stacking: newest on top, max MAX_VISIBLE (3). Reduced-motion users
//   get a subtle fade only (CSS `motion-reduce:` utilities).
// ============================================================================

import { X } from 'lucide-react';
import clsx from 'clsx';

import { useTokenStore } from '../../lib/tokens/tokenStore.js';
import { formatIstDate } from '../../lib/time.js';

// Variant → colour classes. We pick from Tailwind's palette so the
// capsule reads correctly on both light and (future) dark themes.
const VARIANT_CLASS = {
  success: 'bg-emerald-50 text-emerald-900 ring-emerald-200',
  info:    'bg-sky-50     text-sky-900     ring-sky-200',
  danger:  'bg-red-50     text-red-900     ring-red-200',
};

const VARIANT_CLOSE = {
  success: 'text-emerald-700 hover:bg-emerald-100',
  info:    'text-sky-700     hover:bg-sky-100',
  danger:  'text-red-700     hover:bg-red-100',
};

export function TokenHost() {
  const tokens  = useTokenStore((s) => s.tokens);
  const dismiss = useTokenStore((s) => s.dismiss);

  // Render nothing when empty — keeps the strip from claiming any
  // vertical space, so page titles sit flush against the TopBar.
  if (tokens.length === 0) return null;

  // Newest on top: render in reverse-chronological order. The store
  // pushes newest to the END of the array; flipping here matches the
  // "stack growing downward from the top" expectation.
  const ordered = [...tokens].slice().reverse();

  return (
    <div
      role="status"
      aria-live="polite"
      // Non-blocking strip — pointer-events-none on the container so the
      // user can still click links BELOW a capsule; capsules themselves
      // re-enable pointer events.
      className="pointer-events-none flex flex-col items-center gap-2 mt-3"
    >
      {ordered.map((t) => (
        <div
          key={t.id}
          className={clsx(
            'pointer-events-auto inline-flex items-center gap-3 rounded-full',
            'ring-1 ring-inset shadow-sm px-4 py-1.5',
            'text-sm font-medium',
            'animate-[fadeSlideDown_180ms_ease-out] motion-reduce:animate-none',
            VARIANT_CLASS[t.variant] || VARIANT_CLASS.info,
          )}
          style={{
            // Inline keyframes so the host doesn't depend on tailwind.config.js.
            // The class above triggers it; the keyframes live below in a global
            // injection inside Layout — see Layout.jsx for the @keyframes block.
          }}
        >
          <span className="truncate max-w-md">{t.message}</span>
          {t.sub ? (
            <span className="opacity-70 text-xs truncate max-w-xs">{t.sub}</span>
          ) : null}
          <span className="opacity-60 text-[11px] tabular-nums shrink-0">
            {formatIstDate(t.at)}
          </span>
          <button
            type="button"
            onClick={() => dismiss(t.id)}
            aria-label="Dismiss"
            className={clsx(
              'inline-flex h-5 w-5 items-center justify-center rounded-full -mr-1',
              'transition-colors',
              VARIANT_CLOSE[t.variant] || VARIANT_CLOSE.info,
            )}
          >
            <X size={11} strokeWidth={2.25} aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  );
}
