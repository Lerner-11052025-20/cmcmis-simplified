// ============================================================================
// src/modules/audit/audit.service.js  —  Read-only business logic
// ----------------------------------------------------------------------------
// PHASE 14 — Audit Log Viewer
//
// EXPORTED METHODS
//   listAudit(params)              — paginated list across the chosen source
//   getAuditDetail(id, source, sub)— single-row detail (incl. parsed JSON
//                                    notes when available)
//   getFilters(source)             — distinct actions + entity types for
//                                    the dropdowns (15-min in-process cache)
//   exportCsv(params)              — CSV string for the current filter
//
// DOCTRINE
//   • This module ONLY reads. No writes anywhere — not even to log "user X
//     exported audit at HH:MM"; that recursion is explicitly out of scope.
//   • Every payload includes a `deep_link` hint when the entity has a known
//     detail page. The FE may follow it; or display the entity_id as plain text
//     when null.
// ============================================================================

'use strict';

const dayjs = require('dayjs');

const repo  = require('./audit.repo');
const { errors } = require('../../middleware/errorHandler');


// In-process micro-cache for the filter-dropdown query. The result set is
// bounded (~50 actions, ~10 entity types) and cheap to recompute, but a 15-
// min cache cuts every-page-load duplicate work from the FE.
const FILTERS_TTL_MS = 15 * 60 * 1000;
const filtersCache = new Map();   // key = source, value = { at, payload }

function cacheGet(key) {
  const e = filtersCache.get(key);
  if (!e) return null;
  if (Date.now() - e.at > FILTERS_TTL_MS) return null;
  return e.payload;
}
function cacheSet(key, payload) {
  filtersCache.set(key, { at: Date.now(), payload });
}


// ───────────────────────────────────────────────────────────────────────
//  Helpers
// ───────────────────────────────────────────────────────────────────────

/**
 * Best-effort safe JSON parse. The notes column is a hand-rolled
 * JSON.stringify from each module's writeAuditLog — but legacy rows may
 * carry plain strings or NULL. Always return an object/null pair so the
 * FE diff view can render both branches cleanly.
 */
function tryParseNotes(notes) {
  if (notes == null) return { parsed: null, raw: null };
  if (typeof notes !== 'string') return { parsed: null, raw: String(notes) };
  const trimmed = notes.trim();
  if (trimmed === '') return { parsed: null, raw: '' };
  if (!(trimmed.startsWith('{') || trimmed.startsWith('['))) {
    return { parsed: null, raw: trimmed };
  }
  try { return { parsed: JSON.parse(trimmed), raw: trimmed }; }
  catch { return { parsed: null, raw: trimmed }; }
}

/**
 * Build a short human "summary" from the raw row. Used in the list view
 * Summary column so engineers don't have to expand the row to see what
 * happened. Falls back to "<action> on <entity_type>:<entity_id>".
 */
function buildSummary(r) {
  const action = r.action || '';
  const ent    = r.entity_type ? `${r.entity_type}:` : '';
  const id     = r.entity_id ? r.entity_id : '';
  // Status-history rows carry from_status/to_status — preferred.
  if (r.to_status) {
    const from = r.from_status ? `${r.from_status} → ` : '';
    return `${from}${r.to_status} on ${ent}${id}`.trim();
  }
  // user_role_history rows carry from_role/to_role + from_active/to_active.
  if (r.to_role) {
    const roleChange  = r.from_role && r.from_role !== r.to_role ? `${r.from_role} → ${r.to_role}` : `role=${r.to_role}`;
    const activeChange = r.from_active != null && r.from_active !== r.to_active
      ? `active=${r.from_active}→${r.to_active}` : '';
    const bits = [roleChange, activeChange].filter(Boolean).join(' · ');
    return `${bits} on ${ent}${id}`.trim();
  }
  return `${action} ${ent}${id}`.trim();
}

/**
 * Resolve a FE-side deep link path for an entity, when one exists. Returning
 * null is safe — the FE renders the entity_id as plain text in that case.
 */
function deepLinkFor(entityType, entityId) {
  if (!entityId) return null;
  switch (String(entityType).toLowerCase()) {
    case 'job_request':  return `/job-requests/${encodeURIComponent(entityId)}`;
    case 'job_card':     return `/job-cards/${encodeURIComponent(entityId)}`;
    case 'equipment':    return `/equipment/${encodeURIComponent(entityId)}`;
    case 'user':         return `/admin/users`;                  // list page
    case 'employee':     return `/admin/employees`;              // list page
    case 'schedule':     return `/schedule`;                     // no per-id page yet
    case 'purchase_order': return `/procurement`;
    case 'spare_part':   return `/procurement`;
    default: return null;
  }
}


