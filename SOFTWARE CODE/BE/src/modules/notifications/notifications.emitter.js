// ============================================================================
// src/modules/notifications/notifications.emitter.js  —  Workflow hook
// ----------------------------------------------------------------------------
// PHASE 12 — Notifications
//
// PURPOSE
//   Called from inside the JR/JC state-machine transactions to fan out
//   notifications to the right recipients. Every emit() call:
//     1. Resolves event_type → title/body/deep_link via TEMPLATES.
//     2. Dedupes recipients (a user is never notified twice for one event).
//     3. Inserts one row per recipient through `repo.insertOne(conn, …)`.
//
//   The caller owns the transaction. If insertOne throws, the caller's
//   try/catch will rollback the whole transaction (audit + state-history
//   + workflow update all reverse together). Zero orphans.
//
// IDEMPOTENCY
//   The emitter is fire-once per event. A workflow that emits the same
//   logical event twice (e.g. retried Convert) would create duplicate
//   rows — that's a workflow bug to fix upstream, NOT an emitter concern.
//
// RECIPIENT POLICY
//   • The actor (the person who caused the event) NEVER notifies themself.
//   • View-Only users would not see notifications anyway (no permission)
//     so we don't filter them at insert time — the read endpoint is the
//     gate. This keeps the emitter dumb (insert what was asked).
//   • Empty/null employee_id values are silently dropped (defence: legacy
//     rows often have missing JR_ASSIGNED_ENGINEER until Convert runs).
// ============================================================================

'use strict';

const repo   = require('./notifications.repo');
const logger = require('../../config/logger');


// ── Event template dictionary ─────────────────────────────────────────
// Each entry knows how to build a recipient-friendly title + body + the
// deep-link path. The factory receives the entity payload + actor name
// snapshot so it can substitute values into the human-readable strings.
//
// New event_type? Add a row here. NEVER hand-build titles in callers —
// that's how labels drift over time.
const TEMPLATES = {
  // ── Job Request lifecycle ─────────────────────────────────────────
  JR_DRAFT_SAVED: (e) => ({
    title: `Draft saved · ${e.code}`,
    body:  `Your Job Request was saved as draft.`,
    deep:  `/job-requests/${e.id}`,
  }),
  JR_SUBMITTED: (e) => ({
    title: `Job Request submitted · ${e.code}`,
    body:  e.byMe ? `Your request is now waiting for Lab In-Charge approval.`
                  : `${e.actorName} submitted a new request for ${e.equipmentName || 'equipment'}.`,
    deep:  `/job-requests/${e.id}`,
  }),
  JR_EDIT_DRAFT: (e) => ({
    title: `Draft updated · ${e.code}`,
    body:  `Your draft was saved.`,
    deep:  `/job-requests/${e.id}`,
  }),
  JR_APPROVED_CONVERTED: (e) => ({
    title: `Approved + Job Card created · ${e.code}`,
    body:  e.byMe ? `Job Card ${e.cardCode} created.`
                  : `${e.actorName} approved your request. Job Card ${e.cardCode} created.`,
    deep:  e.cardSectionNo ? `/job-cards/${e.cardSectionNo}` : `/job-requests/${e.id}`,
  }),
  JR_REJECTED: (e) => ({
    title: `Job Request rejected · ${e.code}`,
    body:  `Reason: ${e.reason || '—'}`,
    deep:  `/job-requests/${e.id}`,
  }),
  JR_CANCELLED: (e) => ({
    title: `Job Request cancelled · ${e.code}`,
    body:  e.reason ? `Reason: ${e.reason}` : `The request was cancelled.`,
    deep:  `/job-requests/${e.id}`,
  }),

  // ── Job Card lifecycle ────────────────────────────────────────────
  JC_CREATED: (e) => ({
    title: `New Job Card assigned · ${e.cardCode}`,
    body:  `${e.actorName} created and assigned Job Card ${e.cardCode}.`,
    deep:  `/job-cards/${e.cardSectionNo}`,
  }),
  JC_START_WORK: (e) => ({
    title: `Work started · ${e.cardCode}`,
    body:  e.byMe ? `You started work on this card.`
                  : `${e.actorName} started work on ${e.cardCode}.`,
    deep:  `/job-cards/${e.cardSectionNo}`,
  }),
  JC_TAB_UPDATED: (e) => ({
    title: `Card updated · ${e.cardCode}`,
    body:  `${e.actorName} edited tab data (${e.tabHint || 'details'}).`,
    deep:  `/job-cards/${e.cardSectionNo}`,
  }),
  JC_CHILD_ROW_ADDED: (e) => ({
    title: `Row added · ${e.cardCode}`,
    body:  `${e.actorName} added a ${e.childKind || 'row'}.`,
    deep:  `/job-cards/${e.cardSectionNo}`,
  }),
  JC_MARKED_COMPLETE: (e) => ({
    title: `Marked complete · ${e.cardCode}`,
    body:  e.byMe ? `Your card is awaiting verification.`
                  : `${e.actorName} marked ${e.cardCode} complete — verification needed.`,
    deep:  `/job-cards/${e.cardSectionNo}`,
  }),
  JC_VERIFIED_CLOSED: (e) => ({
    title: `Closed · ${e.cardCode}`,
    body:  `${e.actorName} verified and closed ${e.cardCode}.`,
    deep:  `/job-cards/${e.cardSectionNo}`,
  }),
  JC_REOPENED: (e) => ({
    title: `Reopened · ${e.cardCode}`,
    body:  e.reason ? `Reason: ${e.reason}` : `Card was reopened for rework.`,
    deep:  `/job-cards/${e.cardSectionNo}`,
  }),

  // ── Equipment (light coverage; senior call per spec §3.1) ─────────
  EQUIPMENT_REGISTERED: (e) => ({
    title: `New equipment registered`,
    body:  `${e.actorName} registered ${e.equipmentName || 'equipment'}.`,
    deep:  e.equipmentSlug ? `/equipment/${e.equipmentSlug}` : '/equipment',
  }),
  EQUIPMENT_VERIFIED: (e) => ({
    title: `Equipment verified`,
    body:  `${e.actorName} verified ${e.equipmentName || 'equipment'}.`,
    deep:  e.equipmentSlug ? `/equipment/${e.equipmentSlug}` : '/equipment',
  }),
};


