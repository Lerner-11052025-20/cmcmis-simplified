// ============================================================================
// src/modules/schedule/schedule.ics.js  —  Minimal RFC-5545 ICS serializer
// ----------------------------------------------------------------------------
// PHASE 13 — Schedule sub-module
//
// PURPOSE
//   Emit one or more VEVENT blocks wrapped in a single VCALENDAR. The
//   produced text is what users save as `.ics` and import into Outlook /
//   Google Calendar / Apple Calendar.
//
// SCOPE
//   This is a TINY hand-rolled serializer. We deliberately avoid a 3rd-
//   party ICS lib because the surface is small (UID/DTSTAMP/DTSTART/
//   DTEND/SUMMARY/DESCRIPTION) and the dependency risk for a defence-
//   grade system is not justified. RFC 5545 §3.4 is followed for the
//   pieces we emit. Multi-VEVENT bundles use one VCALENDAR envelope.
//
// CRLF
//   ICS requires CRLF line endings. We produce `\r\n` explicitly. Any
//   future fold (lines >75 octets) is handled by foldLine() — not used
//   today because our SUMMARY/DESCRIPTION lengths are bounded by the
//   schedule_code + equipment_label caps in the schema.
// ============================================================================

'use strict';

const CRLF = '\r\n';

// Product id token. Most calendars surface this to debugging tools.
const PRODID = '-//ISRO SAC//CMCMIS Phase 13 Schedule//EN';


/**
 * UTC-formatted date stamp (DTSTAMP / DTSTART) used by RFC 5545. We treat
 * a "date" schedule as an all-day event by emitting DTSTART with the
 * VALUE=DATE param + DTEND set to the next day (the standard half-open
 * range trick).
 *
 * @param {Date|string} d  YYYY-MM-DD or Date instance
 * @returns {string}       "YYYYMMDD"
 */
function fmtDate(d) {
  let s;
  if (typeof d === 'string') s = d.slice(0, 10);
  else {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(d.getUTCDate()).padStart(2, '0');
    s = `${y}-${m}-${dd}`;
  }
  return s.replace(/-/g, '');
}

/**
 * UTC timestamp (used for DTSTAMP — when this VEVENT was authored).
 *
 * @param {Date} d
 * @returns {string}  "YYYYMMDDTHHMMSSZ"
 */
function fmtDateTimeUtc(d) {
  const y  = d.getUTCFullYear();
  const m  = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  const ss = String(d.getUTCSeconds()).padStart(2, '0');
  return `${y}${m}${dd}T${hh}${mm}${ss}Z`;
}

/**
 * Add one day to a YYYY-MM-DD string. Used to compute DTEND for all-day
 * events (the standard half-open interval).
 */
function addOneDay(yyyyMmDd) {
  const d = new Date(`${yyyyMmDd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/**
 * RFC 5545 text-escape: backslash, comma, semicolon, newline.
 * (Quotes don't need escaping.) Whitespace is preserved.
 */
function escapeText(s) {
  if (s == null) return '';
  return String(s)
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');
}

/**
 * Soft-fold lines longer than 75 octets per RFC 5545 §3.1. We rarely
 * trip this with bounded fields, but the helper exists for future safety.
 */
function foldLine(line) {
  if (line.length <= 75) return line;
  const chunks = [];
  let i = 0;
  while (i < line.length) {
    if (i === 0) chunks.push(line.slice(0, 75));
    else         chunks.push(' ' + line.slice(i, i + 74));
    i = chunks.length === 1 ? 75 : i + 74;
  }
  return chunks.join(CRLF);
}


/**
 * Build one VEVENT block. The schedule object is the canonical row shape
 * the service produces (NOT raw repo output). Required fields:
 *   id, schedule_code, schedule_type, equipment_label, scheduled_date.
 *
 * @param {object} s
 * @param {Date}   [now] Stamp time (defaults to new Date()).
 * @returns {string}    Multi-line VEVENT (CRLF-joined).
 */
function buildVevent(s, now = new Date()) {
  const prefix = s.schedule_type === 'CALIBRATION' ? 'CAL' : 'PM';
  const summary = `${prefix}: ${s.equipment_label || s.equipment_id || 'Equipment'}`;
  // Stable UID — domain-style. Includes the schedule_code so re-emitted
  // events overwrite the same calendar slot on the client (Outlook will
  // match on UID + RECURRENCE-ID).
  const uid = `${s.schedule_code}@cmcmis.isro.sac`;

  const descParts = [];
  if (s.status)   descParts.push(`Status: ${s.status}`);
  if (s.priority) descParts.push(`Priority: ${s.priority}`);
  if (s.assigned_engineer_name) descParts.push(`Engineer: ${s.assigned_engineer_name}`);
  if (s.notes)    descParts.push(`Notes: ${s.notes}`);
  const description = descParts.join('\\n');

  const dtStart = fmtDate(s.scheduled_date);
  const dtEnd   = fmtDate(addOneDay(typeof s.scheduled_date === 'string'
    ? s.scheduled_date.slice(0, 10)
    : (() => {
        const d = s.scheduled_date;
        return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;
      })()));

  const lines = [
    'BEGIN:VEVENT',
    foldLine(`UID:${uid}`),
    `DTSTAMP:${fmtDateTimeUtc(now)}`,
    `DTSTART;VALUE=DATE:${dtStart}`,
    `DTEND;VALUE=DATE:${dtEnd}`,
    foldLine(`SUMMARY:${escapeText(summary)}`),
  ];
  if (description) lines.push(foldLine(`DESCRIPTION:${description}`));
  lines.push(`CATEGORIES:${s.schedule_type === 'CALIBRATION' ? 'CALIBRATION' : 'MAINTENANCE'}`);
  lines.push('END:VEVENT');
  return lines.join(CRLF);
}


/**
 * Build the full VCALENDAR envelope wrapping 1..N VEVENTs.
 *
 * @param {object[]} schedules
 * @returns {string}             CRLF-terminated ICS text
 */
function buildCalendar(schedules) {
  const now = new Date();
  const out = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:${PRODID}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];
  for (const s of schedules) {
    out.push(buildVevent(s, now));
  }
  out.push('END:VCALENDAR');
  // RFC 5545 requires the file end with CRLF.
  return out.join(CRLF) + CRLF;
}


module.exports = {
  buildCalendar,
  buildVevent,
  // Exposed for unit tests:
  escapeText,
  fmtDate,
  fmtDateTimeUtc,
};
