import { useState } from 'react';
import { ChevronDown, Copy, Check } from 'lucide-react';
import clsx from 'clsx';

/**
 * Card wrapper — spacious white premium surface + soft border + icon-prefixed title.
 * Includes interactive collapse/expand toggle controls and smooth animations.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.icon
 * @param {string}          props.title
 * @param {React.ReactNode} [props.action]  Optional right-aligned action slot (e.g. an Edit button)
 * @param {React.ReactNode} props.children
 * @param {string}          [props.accent]  Card color scheme
 * @param {boolean}         [props.defaultExpanded] Start in expanded state
 */
export function SectionCard({ icon, title, action, children, accent = 'indigo', defaultExpanded = true }) {
  const [expanded, setExpanded] = useState(defaultExpanded);

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
      <header 
        className="flex items-center justify-between border-b border-slate-100 pb-4 select-none cursor-pointer group/header" 
        onClick={() => setExpanded(!expanded)}
      >
        <h2 className="flex items-center gap-3 text-sm font-semibold text-slate-800 tracking-tight">
          <span className={clsx("inline-flex items-center justify-center w-8 h-8 rounded-xl border shrink-0 transition-transform duration-300 group-hover/header:scale-105", color.bg, color.border, color.text)} aria-hidden="true">
            {icon}
          </span>
          <span className="text-base font-bold text-slate-800 tracking-tight group-hover/header:text-slate-900 transition-colors font-sans">{title}</span>
        </h2>
        <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
          {action ? <div className="transition-all duration-200">{action}</div> : null}
          <button 
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-100"
            title={expanded ? "Collapse card" : "Expand card"}
          >
            <ChevronDown size={18} strokeWidth={2.2} className={clsx("transition-transform duration-300", expanded ? "rotate-180" : "rotate-0")} />
          </button>
        </div>
      </header>
      <div className={clsx("transition-all duration-300 origin-top overflow-hidden", expanded ? "max-h-[1000px] opacity-100 pt-1" : "max-h-0 opacity-0 pt-0")}>
        {children}
      </div>
    </section>
  );
}

/**
 * Label + value row with Google Font Inter standard size, bold high-contrast values,
 * active hover triggers, and Copy-to-Clipboard functionality.
 *
 * @param {Object} props
 * @param {string} props.label
 * @param {*}      props.value
 * @param {boolean} [props.multiline]  If true, value uses pre-wrap whitespace.
 * @param {boolean} [props.copyable]   Enables copy button on hover.
 */
export function DetailRow({ label, value, multiline = false, copyable = true }) {
  const [copied, setCopied] = useState(false);
  const display = value == null || value === '' ? '—' : value;
  const isPlaceholder = display === '—';

  async function handleCopy() {
    if (isPlaceholder) return;
    try {
      await navigator.clipboard.writeText(String(display));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  }

  return (
    <div 
      className={clsx(
        "group relative space-y-1.5 py-2 px-2.5 -mx-2.5 rounded-xl transition-all duration-200 border border-transparent",
        copyable && !isPlaceholder && "hover:bg-slate-50/70 hover:border-slate-100"
      )}
    >
      <div className="flex justify-between items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 font-sans leading-none">
          {label}
        </span>
        {copyable && !isPlaceholder && (
          <button
            type="button"
            onClick={handleCopy}
            className="opacity-0 group-hover:opacity-100 focus:opacity-100 flex items-center justify-center p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all duration-150 focus:outline-none focus:ring-1 focus:ring-slate-200"
            title={`Copy ${label} to clipboard`}
          >
            {copied ? (
              <Check size={11} strokeWidth={2.5} className="text-success" />
            ) : (
              <Copy size={11} strokeWidth={2.2} />
            )}
          </button>
        )}
      </div>
      <div className={clsx(
        'text-sm font-semibold text-slate-900 leading-relaxed font-sans break-words',
        multiline ? 'whitespace-pre-wrap' : 'line-clamp-2 md:line-clamp-none',
        isPlaceholder ? 'text-slate-400 font-normal italic' : '',
      )}>
        {display}
      </div>
    </div>
  );
}
