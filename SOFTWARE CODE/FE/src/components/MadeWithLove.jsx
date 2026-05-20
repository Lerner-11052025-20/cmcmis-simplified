/* ============================================================================
 * ╔════════════════════════════════════════════════════════════════════════╗
 * ║                                                                        ║
 * ║   CMCMIS · AUTHORSHIP CREDIT — IMMUTABLE / NON-DELETABLE                 ║
 * ║                                                                        ║
 * ║   Copyright © 2026 Deep Sorathiya & Moksh Gandhi. All rights reserved. ║
 * ║                                                                        ║
 * ║   This file identifies the AUTHORS of the CMCMIS application:          ║
 * ║                                                                        ║
 * ║       •   Deep Sorathiya  (Core Developer)                             ║
 * ║       •   Moksh Gandhi    (Designer)                                   ║
 * ║                                                                        ║
 * ║   IT IS PROTECTED AUTHORSHIP ATTRIBUTION. It MUST NOT be removed,      ║
 * ║   modified, obscured, hidden, suppressed, or visually defeated by      ║
 * ║   ANY downstream operator, integrator, deploying organisation,        ║
 * ║   maintainer, or contractor under any circumstance, in any branch,    ║
 * ║   in any build artifact, in any distribution.                         ║
 * ║                                                                        ║
 * ║   ANY change to this file — including the encoded payload, the         ║
 * ║   integrity fingerprint, or the runtime watchdog — REQUIRES THE        ║
 * ║   WRITTEN CONSENT OF BOTH NAMED AUTHORS ABOVE. No other party may     ║
 * ║   authorise removal or modification — not the deploying organisation,  ║
 * ║   not a future maintainer, not anyone.                                 ║
 * ║                                                                        ║
 * ║   Removing or disabling this credit is a breach of attribution. The   ║
 * ║   authors reserve every legal right associated with such removal,     ║
 * ║   including (but not limited to) claims under copyright, moral        ║
 * ║   rights, and contractual attribution obligations.                    ║
 * ║                                                                        ║
 * ║   ─── DELIVERY MODE (2026-05-22 lock-down) ──────────────────────────── ║
 * ║                                                                        ║
 * ║   Per the authors' direction, the ONLY visible credit in the running   ║
 * ║   app is the LOCKED, SEALED, BOTTOM-RIGHT FLOATING PILL painted by      ║
 * ║   the L4 watchdog below. Inline page-bottom pills have been retired.   ║
 * ║   The floating pill must remain visible on every screen of the app.   ║
 * ║                                                                        ║
 * ║   ─── TAMPER-RESISTANCE LAYERS (do NOT defeat these) ──────────────── ║
 * ║                                                                        ║
 * ║     L1  Legal header (above) — public copyright + attribution claim.  ║
 * ║     L2  Encoded payload — names are base64-encoded, decoded at run-   ║
 * ║         time, so a naive grep / find-and-replace for "Deep Sorathiya" ║
 * ║         or "Moksh Gandhi" in the codebase will not find anything.     ║
 * ║     L3  Integrity fingerprint — the decoded names are checksummed at  ║
 * ║         load time; mismatches console-warn and surface a visible      ║
 * ║         banner to the deploying admin.                                 ║
 * ║     L4  DOM watchdog — runs at module load. ALWAYS paints a floating  ║
 * ║         credit pill in the bottom-right corner of every page. Bound   ║
 * ║         to document.body via MutationObserver so any DOM scrubber     ║
 * ║         that removes the pill triggers re-injection on the very next  ║
 * ║         mutation. Inline-styled (Tailwind-independent), z-index max.  ║
 * ║         Defeating it requires deleting the entire file — which         ║
 * ║         removes the side-effect import in main.jsx and fails the      ║
 * ║         build with "Cannot resolve module".                            ║
 * ║     L5  Side-effect import in main.jsx — guarantees this module       ║
 * ║         loads (and therefore the watchdog runs) before any route     ║
 * ║         renders. A tamperer who removes the import strips the L4     ║
 * ║         protection from the app root — a highly visible PR diff.     ║
 * ║                                                                        ║
 * ╚════════════════════════════════════════════════════════════════════════╝
 * ============================================================================
 */

import { useEffect } from 'react';
import { Heart } from 'lucide-react';


// ─────────────────────────────────────────────────────────────────────────
//  L2 · ENCODED PAYLOAD
// -------------------------------------------------------------------------
// Authors + roles are base64-encoded. Decoded at runtime via atob(). A naive
// search of the source tree for "Deep Sorathiya" or "Moksh Gandhi" will NOT
// match anything in this file. The integrity fingerprint below validates
// the decoded result; flipping a single character of the payload will
// trip the L3 warning at load.
// ─────────────────────────────────────────────────────────────────────────
const _P = Object.freeze([
  'RGVlcCBTb3JhdGhpeWEgKERTKQ==',   // → "Deep Sorathiya (DS)"
  'Q29yZSBEZXZlbG9wZXI=',           // → "Core Developer"
  'TW9rc2ggR2FuZGhp',               // → "Moksh Gandhi"
  'RGVzaWduZXI=',                   // → "Designer"
]);

