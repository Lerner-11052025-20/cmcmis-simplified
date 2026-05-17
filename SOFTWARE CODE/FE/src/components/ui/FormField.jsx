// ============================================================================
// src/components/ui/FormField.jsx  —  Label + control + helper/error wrapper
// ----------------------------------------------------------------------------
// PURPOSE
//   Lays out a form row consistently across the app:
//
//     [Label]                                (text-ink, text-sm, font-medium)
//     [Input or other control via children]
//     [Helper text in ink-soft]  OR  [Error in danger]   (text-xs)
//
//   When `error` is non-empty, helper is hidden and the error text
//   shows in danger color. The wrapper also sets a unique htmlFor /
//   id pair so screen readers correctly associate the label with the
//   control even when the control is multiple components deep.
// ============================================================================

import { useId, Children, cloneElement, isValidElement } from 'react';
import clsx from 'clsx';

/**
 * @param {Object} props
 * @param {string}            props.label
 * @param {React.ReactNode}   props.children   The control (typically <Input/>).
 * @param {string}            [props.helper]   Subtle hint shown when no error.
 * @param {string}            [props.error]    Error message; takes priority over helper.
 * @param {string}            [props.htmlFor]  Override the auto-generated id link.
 * @param {string}            [props.className]
 */
export function FormField({ label, children, helper, error, htmlFor, className }) {
  // Stable unique id per render, used for label↔control wiring.
  const autoId = useId();
  const inputId = htmlFor || autoId;

  return (
    <div className={clsx('space-y-1', className)}>
      <label htmlFor={inputId} className="block text-sm font-medium text-ink">
        {label}
      </label>

      {/* If children is a single React element (the typical case), we
          clone-attach `id` (and `invalid` when there's an error) so the
          <label> link + danger styling work without the caller plumbing
          props through manually. */}
      {wireChild(children, inputId, Boolean(error))}

      {error ? (
        <p className="text-xs text-danger" role="alert">
          {error}
        </p>
      ) : helper ? (
        <p className="text-xs text-ink-soft">{helper}</p>
      ) : null}
    </div>
  );
}

/**
 * Attach `id` (always) and `invalid` (when present) to a single React
 * element child. Pass through unchanged for non-elements or multiple
 * children — the caller is responsible for wiring in those cases.
 *
 * @param {React.ReactNode} children
 * @param {string} id
 * @param {boolean} invalid
 */
function wireChild(children, id, invalid) {
  if (!isValidElement(children)) return children;
  if (Children.count(children) !== 1) return children;

  const next = {};
  if (!children.props.id) next.id = id;
  // Only override `invalid` if not already explicitly set by the caller.
  if (invalid && children.props.invalid === undefined) next.invalid = true;

  return Object.keys(next).length ? cloneElement(children, next) : children;
}
