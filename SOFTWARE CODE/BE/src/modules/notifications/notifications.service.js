// ============================================================================
// src/modules/notifications/notifications.service.js  —  Read-side facade
// ----------------------------------------------------------------------------
// PHASE 12 — Notifications
//
// Thin facade over the repo. The emitter (write side) is consumed
// directly by JR/JC services because it needs the active txn conn — the
// HTTP controllers never write notifications themselves.
//
// Every method takes the actor's `employeeId` explicitly so the routes
// can stay tiny and the test surface is clear.
// ============================================================================

'use strict';

const repo = require('./notifications.repo');
const { errors } = require('../../middleware/errorHandler');


/**
 * Paginated list of the caller's notifications.
 *
 * @param {string} employeeId
 * @param {Object} params  Output of listQuerySchema.
 */
async function listForUser(employeeId, params) {
  return repo.listForUser(employeeId, params);
}


/**
 * Unread count for the caller. Returns `{ unread: <number> }` — the
 * envelope leaves room to add `last_seen_at` later without an API break.
 *
 * @param {string} employeeId
 */
async function countUnread(employeeId) {
  const n = await repo.countUnread(employeeId);
  return { unread: n };
}


/**
 * Mark a single notification as read. Throws notFound when the row
 * either doesn't exist or belongs to another user — we collapse both
 * to 404 so we don't leak existence (mirrors the JR row-scope policy).
 *
 * @param {number} id
 * @param {string} employeeId
 */
async function markRead(id, employeeId) {
  const affected = await repo.markRead(id, employeeId);
  if (affected === 0) {
    throw errors.notFound(`Notification not found or already read: ${id}`);
  }
  return { ok: true, id };
}


/**
 * Mark every unread notification as read. Returns the count of rows
 * flipped — the UI uses this to show "12 marked as read" feedback.
 *
 * @param {string} employeeId
 */
async function markAllRead(employeeId) {
  const n = await repo.markAllRead(employeeId);
  return { ok: true, marked: n };
}


module.exports = {
  listForUser,
  countUnread,
  markRead,
  markAllRead,
};