// ── Helpers ────────────────────────────────────────────────────────────

/**
 * De-dupe + clean a recipient list. Drops:
 *   • null / undefined / empty strings
 *   • the actor's own id (we don't notify yourself)
 *   • duplicates within the call
 *
 * @param {string[]} recipients
 * @param {string|null|undefined} actorEmployeeId
 * @returns {string[]}
 */
function cleanRecipients(recipients, actorEmployeeId) {
  if (!Array.isArray(recipients)) return [];
  const out = new Set();
  for (const r of recipients) {
    if (!r) continue;
    const id = String(r).trim();
    if (id === '')                 continue;
    if (id === actorEmployeeId)    continue;     // never notify yourself
    out.add(id);
  }
  return [...out];
}


// ── Main emit() entry point ────────────────────────────────────────────

/**
 * Emit one workflow event to N recipients inside an active transaction.
 *
 * @param {Object}  args
 * @param {import('mysql2/promise').PoolConnection} args.conn   Active txn conn
 * @param {string}  args.event_type        Key from TEMPLATES (e.g. 'JC_MARKED_COMPLETE')
 * @param {'JOB_REQUEST'|'JOB_CARD'|'EQUIPMENT'} args.entity_type
 * @param {string|number} args.entity_id   PK for deep-linking
 * @param {Object}  args.entity            Entity snapshot used by the template
 *                                          (code, cardCode, equipmentName, reason, …)
 * @param {Object}  args.actor             { employeeId, fullName }
 * @param {string[]} args.recipients       List of employee_id VARCHAR(7) values
 *
 * @returns {Promise<{ inserted: number, ids: number[] }>}
 */
async function emit({ conn, event_type, entity_type, entity_id, entity, actor, recipients }) {
  if (!conn)                  throw new Error('emit: conn (active transaction) is required');
  if (!event_type)            throw new Error('emit: event_type is required');
  if (!entity_type)           throw new Error('emit: entity_type is required');
  if (entity_id === undefined || entity_id === null)
                              throw new Error('emit: entity_id is required');

  const tmpl = TEMPLATES[event_type];
  if (!tmpl) {
    throw new Error(`emit: unknown event_type "${event_type}". Add it to TEMPLATES.`);
  }

  const actorEmployeeId = actor?.employeeId || null;
  const actorName       = actor?.fullName || actorEmployeeId || 'A user';

  // Final recipient list — actor stripped, deduped.
  const cleanList = cleanRecipients(recipients, actorEmployeeId);

  if (cleanList.length === 0) {
    // Nothing to emit. Not an error — many events legitimately have no
    // remaining recipients (e.g. JR_DRAFT_SAVED where the owner IS the actor).
    return { inserted: 0, ids: [] };
  }

  // Build one row per recipient. The `byMe` flag lets the template
  // tailor copy for the owner vs everyone else.
  const ids = [];
  for (const rid of cleanList) {
    const t = tmpl({
      ...entity,
      actorName,
      byMe: rid === actorEmployeeId, // always false here (we stripped above) but kept for template clarity
    });
    try {
      const id = await repo.insertOne(conn, {
        recipient_employee_id: rid,
        actor_employee_id:     actorEmployeeId,
        event_type,
        entity_type,
        entity_id:             entity_id,
        title:                 t.title.slice(0, 160),
        body:                  t.body ? t.body.slice(0, 500) : null,
        deep_link:             t.deep || null,
      });
      ids.push(id);
    } catch (err) {
      // Bubble up — the caller will rollback the surrounding transaction.
      logger.error(
        { err: { message: err.message }, event_type, recipient: rid, entity_id },
        'notifications.emit: failed insert — rolling back',
      );
      throw err;
    }
  }
  return { inserted: ids.length, ids };
}


// Expose TEMPLATES for tests + for any future tooling that wants to
// enumerate the event vocabulary.
emit.TEMPLATES = TEMPLATES;
emit.cleanRecipients = cleanRecipients;

module.exports = { emit };
