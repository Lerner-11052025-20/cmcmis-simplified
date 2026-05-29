// ============================================================================
// src/components/ui/Input.jsx  —  Text input primitive
// ----------------------------------------------------------------------------
// PURPOSE
//   The base styling for every <input type="text|password|email|...">.
//   Composed by <FormField> when a label + helper + error is needed;
//   used naked inside table filters and other compact contexts.
//
// REF FORWARDING
//   react-hook-form's `register()` returns a ref via `ref` prop. The
//   component MUST forwardRef so RHF can attach to the DOM node. Without
//   this, RHF cannot read the value on submit and validation silently
//   fails.
//
// ERROR STATE
//   Pass `invalid={true}` (or rely on FormField setting `aria-invalid`
//   automatically) to swap the border color to danger and the focus
//   ring to the danger color.
// ============================================================================

import { forwardRef } from 'react';
import clsx from 'clsx';

const BASE =
  'block w-full rounded-md border bg-white text-ink placeholder:text-ink-soft/60 ' +
  'shadow-card transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

const SIZES = {
  sm: 'px-2.5 py-1.5 text-xs',
  md: 'px-3 py-2 text-sm',
};

/**
 * Input primitive (forwards ref for react-hook-form).
 *
 * @param {Object} props
 * @param {'sm'|'md'} [props.size]
 * @param {boolean}   [props.invalid]   Render danger border + ring.
 * @param {string}    [props.className]
 * — Plus any standard <input> attribute via ...rest.
 */
export const Input = forwardRef(function Input(
  { size = 'md', invalid = false, className, ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={clsx(
        BASE,
        SIZES[size],
        invalid
          ? 'border-danger focus:border-danger focus:ring-danger'
          : 'border-border focus:border-accent focus:ring-accent',
        'focus:outline-none focus:ring-1',
        className,
      )}
      {...rest}
    />
  );
});
