import clsx from 'clsx';

/**
 * Card wrapper — spacious white premium surface + soft border + icon-prefixed title.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.icon
 * @param {string}          props.title
 * @param {React.ReactNode} [props.action]  Optional right-aligned action slot (e.g. an Edit button)
 * @param {React.ReactNode} props.children
 * @param {string}          [props.accent]  Card color scheme
 */
export function SectionCard({ icon, title, action, children, accent = 'indigo' }) {
  const ACCENT_COLORS = {
    indigo:  { bg: 'bg-indigo-50/60',   text: 'text-indigo-600',   border: 'border-indigo-100/50' },
    emerald: { bg: 'bg-emerald-50/60', text: 'text-emerald-600', border: 'border-emerald-100/50' },
    rose:    { bg: 'bg-rose-50/60',    text: 'text-rose-600',    border: 'border-rose-100/50' },
    amber:   { bg: 'bg-amber-50/60',   text: 'text-amber-600',   border: 'border-amber-100/50' },
    slate:   { bg: 'bg-slate-50',      text: 'text-slate-600',   border: 'border-slate-100' },
  };

  const color = ACCENT_COLORS[accent] || ACCENT_COLORS.slate;

  return (
    <section className="bg-white rounded-2xl border border-slate-200/50 shadow-[0_2px_8px_rgba(15,23,42,0.015)] p-6 md:p-8 space-y-5 transition-all duration-300 hover:shadow-md hover:border-slate-200/80">
      <header className="flex items-center justify-between border-b border-slate-100 pb-4">
        <h2 className="flex items-center gap-3 text-sm font-semibold text-slate-800 tracking-tight">
          <span className={clsx("inline-flex items-center justify-center w-8 h-8 rounded-xl border shrink-0", color.bg, color.border, color.text)} aria-hidden="true">
            {icon}
          </span>
          <span className="text-[14px] font-bold text-slate-800 tracking-tight">{title}</span>
        </h2>
        {action ? <div>{action}</div> : null}
      </header>
      <div className="pt-1">{children}</div>
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
    <div className="space-y-1 py-1">
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-sans leading-none">
        {label}
      </div>
      <div className={clsx(
        'text-[13px] font-medium text-slate-700 leading-relaxed font-sans',
        multiline ? 'whitespace-pre-wrap' : 'truncate',
        display === '—' ? 'text-slate-400 font-normal' : '',
      )}>
        {display}
      </div>
    </div>
  );
}
