// ============================================================================
// src/components/ui/Select.jsx  —  Native <select> wrapper
// ----------------------------------------------------------------------------
// forwardRef so react-hook-form's register() can attach. Mirrors Input's
// API: size, invalid, className, …rest. Children are <option> elements
// declared by the caller.
// ============================================================================

import { forwardRef } from 'react';
import clsx from 'clsx';

const BASE =
  'block w-full rounded-md border bg-white text-ink transition-colors ' +
  'shadow-card disabled:opacity-50 disabled:cursor-not-allowed';

const SIZES = {
  sm: 'px-2.5 py-1.5 text-xs',
  md: 'px-3 py-2 text-sm',
};

/**
 * @param {Object} props
 * @param {'sm'|'md'} [props.size]
 * @param {boolean}   [props.invalid]
 * @param {string}    [props.className]
 * — Plus any native <select> attribute via ...rest, and children.
 */
export const Select = forwardRef(function Select(
  { size = 'md', invalid = false, className, children, ...rest },
  ref,
) {
  return (
    <select
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
    >
      {children}
    </select>
  );
});
