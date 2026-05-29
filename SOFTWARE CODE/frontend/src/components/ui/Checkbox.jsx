// ============================================================================
// src/components/ui/Checkbox.jsx  —  Controlled boolean checkbox
// ----------------------------------------------------------------------------
// forwardRef so react-hook-form can attach. Pairs with an optional label
// slot for full-row T&C-style rows on the form.
// ============================================================================

import { forwardRef } from 'react';
import clsx from 'clsx';

/**
 * @param {Object} props
 * @param {boolean}         [props.invalid]
 * @param {string}          [props.className]
 * @param {React.ReactNode} [props.label]    Optional label rendered to the right.
 * — Plus any native checkbox attribute via ...rest.
 */
export const Checkbox = forwardRef(function Checkbox(
  { invalid = false, className, label, ...rest },
  ref,
) {
  return (
    <label className={clsx('inline-flex items-start gap-2 cursor-pointer', className)}>
      <input
        ref={ref}
        type="checkbox"
        aria-invalid={invalid || undefined}
        className={clsx(
          'mt-0.5 h-4 w-4 rounded border bg-white text-accent',
          'focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-base',
          invalid ? 'border-danger' : 'border-border',
          'disabled:opacity-50 disabled:cursor-not-allowed',
        )}
        {...rest}
      />
      {label !== undefined ? (
        <span className="text-sm text-ink leading-snug">{label}</span>
      ) : null}
    </label>
  );
});
