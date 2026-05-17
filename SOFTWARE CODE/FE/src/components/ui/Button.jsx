// ============================================================================
// src/components/ui/Button.jsx  —  Reusable button primitive
// ----------------------------------------------------------------------------
// VARIANTS
//   primary    — accent-coloured CTA (Sign in, Submit, Save). One per
//                screen at most.
//   secondary  — quiet alternative (Cancel, "Coming soon" SSO button).
//   ghost      — minimal hover-only style (sign-out, link-like actions).
//
// SIZES
//   sm   — used in toolbars and table-row actions.
//   md   — default; used in forms and headers.
//
// ACCESSIBILITY
//   Always renders a real <button> so keyboard / screen-reader users
//   get correct semantics. `disabled` reflects through to the DOM.
//   Spread the rest of `...props` so `type`, `onClick`, `aria-*` etc.
//   flow through naturally.
// ============================================================================

import clsx from 'clsx';

// Per-variant base styles. Common rules (rounded-md, focus ring, font
// weight) live in the SHARED string; variant strings only redeclare
// what's different.
const SHARED =
  'inline-flex items-center justify-center gap-2 rounded-md font-medium ' +
  'transition-colors focus:outline-none focus-visible:ring-2 ' +
  'focus-visible:ring-accent focus-visible:ring-offset-2 ' +
  'focus-visible:ring-offset-base disabled:opacity-50 disabled:cursor-not-allowed';

const VARIANTS = {
  primary:
    'bg-accent text-white hover:bg-accent-hover ' +
    'active:bg-accent-hover/90',
  secondary:
    'bg-base-elev text-ink border border-border hover:bg-base ' +
    'active:bg-base/80',
  ghost:
    'bg-transparent text-ink hover:bg-base-elev active:bg-base-elev/80',
};

const SIZES = {
  sm: 'px-2.5 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
};

/**
 * Button primitive.
 *
 * @param {Object} props
 * @param {'primary'|'secondary'|'ghost'} [props.variant]
 * @param {'sm'|'md'}                     [props.size]
 * @param {boolean}                       [props.disabled]
 * @param {string}                        [props.className]
 * @param {'button'|'submit'|'reset'}     [props.type]      Defaults to 'button' (NOT 'submit')
 *                                                          so a stray Button inside a <form>
 *                                                          doesn't accidentally submit it.
 * @param {React.ReactNode}               props.children
 */
export function Button({
  variant = 'primary',
  size = 'md',
  type = 'button',
  className,
  children,
  ...rest
}) {
  return (
    <button
      type={type}
      className={clsx(SHARED, VARIANTS[variant], SIZES[size], className)}
      {...rest}
    >
      {children}
    </button>
  );
}