// ───────────────────────────────────────────────────────────────────────
//  Canonical row → API shape
// ───────────────────────────────────────────────────────────────────────
function toApi(r, source) {
  if (!r) return null;
  const { parsed, raw } = tryParseNotes(r.notes);
  return {
    id:                r.id,
    source,
    sub_source:        r.source_table || null,           // transitions union
    occurred_at:       r.occurred_at ? dayjs(r.occurred_at).format('YYYY-MM-DD HH:mm:ss') : null,
    action:            r.action,
    entity_type:       r.entity_type,
    entity_id:         r.entity_id,
    entity_label:      r.entity_label || null,
    actor_employee_id: r.actor_employee_id || null,
    actor_name:        r.actor_name || r.actor_employee_id || null,
    actor_role_code:   r.actor_role_code || null,
    ip_address:        r.ip_address || null,
    user_agent:        r.user_agent || null,
    request_id:        r.request_id || null,
    from_status:       r.from_status || null,
    to_status:         r.to_status || null,
    from_role:         r.from_role || null,
    to_role:           r.to_role || null,
    from_active:       r.from_active != null ? Boolean(r.from_active) : null,
    to_active:         r.to_active != null   ? Boolean(r.to_active)   : null,
    notes_text:        raw,        // raw string (in case it isn't JSON)
    notes_json:        parsed,     // parsed object (when notes was valid JSON)
    summary:           buildSummary(r),
    deep_link:         deepLinkFor(r.entity_type, r.entity_id),
  };
}


// ───────────────────────────────────────────────────────────────────────
//  LIST
// ───────────────────────────────────────────────────────────────────────
async function listAudit(rawParams) {
  const source = rawParams.source || 'audit_log';
  const params = { ...rawParams, page: rawParams.page || 1, page_size: rawParams.page_size || 25 };

  let result;
  if (source === 'identity')         result = await repo.listIdentityHistory(params);
  else if (source === 'transitions') result = await repo.listStatusTransitions(params);
  else                               result = await repo.listAuditLog(params);

  const items = result.rows.map((r) => toApi(r, source));
  return {
    items,
    pagination: {
      page:        params.page,
      page_size:   params.page_size,
      total_items: result.total,
      total_pages: Math.max(1, Math.ceil(result.total / params.page_size)),
    },
    source,
    applied_filters: {
      from:       params.from       || null,
      to:         params.to         || null,
      actor:      params.actor      || null,
      action:     params.action     || null,
      entityType: params.entityType || null,
      entityId:   params.entityId   || null,
      q:          params.q          || null,
    },
  };
}


// ───────────────────────────────────────────────────────────────────────
//  DETAIL
// ───────────────────────────────────────────────────────────────────────
async function getAuditDetail(id, source = 'audit_log', subSource = null) {
  let row;
  if (source === 'identity')         row = await repo.findIdentityHistoryById(id);
  else if (source === 'transitions') row = await repo.findStatusTransitionById(id, subSource);
  else                               row = await repo.findAuditLogById(id);

  if (!row) throw errors.notFound(`Audit row ${id} not found in source=${source}`);
  return toApi(row, source);
}


// ───────────────────────────────────────────────────────────────────────
//  FILTERS  (distinct actions + entity types for the dropdowns)
// ───────────────────────────────────────────────────────────────────────
async function getFilters(source = 'audit_log') {
  const cached = cacheGet(source);
  if (cached) return cached;

  let payload;
  if (source === 'identity')         payload = await repo.distinctIdentityFilters();
  else if (source === 'transitions') payload = await repo.distinctTransitionsFilters();
  else                               payload = await repo.distinctAuditFilters();

  cacheSet(source, payload);
  return payload;
}


// ───────────────────────────────────────────────────────────────────────
//  CSV EXPORT
// ───────────────────────────────────────────────────────────────────────
function csvEscape(v) {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (/[,"\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

async function exportCsv(rawParams) {
  // Cap the export at HARD_ROW_CAP rows so a careless "no-filter export"
  // can't pull millions of audit lines into memory. The cap is documented
  // in the response header X-Export-Capped: <cap>.
  const source = rawParams.source || 'audit_log';
  const params = { ...rawParams, page: 1, page_size: repo.HARD_ROW_CAP };

  const { items } = await listAudit(params);
  const head = [
    'Timestamp', 'Source', 'Action', 'Entity Type', 'Entity ID',
    'Actor Employee ID', 'Actor Name', 'Actor Role',
    'From → To',          // status / role transitions
    'IP', 'User Agent', 'Request ID', 'Summary', 'Notes',
  ];
  const lines = [head.join(',')];
  for (const r of items) {
    const fromTo = r.from_status && r.to_status
      ? `${r.from_status} → ${r.to_status}`
      : (r.from_role && r.to_role)
        ? `${r.from_role} → ${r.to_role}`
        : '';
    lines.push([
      r.occurred_at, r.source, r.action, r.entity_type, r.entity_id,
      r.actor_employee_id, r.actor_name, r.actor_role_code,
      fromTo,
      r.ip_address, r.user_agent, r.request_id, r.summary,
      r.notes_text,
    ].map(csvEscape).join(','));
  }
  return {
    csv: lines.join('\r\n') + '\r\n',
    rowCount: items.length,
    capped: items.length >= repo.HARD_ROW_CAP,
  };
}


module.exports = {
  listAudit,
  getAuditDetail,
  getFilters,
  exportCsv,
};
