import { Link } from 'react-router-dom';
import clsx from 'clsx';

const ACCENTS = {
  amber:   { bg: 'bg-amber-100/70',   text: 'text-orange-600', dot: 'bg-amber-500' },
  orange:  { bg: 'bg-orange-100/70',  text: 'text-orange-600', dot: 'bg-orange-500' },
  red:     { bg: 'bg-red-100/70',     text: 'text-red-600',    dot: 'bg-red-500' },
  rose:    { bg: 'bg-rose-100/70',    text: 'text-red-600',    dot: 'bg-red-500' },
  green:   { bg: 'bg-green-100/70',   text: 'text-green-600',  dot: 'bg-green-500' },
  emerald: { bg: 'bg-emerald-100/70', text: 'text-green-600',  dot: 'bg-green-500' },
  blue:    { bg: 'bg-blue-100/70',    text: 'text-blue-600',   dot: 'bg-blue-500' },
  sky:     { bg: 'bg-sky-100/70',     text: 'text-blue-600',   dot: 'bg-sky-500' },
  indigo:  { bg: 'bg-indigo-100/70',  text: 'text-indigo-600', dot: 'bg-indigo-500' },
  violet:  { bg: 'bg-violet-100/70',  text: 'text-violet-600', dot: 'bg-violet-500' },
  slate:   { bg: 'bg-slate-100/80',   text: 'text-slate-600',  dot: 'bg-slate-400' },
};

export function StandardKpiCard({
  label,
  value,
  icon: Icon,
  accent = 'blue',
  subtitle,
  loading = false,
  to,
  className,
  ariaLabel,
}) {
  const color = ACCENTS[accent] || ACCENTS.blue;
  const Surface = to ? Link : 'div';
  const surfaceProps = to ? { to } : {};

  if (loading) {
    return (
      <div
        className={clsx(
          'min-h-[150px] rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]',
          'animate-pulse font-sans',
          className
        )}
      >
        <div className="h-12 w-12 rounded-2xl bg-slate-100" />
        <div className="mt-6 h-7 w-20 rounded bg-slate-100" />
        <div className="mt-3 h-4 w-32 rounded bg-slate-100" />
        <div className="mt-2 h-3 w-28 rounded bg-slate-100" />
      </div>
    );
  }

  return (
    <Surface
      {...surfaceProps}
      aria-label={ariaLabel || `${label}: ${value}${subtitle ? `. ${subtitle}` : ''}`}
      className={clsx(
        'group block min-h-[150px] rounded-2xl border border-slate-200 bg-white p-5 font-sans antialiased',
        'shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition-all duration-200',
        to && 'hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_10px_24px_rgba(15,23,42,0.07)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40',
        className
      )}
    >
      <div
        className={clsx(
          'flex h-12 w-12 items-center justify-center rounded-2xl transition-transform duration-200',
          color.bg,
          to && 'group-hover:scale-[1.03]'
        )}
      >
        {Icon ? <Icon size={24} strokeWidth={2.2} className={color.text} aria-hidden="true" /> : null}
      </div>

      <div className="mt-6 text-[28px] font-bold leading-none tracking-normal text-slate-950 tabular-nums">
        {value}
      </div>

      <div className="mt-3 text-base font-medium leading-tight tracking-normal text-slate-600">
        {label}
      </div>

      {subtitle ? (
        <div className="mt-2 flex items-start gap-2 text-sm font-normal leading-relaxed tracking-normal text-slate-500">
          <span className={clsx('mt-[0.7em] h-1.5 w-1.5 shrink-0 rounded-full', color.dot)} />
          <span>{subtitle}</span>
        </div>
      ) : null}
    </Surface>
  );
}