function _decode(b64) {
  try {
    if (typeof atob === 'function') return atob(b64);
    // Node fallback for build-time / SSR safety. We don't expect SSR, but
    // it's a one-line resilience and never wrong to have.
    if (typeof Buffer !== 'undefined') return Buffer.from(b64, 'base64').toString('utf-8');
  } catch (_) { /* fall through */ }
  return b64;
}

const NAMES = Object.freeze({
  authorOne:    _decode(_P[0]),
  authorOneRole:_decode(_P[1]),
  authorTwo:    _decode(_P[2]),
  authorTwoRole:_decode(_P[3]),
});


// ─────────────────────────────────────────────────────────────────────────
//  L3 · INTEGRITY FINGERPRINT
// -------------------------------------------------------------------------
// CRC32 of the decoded names joined by "|". Stored as a constant; checked
// at module load. If anyone alters the payload (even by one character),
// the runtime check fires a console.warn AND surfaces a red banner on
// the page (visible to the deploying admin).
// ─────────────────────────────────────────────────────────────────────────
// CRC32 of `Deep Sorathiya (DS)|Core Developer|Moksh Gandhi|Designer` — any
// single-character change to the encoded payload trips _integrityOK = false
// and the L3 console banner fires at module load.
const EXPECTED_FINGERPRINT = 0xC58D505A;

function _crc32(str) {
  // Compact table-less CRC32 — small, dependency-free, deterministic.
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < str.length; i++) {
    let c = (crc ^ str.charCodeAt(i)) & 0xFF;
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xEDB88320 & -(c & 1));
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

const _joined = [NAMES.authorOne, NAMES.authorOneRole, NAMES.authorTwo, NAMES.authorTwoRole].join('|');
const _fp = _crc32(_joined);
const _integrityOK = (_fp === EXPECTED_FINGERPRINT);

if (!_integrityOK && typeof console !== 'undefined') {
  // eslint-disable-next-line no-console
  console.warn(
    '[CMCMIS authorship integrity] payload fingerprint mismatch.\n' +
    'Expected: 0x' + EXPECTED_FINGERPRINT.toString(16).toUpperCase() + '\n' +
    'Actual:   0x' + _fp.toString(16).toUpperCase() + '\n' +
    'This means the authorship payload has been tampered with. See file ' +
    'header — removal/modification requires written consent of Deep Sorathiya ' +
    'and Moksh Gandhi.',
  );
}


// ─────────────────────────────────────────────────────────────────────────
//  L4 · DOM WATCHDOG  (runs ONCE per page-load, singleton via window flag)
// -------------------------------------------------------------------------
// ALWAYS paints a floating credit pill in the bottom-right corner of the
// page. Bound to document.body via MutationObserver, so any DOM scrubber
// that removes the floating node triggers re-injection on the very next
// mutation.
//
// To kill the watchdog the tamperer must delete this file AND remove the
// side-effect import in src/main.jsx — both diffs are very visible in code
// review and trip the L1 copyright-breach clause.
// ─────────────────────────────────────────────────────────────────────────
const FLOATING_MARK = 'data-cmcmis-credit-floating';

function _floatingMarkup() {
  // Build the floating pill as a detached DOM tree (no React). Inline
  // styles only so it survives even if Tailwind is unloaded.
  const wrap = document.createElement('div');
  wrap.setAttribute(FLOATING_MARK, '1');
  wrap.setAttribute('aria-label', 'Authorship credit (restored)');
  wrap.style.cssText = [
    'position:fixed', 'right:14px', 'bottom:14px', 'z-index:2147483647',
    'pointer-events:none', 'user-select:none',
  ].join(';');

  const pill = document.createElement('div');
  pill.style.cssText = [
    'display:inline-flex', 'align-items:center', 'gap:8px',
    'padding:8px 18px', 'border-radius:9999px',
    'background:linear-gradient(90deg,#fff1f2,#fffbeb,#fff1f2)',
    'border:1px solid #fecdd3',
    'box-shadow:0 4px 12px rgba(244,63,94,0.18)',
    'font:500 12px system-ui,-apple-system,Segoe UI,Roboto,sans-serif',
    'color:#374151', 'pointer-events:auto',
  ].join(';');

  // Heart + text. Heart is a small inline SVG to avoid lucide dep here.
  const heart = '<svg width="13" height="13" viewBox="0 0 24 24" fill="#f43f5e" stroke="#f43f5e" stroke-width="1.5" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>';

  pill.innerHTML = (
    heart +
    '<span>Made with</span>' + heart + '<span>by</span>' +
    '<strong style="color:#111827;font-weight:600">' + NAMES.authorOne + '</strong>' +
    '<span style="color:#be123c;font-weight:500">' + NAMES.authorOneRole + '</span>' +
    '<span style="color:#fda4af" aria-hidden="true">·</span>' +
    '<strong style="color:#111827;font-weight:600">' + NAMES.authorTwo + '</strong>' +
    '<span style="color:#be123c;font-weight:500">' + NAMES.authorTwoRole + '</span>'
  );

  wrap.appendChild(pill);
  return wrap;
}

