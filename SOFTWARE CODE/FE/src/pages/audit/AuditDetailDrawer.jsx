// ============================================================================
// src/pages/audit/AuditDetailDrawer.jsx  —  Read-only detail panel
// ----------------------------------------------------------------------------
// PHASE 14 — Audit Log Viewer
//
// Right-side slide-in drawer (no overlay form — pure display). Renders:
//
//   ┌─ Header  — Action verb + timestamp                       ✕ ─┐
//   │                                                              │
//   │ ── Who                                                       │
//   │   Actor + role + employee_id                                 │
//   │ ── What                                                      │
//   │   Action + Entity Type + Entity ID (deep-linked)             │
//   │ ── Where                                                     │
//   │   IP, User Agent, Request ID                                 │
//   │                                                              │
//   │ ── Diff / Transition (renders ONLY what the row carries)     │
//   │   • Status: PLANNED → SCHEDULED   (status_history sources)  │
//   │   • Role:   NORMAL_USER → LAB_ENGINEER (identity source)     │
//   │   • Active: true → false                                     │
//   │                                                              │
//   │ ── Notes (JSON pretty-print, fallback to raw text)           │
//   │   { … }                                                      │
//   └──────────────────────────────────────────────────────────────┘
//
// READ-ONLY: NO mutation controls anywhere. Edge cases handled:
//   • notes is NULL → renders "(no details captured)"
//   • notes is plain string (legacy) → rendered as text, not JSON
//   • notes is valid JSON → pretty-printed inside a <pre>
// ============================================================================

import { X as XIcon, ExternalLink, Code2 } from 'lucide-react';
import dayjs from 'dayjs';

import { ModalPortal } from '../../components/ui/ModalPortal.jsx';
import { useAuditDetail } from '../../lib/hooks/useAuditLog.js';


