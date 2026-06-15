// ============================================================================
// src/pages/analytics/chartTheme2.js  —  Visual theme for the redesigned
//                                         Analytics dashboard (12 chart cards).
// ----------------------------------------------------------------------------
// PHASE 11 SLICE 3 — separate from the Phase-10 theme so the dashboard can
// evolve independently. The big visual idea is "stock-market wavy": smooth
// area curves with vertical gradient fills (top opaque → bottom transparent),
// soft horizontal grid lines, axis lines hidden, tick marks hidden, tabular
// nums in tooltips. Compact, clean, animated.
// ============================================================================

// 8-stop palette — picked for high contrast on a light background while
// still working on white-on-print (no neon, no pastel-only).
export const PALETTE = [
  '#4f46e5', // indigo-600
  '#10b981', // emerald-500
  '#f97316', // orange-500
  '#f43f5e', // rose-500
  '#8b5cf6', // violet-500
  '#06b6d4', // cyan-500
  '#eab308', // yellow-500
  '#64748b', // slate-500
];

// Map EQM_MVP_STATUS / calibration band → consistent colours across charts.
export const STATUS_COLORS = {
  ACTIVE:               '#10b981',
  UNDER_CALIBRATION:    '#4f46e5',
  UNDER_REPAIR:         '#f97316',
  OUT_OF_TOLERANCE:     '#f43f5e',
  QUARANTINED:          '#8b5cf6',
  CONDEMNED:            '#64748b',
  RETIRED:              '#94a3b8',
  PENDING_VERIFICATION: '#eab308',
  // Calibration band (G8)
  VALID:                '#10b981',
  DUE_SOON:             '#f97316',
  OVERDUE:              '#f43f5e',
  // JC lifecycle (G10)
  ASSIGNED:             '#6366f1',
  IN_PROGRESS:          '#f97316',
  COMPLETED:            '#10b981',
  VERIFIED_CLOSED:      '#059669',
  REOPENED:             '#8b5cf6',
};

// Axis tick style — small, muted, hidden axis lines. Recharts looks
// cleanest when the axis itself is invisible.
export const TICK = { fontSize: 10, fill: '#94a3b8', fontWeight: 500 };

// Animation tunables. We aim for a snappy ~700ms entrance — slow enough
// to feel intentional, fast enough not to delay perception.
export const ANIMATION_MS = 700;
export const ANIMATION_EASING = 'ease-out';

// Default chart margins — generous on the right so tooltip ghosts don't
// clip; bottom is reduced because we strip the axis line.
export const MARGIN = { top: 16, right: 16, bottom: 4, left: 4 };

// Grid line style. We use horizontal dashed lines only — vertical grid
// makes time-series charts feel busy. (StockCharts standard.)
export const GRID = {
  strokeDasharray: '3 3',
  stroke: '#f1f5f9',
  vertical: false,
};

// Tooltip cursor style — thin vertical line on the hover x position so
// the user sees exactly which bucket they're inspecting.
export const TOOLTIP_CURSOR = { stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '4 4' };