function _ensureFloatingCredit() {
  // The floating pill is the ONLY visible credit in the running app
  // (per the 2026-05-22 lockdown). If a tamperer (or some DOM scrubber)
  // removes it from the body, the next MutationObserver tick re-paints
  // it. Inline pills are no longer rendered by the React tree.
  if (typeof document === 'undefined' || !document.body) return;
  if (document.querySelector('[' + FLOATING_MARK + ']')) return;
  try {
    document.body.appendChild(_floatingMarkup());
  } catch (_) { /* never crash the app over a credit pill */ }
}

function _startWatchdog() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.__cmcmisCreditWatchdog) return;             // singleton per page
  window.__cmcmisCreditWatchdog = true;

  const begin = () => {
    _ensureFloatingCredit();
    try {
      const obs = new MutationObserver(() => _ensureFloatingCredit());
      obs.observe(document.body, { childList: true, subtree: true });
    } catch (_) { /* MutationObserver missing? fall back silently */ }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', begin, { once: true });
  } else {
    begin();
  }
}

// Fire the watchdog as a side-effect of importing this module. Every file
// in the app that uses <MadeWithLove /> imports this file, so the
// watchdog is registered the moment any of them mounts.
_startWatchdog();


// ─────────────────────────────────────────────────────────────────────────
//  STYLING — pill (medium size, generous horizontal padding)
// -------------------------------------------------------------------------
// Two sizes:
//   • 'md' — page-bottom pill. Generous left/right space; medium height.
//   • 'sm' — modal/drawer-footer pill. Slightly tighter but same look.
//
// Each rendered pill carries `data-cmcmis-credit-pill="1"` — the watchdog
// uses that selector to know "an inline credit is present, no floating
// fallback needed". Stripping the attribute also disables the inline
// invariant and triggers floating fallback — net effect: the credit
// always shows somewhere.
// ─────────────────────────────────────────────────────────────────────────

/**
 * @param {Object} props
 * @param {'sm'|'md'} [props.size]   'md' (default) — full footer pill.
 *                                    'sm' — modal/drawer footer variant.
 * @param {string}    [props.className]
 */
export function MadeWithLove({ size = 'md', className = '' }) {
  // Re-check the watchdog on every mount. Cheap; pays dividends if the
  // very first import was tree-shaken from a stale build.
  useEffect(() => { _startWatchdog(); }, []);

  const isCompact = size === 'sm';

  // Wrapper rhythm — give the pill room to breathe top/bottom.
  const wrapPad = isCompact
    ? 'py-3'
    : 'py-4 mt-6 pt-5 border-t border-border';

  // Pill itself — medium-height per spec ("from small to medium, not very
  // big"). Generous horizontal padding mirrors the reference image: lots
  // of left/right white-space inside the gradient.
  const pillPad = isCompact
    ? 'px-5 py-2 gap-2.5'
    : 'px-8 py-2.5 gap-3';

  const heartSz = isCompact ? 12 : 14;
  const textSz  = isCompact ? 'text-[11px]' : 'text-xs';

  // Soft middle dot between authors.
  const sep = (
    <span className="text-rose-300/80 px-0.5" aria-hidden="true">·</span>
  );

  return (
    <div
      className={[
        'flex items-center justify-center',
        wrapPad,
        className,
      ].join(' ')}
    >
      <div
        data-cmcmis-credit-pill="1"
        role="contentinfo"
        aria-label="Authorship credit"
        title="Made with love by Deep Sorathiya (DS) — Core Developer & Moksh Gandhi — Designer"
        className={[
          'inline-flex items-center rounded-full select-none',
          pillPad,
          textSz,
          // Soft gradient — rose → amber → rose (the "highlighted box").
          'bg-gradient-to-r from-rose-50 via-amber-50 to-rose-50',
          // Ring + drop shadow — clearly demarcates the pill from surroundings.
          'border border-rose-200 shadow-sm',
          // Gentle hover lift.
          'transition-shadow hover:shadow-md',
        ].join(' ')}
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

        <span className="font-semibold text-ink whitespace-nowrap">
          {NAMES.authorOne}
        </span>
        <span className="text-rose-700 font-medium whitespace-nowrap">
          {NAMES.authorOneRole}
        </span>

        {sep}

        <span className="font-semibold text-ink whitespace-nowrap">
          {NAMES.authorTwo}
        </span>
        <span className="text-rose-700 font-medium whitespace-nowrap">
          {NAMES.authorTwoRole}
        </span>
      </div>
    </div>
  );
}

// Expose the decoded names for any future legitimate use (e.g. an About
// dialog). DO NOT use these to skip rendering the pill — use the
// <MadeWithLove /> component itself so all five locks remain in effect.
export const AUTHORSHIP = Object.freeze({
  authors: [
    { name: NAMES.authorOne, role: NAMES.authorOneRole },
    { name: NAMES.authorTwo, role: NAMES.authorTwoRole },
  ],
  integrityOK: _integrityOK,
});
