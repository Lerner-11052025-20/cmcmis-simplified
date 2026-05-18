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
} from 'lucide-react';
import clsx from 'clsx';

// ── Tailwind class map per accent token from the BE ──────────────────
// One source of truth; if the BE adds a new accent, only this file changes.
const ACCENT_CLASSES = {
  amber:   { bg: 'bg-amber-50',   text: 'text-amber-600',   ring: 'ring-amber-100' },
  red:     { bg: 'bg-red-50',     text: 'text-red-600',     ring: 'ring-red-100' },
  green:   { bg: 'bg-green-50',   text: 'text-green-600',   ring: 'ring-green-100' },
  blue:    { bg: 'bg-blue-50',    text: 'text-blue-600',    ring: 'ring-blue-100' },
  indigo:  { bg: 'bg-indigo-50',  text: 'text-indigo-600',  ring: 'ring-indigo-100' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', ring: 'ring-emerald-100' },
  slate:   { bg: 'bg-slate-50',   text: 'text-slate-600',   ring: 'ring-slate-100' },
};

const ICONS = {
  clock:         Clock,
  'alert-circle':AlertCircle,
  'check-circle':CheckCircle2,
  'trending-up': TrendingUp,
  'file-text':   FileText,
  wrench:        Wrench,
  plus:          Plus,
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
      <div className="bg-white rounded-lg border border-border shadow-card p-5 animate-pulse">
        <div className={clsx('w-10 h-10 rounded-md', accent.bg)} />
        <div className="mt-4 h-7 w-16 bg-base-elev rounded" />
        <div className="mt-2 h-3 w-32 bg-base-elev rounded" />
        <div className="mt-1 h-3 w-24 bg-base-elev rounded" />
      </div>
    );
  }

  const valueDisplay =
    card.value_kind === 'percent' ? `${card.value}%` : String(card.value);

  return (
    <Link
      to={card.href || '#'}
      className={clsx(
        'block bg-white rounded-lg border border-border shadow-card p-5',
        'hover:border-accent/50 hover:shadow-md transition-all',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40',
      )}
      aria-label={`${card.label}: ${valueDisplay}. ${card.subtitle}`}
    >
      <div className={clsx('inline-flex items-center justify-center w-10 h-10 rounded-md', accent.bg)}>
        <Icon size={20} strokeWidth={1.75} className={accent.text} />
      </div>

      <div className="mt-4 text-2xl font-semibold text-ink leading-none">
        {valueDisplay}
      </div>
      <div className="mt-2 text-sm font-medium text-ink">
        {card.label}
      </div>
      <div className="mt-0.5 text-xs text-ink-soft">
        {card.subtitle}
      </div>
    </Link>
  );
}
