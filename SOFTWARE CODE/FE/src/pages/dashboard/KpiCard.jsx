// ============================================================================
// src/pages/dashboard/KpiCard.jsx  —  Single KPI tile
// ----------------------------------------------------------------------------
// Stateless presentational. Receives a `card` payload object from the BE
// (already includes icon name, accent token, deep-link href, etc.).
// Renders the icon in a coloured tinted square, the big number / percent,
// the label, and the subtitle. Clicking navigates to `href`.
//
// The whole tile is a `<Link>` so keyboard users can tab into it and
// screen readers announce it as a navigation target.
// ============================================================================

import { Link } from 'react-router-dom';
import {
  Clock,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  FileText,
  Wrench,
  Plus,
  HelpCircle,
  Box,
  Activity,
  ClipboardList,
  AlertTriangle,
  CalendarPlus,
  FilePlus,
  Package,
  Hourglass,
} from 'lucide-react';
import clsx from 'clsx';

// ── Tailwind class map per accent token from the BE ──────────────────
// Custom ambient glows, clean indicators, and top border accents
const ACCENT_CLASSES = {
  amber:   { bg: 'bg-amber-50/60',   text: 'text-amber-600',   ring: 'ring-amber-100',   topBorder: 'border-t-amber-500/80',   glow: 'hover:shadow-amber-500/5 hover:border-amber-200/60', indicator: 'bg-amber-500' },
  red:     { bg: 'bg-red-50/60',     text: 'text-red-600',     ring: 'ring-red-100',     topBorder: 'border-t-red-500/80',     glow: 'hover:shadow-red-500/5 hover:border-red-200/60',   indicator: 'bg-red-500' },
  green:   { bg: 'bg-green-50/60',   text: 'text-green-600',   ring: 'ring-green-100',   topBorder: 'border-t-green-500/80',   glow: 'hover:shadow-green-500/5 hover:border-green-200/60', indicator: 'bg-green-500' },
  blue:    { bg: 'bg-blue-50/60',    text: 'text-blue-600',    ring: 'ring-blue-100',    topBorder: 'border-t-sky-500/80',     glow: 'hover:shadow-sky-500/5 hover:border-sky-200/60',   indicator: 'bg-sky-500' },
  indigo:  { bg: 'bg-indigo-50/60',  text: 'text-indigo-600',  ring: 'ring-indigo-100',  topBorder: 'border-t-indigo-500/80',  glow: 'hover:shadow-indigo-500/5 hover:border-indigo-200/60', indicator: 'bg-indigo-500' },
  emerald: { bg: 'bg-emerald-50/60', text: 'text-emerald-600', ring: 'ring-emerald-100', topBorder: 'border-t-emerald-500/80', glow: 'hover:shadow-emerald-500/5 hover:border-emerald-200/60', indicator: 'bg-emerald-500' },
  slate:   { bg: 'bg-slate-50/60',   text: 'text-slate-600',   ring: 'ring-slate-100',   topBorder: 'border-t-slate-400/80',   glow: 'hover:shadow-slate-400/5 hover:border-slate-300/60',  indicator: 'bg-slate-400' },
  orange:  { bg: 'bg-orange-50/60',  text: 'text-orange-600',  ring: 'ring-orange-100',  topBorder: 'border-t-orange-500/80',  glow: 'hover:shadow-orange-500/5 hover:border-orange-200/60', indicator: 'bg-orange-500' },
  violet:  { bg: 'bg-violet-50/60',  text: 'text-violet-600',  ring: 'ring-violet-100',  topBorder: 'border-t-violet-500/80',  glow: 'hover:shadow-violet-500/5 hover:border-violet-200/60', indicator: 'bg-violet-500' },
};

const ICONS = {
  clock:            Clock,
  'alert-circle':   AlertCircle,
  'check-circle':   CheckCircle2,
  'trending-up':    TrendingUp,
  'file-text':      FileText,
  wrench:           Wrench,
  plus:             Plus,
  box:              Box,
  activity:         Activity,
  'clipboard-list': ClipboardList,
  'alert-triangle': AlertTriangle,
  'calendar-plus':  CalendarPlus,
  'file-plus':      FilePlus,
  package:          Package,
  hourglass:        Hourglass,
};

/**
 * @param {Object} props
 * @param {Object} props.card  Payload from /dashboard/kpis card object.
 * @param {boolean} [props.loading]  Skeleton state for the very first paint.
 */
export function KpiCard({ card, loading = false }) {
  const accent = ACCENT_CLASSES[card?.accent] || ACCENT_CLASSES.slate;
  const Icon = (card && ICONS[card.icon]) || HelpCircle;

  // Skeleton variant — keeps the layout stable while data is loading.
  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/40 border-t-[4px] border-t-slate-200 p-5 animate-pulse flex flex-col font-sans">
        <div className="w-11 h-11 rounded-2xl bg-slate-100/80" />
        <div className="mt-5 h-8 w-16 bg-slate-100 rounded" />
        <div className="mt-3 h-3 w-28 bg-slate-100 rounded" />
        <div className="mt-2.5 h-2.5 w-32 bg-slate-100 rounded" />
      </div>
    );
  }

  const valueDisplay =
    card.value_kind === 'percent' ? `${card.value}%` : String(card.value);

  return (
    <Link
      to={card.href || '#'}
      className={clsx(
        'group block bg-white rounded-2xl border border-slate-200/50 p-5 border-t-[4px] transition-all duration-300 shadow-[0_2px_8px_rgba(15,23,42,0.015)] hover:shadow-lg font-sans antialiased',
        accent.topBorder,
        accent.glow,
        'hover:-translate-y-1',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40'
      )}
      aria-label={`${card.label}: ${valueDisplay}. ${card.subtitle}`}
    >
      <div className="flex items-center justify-between">
        <div className={clsx('inline-flex items-center justify-center w-11 h-11 rounded-2xl border border-slate-100/60 shadow-[0_1px_2px_rgba(0,0,0,0.01)] transition-all duration-300 group-hover:scale-105', accent.bg)}>
          <Icon size={21} strokeWidth={1.75} className={accent.text} />
        </div>
        <span className="h-1.5 w-1.5 rounded-full bg-slate-200 group-hover:bg-accent transition-colors duration-300" />
      </div>

      <div className="mt-5 text-3xl font-extrabold tracking-tight text-ink font-sans leading-none transition-colors duration-300 group-hover:text-accent">
        {valueDisplay}
      </div>
      
      <div className="mt-3 text-[11px] font-bold text-ink-soft uppercase tracking-wider font-sans">
        {card.label}
      </div>
      
      <div className="mt-1.5 text-xs text-ink-soft/70 font-medium font-sans flex items-center gap-1.5 leading-relaxed">
        <span className={clsx("h-1 w-1 rounded-full shrink-0 opacity-70", accent.indicator)} />
        {card.subtitle}
      </div>
    </Link>
  );
}
