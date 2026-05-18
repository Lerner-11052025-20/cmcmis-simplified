// ============================================================================
// src/pages/inquiry/InquirySearchBox.jsx  —  Debounce-aware search input
// ----------------------------------------------------------------------------
// Controlled input + optional "Type" select (vendor tab only). Renders a
// hint when the user has typed 1–2 chars so they know the FULLTEXT path
// won't engage yet.
//
// We do NOT debounce HERE — that lives in `useInquirySearch`. This file
// just notifies the parent on every keystroke; the hook smooths it out.
// ============================================================================

import { Search } from 'lucide-react';
import clsx from 'clsx';
import { VENDOR_TYPE_OPTIONS } from '../../lib/schemas/inquirySchemas.js';

/**
 * @param {Object} props
 * @param {string}                props.q
 * @param {(q: string) => void}   props.onQChange
 * @param {string}                [props.placeholder]
 * @param {boolean}               [props.showTypeFilter]
 * @param {string | undefined}    [props.type]
 * @param {(v: string|undefined)=>void} [props.onTypeChange]
 */
export function InquirySearchBox({
  q,
  onQChange,
  placeholder = 'Search...',
  showTypeFilter = false,
  type,
  onTypeChange,
}) {
  // Show the "Type at least 3 characters" hint when the user has typed
  // something but it's not yet long enough for FULLTEXT. Below 3 chars
  // we still issue a LIKE-prefix query, so the hint is informational
  // ("you'll see richer matches at 3+ chars") rather than disabling.
  const showShortHint = q.length > 0 && q.length < 3;

  return (
    <div className="bg-white rounded-lg border border-border shadow-card p-4 space-y-1">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search
            size={18}
            strokeWidth={1.75}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft"
            aria-hidden
          />
          <input
            type="text"
            value={q}
            onChange={(e) => onQChange(e.target.value)}
            placeholder={placeholder}
            className={clsx(
              'w-full rounded-md border border-border bg-white pl-10 pr-3 py-2.5',
              'text-sm placeholder:text-ink-soft',
              'focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/60',
            )}
            autoComplete="off"
            spellCheck={false}
          />
        </div>

        {showTypeFilter ? (
          <select
            value={type || ''}
            onChange={(e) => onTypeChange?.(e.target.value || undefined)}
            className={clsx(
              'rounded-md border border-border bg-white px-3 py-2.5 text-sm',
              'min-w-[160px]',
              'focus:outline-none focus:ring-2 focus:ring-accent/40',
            )}
            aria-label="Filter by vendor type"
          >
            {VENDOR_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        ) : null}
      </div>

      {showShortHint ? (
        <p className="text-xs text-ink-soft pl-1 pt-1">
          Type at least 3 characters for full-text matches.
        </p>
      ) : null}
    </div>
  );
}
