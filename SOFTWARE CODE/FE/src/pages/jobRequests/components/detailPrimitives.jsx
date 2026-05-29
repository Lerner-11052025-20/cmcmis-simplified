// ============================================================================
// pages/jobRequests/components/detailPrimitives.jsx  —  Shared mini-primitives
// ----------------------------------------------------------------------------
// Tiny shared components used across every DetailXyzCard. Co-located here
// so a styling tweak (e.g. switching from grid to flex) is a one-touch fix
// instead of a six-file refactor.
// ============================================================================

import clsx from 'clsx';

/**
 * Card wrapper — white surface + border + icon-prefixed title.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.icon
 * @param {string}          props.title
 * @param {React.ReactNode} [props.action]  Optional right-aligned action slot (e.g. an Edit button)
 * @param {React.ReactNode} props.children
 */
export function SectionCard({ icon, title, action, children }) {
  return (
    <section className="bg-white rounded-lg border border-border shadow-card p-4 space-y-3">
      <header className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
          <span className="text-accent" aria-hidden="true">{icon}</span>
          {title}
        </h2>
        {action ? <div>{action}</div> : null}
      </header>
      <div>{children}</div>
    </section>
  );
}

/**
 * Label + value row. Renders an em-dash when value is null/undefined/empty.
 *
 * @param {Object} props
 * @param {string} props.label
 * @param {*}      props.value
 * @param {boolean} [props.multiline]  If true, value uses pre-wrap whitespace.
 */
export function DetailRow({ label, value, multiline = false }) {
  const display = value == null || value === '' ? '—' : value;
  return (
    <div>
      <div className="text-xs text-ink-soft">{label}</div>
      <div className={clsx(
        'text-sm text-ink mt-0.5',
        multiline ? 'whitespace-pre-wrap' : 'truncate',
        display === '—' ? 'text-ink-soft' : '',
      )}>
        {display}
      </div>
    </div>
  );
}