export function AuditDetailDrawer({ row, onClose }) {
  // Pull a fresh detail row from the server in case anything was added since
  // the list query — also resolves the right sub_source for transitions.
  const { row: fresh, loading } = useAuditDetail(row.id, {
    source:    row.source,
    subSource: row.sub_source || undefined,
  });
  // Optimistic: use the list-row data until detail returns.
  const r = fresh || row;

  return (
    <ModalPortal>
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
      {/* Backdrop — close on click */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} aria-hidden="true" />

      {/* Drawer panel */}
      <div className="relative bg-white w-[560px] max-w-[92vw] h-full overflow-y-auto shadow-xl">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-border px-5 py-3 flex items-center justify-between z-10">
          <div>
            <div className="text-xs text-ink-soft uppercase tracking-wide">Audit Row #{r.id}</div>
            <div className="text-lg font-semibold text-ink font-mono">{r.action}</div>
          </div>
          <button type="button" onClick={onClose} className="text-ink-soft hover:text-ink" aria-label="Close">
            <XIcon size={20} strokeWidth={1.75} />
          </button>
        </div>

        {loading && !fresh ? (
          <div className="px-5 py-4 text-sm text-ink-soft">Loading…</div>
        ) : null}

        {/* Body */}
        <div className="px-5 py-4 space-y-5 text-sm">
          {/* ── Who ─────────────────────────────────────────────────── */}
          <Section title="Who">
            <Pair label="Actor"        value={r.actor_name || '—'} />
            <Pair label="Employee ID"  value={<span className="font-mono">{r.actor_employee_id || '—'}</span>} />
            {r.actor_role_code ? <Pair label="Role" value={r.actor_role_code} /> : null}
          </Section>

          {/* ── What ────────────────────────────────────────────────── */}
          <Section title="What">
            <Pair label="Action"      value={<span className="font-mono">{r.action || '—'}</span>} />
            <Pair label="Entity Type" value={<span className="uppercase">{r.entity_type || '—'}</span>} />
            <Pair label="Entity ID"   value={
              r.deep_link
                ? <a href={r.deep_link} className="text-accent hover:underline font-medium inline-flex items-center gap-1">
                    {r.entity_id} <ExternalLink size={12} strokeWidth={1.75} />
                  </a>
                : <span className="font-medium">{r.entity_id || '—'}</span>
            } />
            {r.entity_label ? <Pair label="Entity Name" value={r.entity_label} /> : null}
            <Pair label="When" value={r.occurred_at ? dayjs(typeof r.occurred_at === 'string' ? r.occurred_at.replace('Z', '') : r.occurred_at).format('MMM DD, YYYY · hh:mm A') : '—'} />
          </Section>

          {/* ── Diff / Transition ──────────────────────────────────── */}
          {(r.from_status || r.to_status || r.from_role || r.to_role
            || r.from_active != null || r.to_active != null) ? (
            <Section title="Transition">
              {r.from_status || r.to_status ? (
                <TransitionRow label="Status"
                  from={r.from_status} to={r.to_status} />
              ) : null}
              {r.from_role || r.to_role ? (
                <TransitionRow label="Role"
                  from={r.from_role} to={r.to_role} />
              ) : null}
              {r.from_active != null || r.to_active != null ? (
                <TransitionRow label="Active"
                  from={String(r.from_active)} to={String(r.to_active)} />
              ) : null}
            </Section>
          ) : null}

          {/* ── Where ──────────────────────────────────────────────── */}
          {(r.ip_address || r.user_agent || r.request_id) ? (
            <Section title="Where">
              {r.ip_address ? <Pair label="IP"          value={<span className="font-mono">{r.ip_address}</span>} /> : null}
              {r.request_id ? <Pair label="Request ID"  value={<span className="font-mono">{r.request_id}</span>} /> : null}
              {r.user_agent ? <Pair label="User Agent"  value={<span className="text-xs">{r.user_agent}</span>} /> : null}
            </Section>
          ) : null}

          {/* ── Notes (JSON / text) ────────────────────────────────── */}
          <Section title="Details" icon={Code2}>
            <NotesView notes_json={r.notes_json} notes_text={r.notes_text} />
          </Section>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
}


// ── Helpers ──────────────────────────────────────────────────────────────

function Section({ title, icon: Icon, children }) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-ink-soft uppercase tracking-wide mb-2 inline-flex items-center gap-1">
        {Icon ? <Icon size={12} strokeWidth={1.75} aria-hidden="true" /> : null}
        {title}
      </h3>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function Pair({ label, value }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="col-span-1 text-ink-soft text-xs">{label}</div>
      <div className="col-span-2 text-ink">{value}</div>
    </div>
  );
}

/**
 * A two-pill from→to row. Rendering rule:
 *   • If `from` is null/empty → "→ to" (initial state).
 *   • Otherwise → "from → to" with the from pill in red and the to pill in green.
 */
function TransitionRow({ label, from, to }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="col-span-1 text-ink-soft text-xs">{label}</div>
      <div className="col-span-2 flex items-center gap-2 text-sm">
        {from != null && from !== 'null' ? (
          <span className="inline-flex px-2 py-0.5 rounded-full text-xs bg-rose-50 text-rose-700 border border-rose-200 font-mono">
            {from}
          </span>
        ) : (
          <span className="text-ink-soft text-xs italic">(initial)</span>
        )}
        <span className="text-ink-soft">→</span>
        <span className="inline-flex px-2 py-0.5 rounded-full text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono">
          {to ?? '—'}
        </span>
      </div>
    </div>
  );
}

/**
 * Render notes — JSON pretty-print when parseable, plain text otherwise.
 * Legacy rows with NULL notes get a soft empty state.
 */
function NotesView({ notes_json, notes_text }) {
  if (notes_json != null) {
    let pretty;
    try { pretty = JSON.stringify(notes_json, null, 2); }
    catch { pretty = String(notes_json); }
    return (
      <pre className="bg-base/60 border border-border rounded-md px-3 py-2 text-xs overflow-x-auto font-mono whitespace-pre">
        {pretty}
      </pre>
    );
  }
  if (notes_text && notes_text.trim() !== '') {
    return (
      <pre className="bg-base/60 border border-border rounded-md px-3 py-2 text-xs whitespace-pre-wrap break-words">
        {notes_text}
      </pre>
    );
  }
  return (
    <div className="text-xs italic text-ink-soft">(no details captured)</div>
  );
}
