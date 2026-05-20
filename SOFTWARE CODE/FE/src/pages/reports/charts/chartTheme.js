// ============================================================================
// src/pages/reports/charts/chartTheme.js  —  Shared recharts settings
// ----------------------------------------------------------------------------
// Centralises colours, axis tick styles, and animation duration so every
// chart card looks like part of one family. Tuned to match the attached
// UI mockups (Operational green, blue lines, amber pending, red overdue).
// ============================================================================

// Palette — keep within 8 entries so legend rows never wrap.
export const PALETTE = [
  '#10b981', // emerald
  '#3b82f6', // blue
  '#f59e0b', // amber
  '#ef4444', // red
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#14b8a6', // teal
  '#f97316', // orange
];

// Map status → colour for donut/pie consistency with the dashboard.
export const STATUS_COLORS = {
  ACTIVE:               '#10b981',
  UNDER_CALIBRATION:    '#3b82f6',
  UNDER_REPAIR:         '#f59e0b',
  OUT_OF_TOLERANCE:     '#ef4444',
  QUARANTINED:          '#a855f7',
  CONDEMNED:            '#64748b',
  RETIRED:              '#94a3b8',
  PENDING_VERIFICATION: '#facc15',
  // Calibration band
  VALID:                '#10b981',
  DUE_SOON:             '#f59e0b',
  OVERDUE:              '#ef4444',
};

export const TICK = { fontSize: 11, fill: '#6b7280' };
export const ANIMATION_MS = 600;

export const COMMON_MARGIN = { top: 10, right: 20, bottom: 10, left: 0 };
