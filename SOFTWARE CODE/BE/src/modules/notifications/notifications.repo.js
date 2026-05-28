// ============================================================================
// src/modules/notifications/notifications.repo.js  —  Notification DAL
// ----------------------------------------------------------------------------
// PHASE 12 — Notifications
//
// DOCTRINE
//   • ONLY this file mentions raw SQL columns.
//   • Recipient-scoping is enforced at the SQL layer (defense in depth).
//     EVERY read + write filters by recipient_employee_id = ?. A user
//     cannot fetch or mutate another user's notifications even with a
//     guessed id.
//   • All writes happen through `insertOne(conn, row)` so they can join
//     the caller's transaction. `pool.query` is used only for reads.
// ============================================================================

'use strict';

const pool = require('../../config/db');


// ───────────────────────────────────────────────────────────────────────
//  WRITE (transactional — caller passes the conn)
// ───────────────────────────────────────────────────────────────────────

/**
 * Insert one notification row INSIDE an active transaction. Returns the
 * insert id. Throws on FK / NOT NULL violation — caller should rollback
 * the surrounding transaction.
 *
 * The emitter (notifications.emitter.js) calls this once per recipient.
 *
 * @param {import('mysql2/promise').PoolConnection} conn  Active txn conn
 * @param {Object} row
 * @param {string} row.recipient_employee_id
 * @param {string|null} row.actor_employee_id
 * @param {string} row.event_type
 * @param {'JOB_REQUEST'|'JOB_CARD'|'EQUIPMENT'} row.entity_type
 * @param {string|number} row.entity_id
 * @param {string} row.title
 * @param {string|null} [row.body]
 * @param {string|null} [row.deep_link]
 * @returns {Promise<number>} The new notification id.
 */
async function insertOne(conn, row) {
  const [result] = await conn.query(
    `INSERT INTO notifications
       (recipient_employee_id, actor_employee_id, event_type,
        entity_type, entity_id, title, body, deep_link)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      row.recipient_employee_id,
      row.actor_employee_id || null,
      row.event_type,
      row.entity_type,
      String(row.entity_id),
      row.title,
      row.body || null,
      row.deep_link || null,
    ],
  );
  return result.insertId;
}


// ───────────────────────────────────────────────────────────────────────
//  READ (own notifications, paginated)
// ───────────────────────────────────────────────────────────────────────

/**
 * List notifications for the given employee. Newest first. Always
 * scoped — a missing employeeId is a programmer bug, throw loudly so
 * we don't accidentally return ALL rows.
 *
 * @param {string} employeeId
 * @param {Object} opts
 * @param {boolean} [opts.unreadOnly]
 * @param {number}  [opts.page=1]
 * @param {number}  [opts.page_size=20]
 * @returns {Promise<{ rows: object[], total: number, unread: number }>}
 */
async function listForUser(employeeId, opts = {}) {
  if (!employeeId) {
    throw new Error('listForUser: employeeId is required');
  }
  const { unreadOnly = false, page = 1, page_size = 20 } = opts;
  const where = ['recipient_employee_id = ?', "event_type <> 'JC_TAB_UPDATED'"];
  const args  = [employeeId];
  if (unreadOnly) where.push('is_read = 0');
  const whereSql = `WHERE ${where.join(' AND ')}`;

  const offset = (page - 1) * page_size;

  const dataSql = `
    SELECT id, recipient_employee_id, actor_employee_id, event_type,
           entity_type, entity_id, title, body, deep_link,
           is_read, created_at, read_at
      FROM notifications
      ${whereSql}
     ORDER BY created_at DESC, id DESC
     LIMIT ? OFFSET ?`;

  // Total honours the unreadOnly filter; unread count is always the
  // unread-for-this-user count (used by the bell badge regardless of
  // whether the list is filtered).
  const countSql = `SELECT COUNT(*) AS n FROM notifications ${whereSql}`;
  const unreadSql = `
    SELECT COUNT(*) AS n FROM notifications
     WHERE recipient_employee_id = ?
       AND is_read = 0
       AND event_type <> 'JC_TAB_UPDATED'`;

  const [[rows], [countRows], [unreadRows]] = await Promise.all([
    pool.query(dataSql, [...args, page_size, offset]),
    pool.query(countSql, args),
    pool.query(unreadSql, [employeeId]),
  ]);

  return {
    rows,
    total:  Number(countRows[0].n) || 0,
    unread: Number(unreadRows[0].n) || 0,
  };
}


/**
 * Just the unread count — used by the bell-badge polling endpoint.
 * Tiny single-row query that benefits from idx_notif_recipient_unread.
 *
 * @param {string} employeeId
 * @returns {Promise<number>}
 */
async function countUnread(employeeId) {
  if (!employeeId) throw new Error('countUnread: employeeId is required');
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS n FROM notifications
       WHERE recipient_employee_id = ?
         AND is_read = 0
         AND event_type <> 'JC_TAB_UPDATED'`,
    [employeeId],
  );
  return Number(rows[0].n) || 0;
}


// ───────────────────────────────────────────────────────────────────────
//  WRITE (mark read — scoped by recipient at the SQL layer)
// ───────────────────────────────────────────────────────────────────────

/**
 * Mark a single notification as read. SQL-level scope: the UPDATE only
 * matches when recipient_employee_id matches — so a guess-the-id attack
 * silently updates 0 rows. Returns affectedRows (0 ⇒ caller should 404).
 *
 * @param {number} id
 * @param {string} employeeId
 * @returns {Promise<number>}
 */
async function markRead(id, employeeId) {
  if (!employeeId) throw new Error('markRead: employeeId is required');
  const [result] = await pool.query(
    `UPDATE notifications
        SET is_read = 1,
            read_at = COALESCE(read_at, NOW(6))
      WHERE id = ? AND recipient_employee_id = ? AND is_read = 0`,
    [id, employeeId],
  );
  return result.affectedRows;
}


/**
 * Mark every unread notification for this user as read. Returns the
 * number of rows updated for UX feedback.
 *
 * @param {string} employeeId
 * @returns {Promise<number>}
 */
async function markAllRead(employeeId) {
  if (!employeeId) throw new Error('markAllRead: employeeId is required');
  const [result] = await pool.query(
    `UPDATE notifications
        SET is_read = 1,
            read_at = NOW(6)
      WHERE recipient_employee_id = ? AND is_read = 0`,
    [employeeId],
  );
  return result.affectedRows;
}


module.exports = {
  // Write
  insertOne,
  markRead,
  markAllRead,
  // Read
  listForUser,
  countUnread,
};
