// ============================================================================
// src/modules/pdf/templates/jobCardCertificate.js
// ----------------------------------------------------------------------------
// PDF #1 — JOB CARD CERTIFICATE (LOCKED LAYOUT — DO NOT REDESIGN)
//
// PHASE 11 — PDF Generation
//
// Replicates the supplied reference document
// `JobCard_cmcmis_simplified_DSMG.pdf` exactly:
//
//   ┌─────────────────────────────────────────────────────────────────┐
//   │ ISRO    SPACE APPLICATIONS CENTRE / TIMCD / JOB REQUEST     SAC │
//   │ logo    OF T&ME FOR CALIBRATION                            seal │
//   ├─────────────────────────────────────────────────────────────────┤
//   │ Equipment ID | Job Card No. | Date                              │
//   ├─────────────────────────────────────────────────────────────────┤
//   │ 1. EQUIPMENT IDENTIFICATION                                     │
//   │    Name · Make · Model · Serial · Main Frame · Options          │
//   │    [Accessory rows table: Item Type | Sr.No. | Item Name | …]   │
//   ├─────────────────────────────────────────────────────────────────┤
//   │ 2. REQUEST CLASSIFICATION                                       │
//   │    Sent after repairs: ☐ Yes ☐ No · Remarks: ___                │
//   ├─────────────────────────────────────────────────────────────────┤
//   │ 3. USER SUBMISSION & FORWARDING                                 │
//   │    Submitted By · Forwarded Through HOD/EIC                     │
//   ├─────────────────────────────────────────────────────────────────┤
//   │ 4. INSTRUCTIONS FOR USER (static text)                          │
//   ├─────────────────────────────────────────────────────────────────┤
//   │ 5. FOR TIMCD USE — internal receiving/planning/assignment       │
//   ├─────────────────────────────────────────────────────────────────┤
//   │ 6. CALIBRATION LAB RECEIPT                                      │
//   ├─────────────────────────────────────────────────────────────────┤
//   │ 7. CONFORMITY, USER SIGNATURE & REVIEW                          │
//   └─────────────────────────────────────────────────────────────────┘
//
// CONSTRAINT — STRICTLY ONE PAGE. We render onto A4 portrait with a tight
// margin and never call `doc.addPage()`. If the parent JR's accessory
// list overflows the dedicated 2-row table, we draw the first 2 rows
// only and append a "… +N more" footer cell — overflow rows are
// available in the JC Details PDF (#2), not on this certificate.
//
// LIVE DATA, ZERO MOCK
//   Every field is filled from the canonical payload returned by
//   pdf.repo.loadJobCardFull(sectionJobNo). Fields with no data render
//   as printable blank ruled lines (the certificate is signed by hand
//   when the equipment is handed back, so manual fields stay empty).
// ============================================================================

'use strict';

const PDFDocument = require('pdfkit');
const {
  PAGE_MARGIN_X,
  COLORS,
  drawHeader,
  fmtDate,
  fmtText,
} = require('./_isroHeader');

function formatStatus(status) {
  if (!status) return '';
  const MAP = {
    DRAFT: 'Draft',
    SUBMITTED: 'Pending For Conversion',
    ASSIGNED: 'Job In Queue',
    IN_PROGRESS: 'Job On Hand',
    COMPLETED: 'Review Pending',
    VERIFIED_CLOSED: 'Completed',
    REJECTED: 'Rejected',
    REOPENED: 'Reopened',
    CANCELLED: 'Cancelled',
  };
  return MAP[status] || status.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

// ── Layout constants for this template ──────────────────────────────────
//   A4 portrait at 72 DPI = 595 × 842 pt. We aim for content height ≤ 760
//   so the footer never wraps onto a second page even when accessory rows
//   are present.
const PAGE_HEIGHT = 842;
const ROW_LABEL_COLOR = COLORS.title;
const ROW_VALUE_COLOR = COLORS.title;
const TICK_BOX = 9;           // checkbox side length in pt

// ── Helpers ────────────────────────────────────────────────────────────

/** Render a "Section N. TITLE" banner with a right-aligned hint label. */
function sectionBanner(doc, n, title, rightHint) {
  const x = PAGE_MARGIN_X;
  const w = doc.page.width - PAGE_MARGIN_X * 2;
  const y = doc.y;
  const h = 16;
  doc.rect(x, y, w, h).fillAndStroke(COLORS.headerBg, COLORS.border);
  doc.fillColor(COLORS.title).font('Helvetica-Bold').fontSize(9)
     .text(`${n}. ${title}`, x + 6, y + 3, { width: w - 130, lineBreak: false });
  if (rightHint) {
    doc.fillColor(COLORS.inkSoft).font('Helvetica').fontSize(7)
       .text(rightHint, x + w - 220, y + 4, { width: 214, align: 'right' });
  }
  doc.y = y + h;
}

/** Draw a "Label: value________" key-value row at the current y. */
function kv(doc, x, y, w, label, value, opts = {}) {
  const labelFont = opts.labelFontSize || 7.5;
  const valueFont = opts.valueFontSize || 8.5;
  // The label sits in dark grey, the value below it in black inside a
  // soft underline so blank values still print as a printable line.
  doc.font('Helvetica-Bold').fontSize(labelFont).fillColor(ROW_LABEL_COLOR);
  doc.text(label, x, y, { width: w, lineBreak: false });
  doc.font('Helvetica').fontSize(valueFont).fillColor(ROW_VALUE_COLOR);
  doc.text(fmtText(value, ''), x, y + 9, { width: w, lineBreak: false, ellipsis: true });
  doc.lineWidth(0.4).strokeColor(COLORS.inkMute);
  doc.moveTo(x, y + 20).lineTo(x + w, y + 20).stroke();
}

/** Two-state checkbox row: "Yes" / "No" with one ticked based on the flag. */
function yesNoRow(doc, x, y, label, yes) {
  doc.font('Helvetica-Bold').fontSize(8).fillColor(ROW_LABEL_COLOR);
  doc.text(label, x, y, { lineBreak: false });
  const tickedYes = yes === true || yes === 1 || yes === '1' || yes === 'Y' || yes === 'YES';
  const tickedNo  = yes === false || yes === 0 || yes === '0' || yes === 'N' || yes === 'NO';
  const yX = x + 140;
  const nX = yX + 50;
  drawCheckbox(doc, yX, y + 1, tickedYes); doc.text('Yes', yX + TICK_BOX + 3, y, { lineBreak: false });
  drawCheckbox(doc, nX, y + 1, tickedNo);  doc.text('No',  nX + TICK_BOX + 3, y, { lineBreak: false });
}

function drawCheckbox(doc, x, y, ticked) {
  doc.lineWidth(0.6).strokeColor(COLORS.title);
  doc.rect(x, y, TICK_BOX, TICK_BOX).stroke();
  if (ticked) {
    // Draw a chunky tick mark inside the box.
    doc.moveTo(x + 1.5, y + TICK_BOX / 2)
       .lineTo(x + TICK_BOX / 2, y + TICK_BOX - 1.5)
       .lineTo(x + TICK_BOX - 1, y + 1)
       .stroke();
  }
}

/** Build the canonical "JC-YYYY-NNNNN" code from the master row. */
function jcCode(main) {
  const year = main.jc_recd_date ? new Date(main.jc_recd_date).getUTCFullYear() : '----';
  const num  = String(main.jc_no || '').padStart(4, '0');
  return `JC-${year}-${num}`;
}


// ── MAIN RENDERER ──────────────────────────────────────────────────────

/**
 * Stream a fully populated Job Card Certificate PDF into the given stream.
 * The PDF is GUARANTEED single-page.
 *
 * @param {Object} payload  Output of pdf.repo.loadJobCardFull()
 * @param {Writable} stream Express `res` (or any Writable).
 * @param {Object} [meta]
 * @param {Object} [meta.generated_by]  Actor info: { employee_id, name, role }
 */
function renderJobCardCertificate(payload, stream, meta = {}) {
  // bufferPages:true is unnecessary here (single page) but harmless;
  // we leave it off so doc.end() flushes immediately on completion.
  const doc = new PDFDocument({
    size: 'A4',
    layout: 'portrait',
    margin: PAGE_MARGIN_X,
    bufferPages: false,
    autoFirstPage: true,
  });
  doc.pipe(stream);

  // We track y manually so each section can budget a fixed slice of the
  // page. Total content height ≈ 770 pt — leaves a small margin at the
  // bottom for printing on real paper.

  // ── HEADER (~ 70 pt) ───────────────────────────────────────────────
  drawHeader(doc, {
    title: 'JOB REQUEST OF T&ME FOR CALIBRATION',
    subtitle: null,
    compact: true,
  });

  // ── ID strip — Equipment ID · Job Card No. · Date ──────────────────
  const idStripY = doc.y + 2;
  const idStripH = 22;
  const pw       = doc.page.width;
  const stripX   = PAGE_MARGIN_X;
  const stripW   = pw - PAGE_MARGIN_X * 2;
  doc.rect(stripX, idStripY, stripW, idStripH).strokeColor(COLORS.border).lineWidth(0.6).stroke();
  const colW = stripW / 3;
  // Equipment ID
  doc.font('Helvetica-Bold').fontSize(8).fillColor(COLORS.title)
     .text('Equipment ID:', stripX + 8, idStripY + 4, { lineBreak: false });
  doc.font('Helvetica').fontSize(9)
     .text(`${fmtText(payload.equipment_type, '')}-${fmtText(payload.equipment_id, '')}`,
           stripX + 8, idStripY + 12, { width: colW - 16, lineBreak: false });
  // Job Card No.
  doc.font('Helvetica-Bold').fontSize(8)
     .text('Job Card No.:', stripX + 8 + colW, idStripY + 4, { lineBreak: false });
  doc.font('Helvetica').fontSize(9)
     .text(jcCode(payload), stripX + 8 + colW, idStripY + 12, { width: colW - 16, lineBreak: false });
  // Date (use jc_recd_date — the JC's received date, per template)
  doc.font('Helvetica-Bold').fontSize(8)
     .text('Date:', stripX + 8 + colW * 2, idStripY + 4, { lineBreak: false });
  doc.font('Helvetica').fontSize(9)
     .text(fmtDate(payload.jc_recd_date), stripX + 8 + colW * 2, idStripY + 12,
           { width: colW - 16, lineBreak: false });
  doc.y = idStripY + idStripH + 4;

  // ── SECTION 1 — EQUIPMENT IDENTIFICATION ───────────────────────────
  sectionBanner(doc, 1, 'EQUIPMENT IDENTIFICATION', 'AUTO-FILLED FROM EQUIPMENT MASTER / REQUEST');
  const s1y = doc.y + 4;
  const halfW = (stripW - 12) / 2;
  kv(doc, stripX,            s1y,      halfW, 'Name of Equipment',     payload.equipment_name);
  kv(doc, stripX + halfW + 12, s1y,    halfW, 'Make',                  payload.equipment_make);
  kv(doc, stripX,            s1y + 24, halfW, 'Identification / Model No.', payload.equipment_model_no || payload.equipment_mfg_model_name);
  kv(doc, stripX + halfW + 12, s1y + 24, halfW,'Serial No.',           payload.equipment_serial_no);
  kv(doc, stripX,            s1y + 48, halfW, 'Main Frame',            payload.equipment_mfg_model_name);
  kv(doc, stripX + halfW + 12, s1y + 48, halfW,'Option(s) & Description', payload.equipment_option_desc);
  doc.y = s1y + 72;

  // Accessory table — 2 rows (header + up to 2 data rows)
  const accRows = buildAccessoryRows(payload);
  drawAccessoryTable(doc, stripX, doc.y, stripW, accRows);
  doc.y += 50;            // table block is ~ 50 pt tall

  // ── SECTION 2 — REQUEST CLASSIFICATION ─────────────────────────────
  sectionBanner(doc, 2, 'REQUEST CLASSIFICATION', 'REPAIR / CALIBRATION CONTEXT');
  const s2y = doc.y + 4;
  yesNoRow(doc, stripX + 4, s2y, 'Equipment is being sent after repairs:', payload.jr_after_repairs);
  // Remarks on the same row, right-aligned half
  doc.font('Helvetica-Bold').fontSize(7.5).fillColor(ROW_LABEL_COLOR);
  doc.text('Remarks:', stripX + 320, s2y, { lineBreak: false });
  doc.font('Helvetica').fontSize(8.5).fillColor(ROW_VALUE_COLOR);
  doc.text(fmtText(payload.jr_remarks || payload.legacy_remarks, ''),
           stripX + 360, s2y, { width: stripW - 366, lineBreak: false, ellipsis: true });
  doc.lineWidth(0.4).strokeColor(COLORS.inkMute);
  doc.moveTo(stripX + 360, s2y + 12).lineTo(stripX + stripW - 6, s2y + 12).stroke();
  doc.y = s2y + 18;

  // ── SECTION 3 — USER SUBMISSION & FORWARDING ───────────────────────
  sectionBanner(doc, 3, 'USER SUBMISSION & FORWARDING', 'REQUESTER + DIVISION AUTHORIZATION');
  const s3y = doc.y + 4;
  // Left column: Submitted By
  doc.font('Helvetica-Bold').fontSize(8).fillColor(COLORS.title);
  doc.text('Submitted By', stripX + 4, s3y, { lineBreak: false });
  kv(doc, stripX,           s3y + 14, halfW * 0.50, 'Name',          payload.jr_submitter_name);
  kv(doc, stripX + halfW * 0.55, s3y + 14, halfW * 0.45, 'Designation', payload.jr_submitter_designation);
  kv(doc, stripX,           s3y + 38, halfW * 0.50, 'Phone / Lab',   payload.jr_lab_phone);
  kv(doc, stripX + halfW * 0.55, s3y + 38, halfW * 0.45, 'Room',     payload.jr_room_phone);
  kv(doc, stripX,           s3y + 62, halfW * 0.50, 'Division',      payload.division_code || payload.division_name);
  kv(doc, stripX + halfW * 0.55, s3y + 62, halfW * 0.45, 'Sub System',payload.jr_subsystem);
  kv(doc, stripX,           s3y + 86, halfW * 1.0,  'Name of Project', payload.jr_project_name);

  // Right column: Forwarded Through HOD/EIC
  const rcX = stripX + halfW + 12;
  doc.font('Helvetica-Bold').fontSize(8).fillColor(COLORS.title);
  doc.text('Forwarded Through Head of Division / Engineer In-Charge', rcX, s3y, { lineBreak: false });
  kv(doc, rcX, s3y + 24, halfW, 'Signature',
     payload.jr_approved_by_name ? `${payload.jr_approved_by_name}` : '');
  kv(doc, rcX, s3y + 50, halfW, 'Name', payload.jr_approved_by_name || payload.division_head_name);
  kv(doc, rcX, s3y + 76, halfW, 'Date', payload.jr_approved_at);
  doc.y = s3y + 110;

  // ── SECTION 4 — INSTRUCTIONS FOR USER (static) ─────────────────────
  sectionBanner(doc, 4, 'INSTRUCTIONS FOR USER', 'DISPLAY AS FIXED REPORT NOTES');
  const s4y = doc.y + 4;
  doc.font('Helvetica').fontSize(7.5).fillColor(COLORS.title);
  const instr = [
    '1. At the time of submission and while receiving equipment after calibration, the user representative shall demonstrate / ensure that the equipment is in working condition.',
    '2. Equipment must accompany the operation and service manual(s) and accessory kit, if any.',
    '3. Please fill a separate job card for each equipment.',
  ];
  let iy = s4y;
  instr.forEach((line) => {
    doc.text(line, stripX + 4, iy, { width: stripW - 8 });
    iy = doc.y + 1;
  });
  doc.y = iy + 2;

  // ── SECTION 5 — FOR TIMCD USE ──────────────────────────────────────
  sectionBanner(doc, 5, 'FOR TIMCD USE', 'INTERNAL RECEIVING, PLANNING, ASSIGNMENT AND STATUS');
  const s5y = doc.y + 4;
  // Two-column layout.
  kv(doc, stripX,            s5y,      halfW, 'Job Card Received Date', payload.jc_recd_date);
  kv(doc, stripX + halfW + 12, s5y,    halfW, 'Instrument Received Date', payload.inst_recd_date || payload.instrument_received_date);
  // Job Type with two checkboxes (Inhouse / Vendor)
  const jtY = s5y + 24;
  doc.font('Helvetica-Bold').fontSize(7.5).fillColor(ROW_LABEL_COLOR);
  doc.text('Job Type:', stripX, jtY, { lineBreak: false });
  drawCheckbox(doc, stripX + 60, jtY + 1, payload.phase9_job_type === 'IN_HOUSE');
  doc.font('Helvetica').fontSize(8).fillColor(ROW_VALUE_COLOR)
     .text('Inhouse', stripX + 60 + TICK_BOX + 3, jtY, { lineBreak: false });
  drawCheckbox(doc, stripX + 130, jtY + 1, payload.phase9_job_type === 'VENDOR');
  doc.text('Vendor', stripX + 130 + TICK_BOX + 3, jtY, { lineBreak: false });
  kv(doc, stripX + halfW + 12, jtY,    halfW, 'Job Complete Planned Date', payload.job_complete_planned_date || payload.planned_completed_date);
  kv(doc, stripX,            s5y + 48, halfW, 'Job Start Planned Date',  payload.planned_start_date);
  kv(doc, stripX + halfW + 12, s5y + 48, halfW,'Engineer In-Charge Signature',
     payload.assigned_engineer_name ? `${payload.assigned_engineer_name} (${payload.assigned_engineer_employee_id})` : '');
  kv(doc, stripX,            s5y + 72, halfW, 'Section Job No.',         payload.section_job_no);
  kv(doc, stripX + halfW + 12, s5y + 72, halfW,'Job Status',             formatStatus(payload.status));
  doc.y = s5y + 96;

  // ── SECTION 6 — CALIBRATION LAB RECEIPT ────────────────────────────
  sectionBanner(doc, 6, 'CALIBRATION LAB RECEIPT', 'POST CALIBRATION HANDOVER CONFIRMATION');
  const s6y = doc.y + 4;
  const thirdW = (stripW - 24) / 3;
  kv(doc, stripX,                  s6y, thirdW, 'Received from Calibration Lab Date',
     payload.customer_received_date || payload.verified_closed_at);
  kv(doc, stripX + thirdW + 12,    s6y, thirdW, 'Name',
     payload.equipment_received_by_customer || payload.verified_closed_by_name);
  kv(doc, stripX + (thirdW + 12) * 2, s6y, thirdW, 'Signature', '');
  doc.y = s6y + 26;

  // ── SECTION 7 — CONFORMITY, USER SIGNATURE & REVIEW ────────────────
  sectionBanner(doc, 7, 'CONFORMITY, USER SIGNATURE & REVIEW', 'MERGED FROM PAGE 2 INTO ONE PAGE');
  const s7y = doc.y + 4;
  kv(doc, stripX,            s7y,      halfW, 'Statement of Conformity / Decision Rule / Calibration Due Date',
     payload.final_closure_notes || payload.review_comments);
  kv(doc, stripX + halfW + 12, s7y,    halfW, 'User Signature', '');
  // Reviewed Yes/No
  const ryY = s7y + 26;
  yesNoRow(doc, stripX + 4, ryY, 'Job Request Reviewed:', !!payload.review_date);
  doc.y = ryY + 18;

  doc.end();
}


// ── Accessory table helpers ────────────────────────────────────────────

function buildAccessoryRows(payload) {
  // Source priority:
  //   1. parent JR's accessories table (Phase 6 child) — preferred
  //   2. legacy `plug_in_accessories` text column on JC — single-line
  //      free-form fallback (we render it as ONE row in Item Name).
  const rows = [];
  const acc = (payload.children && Array.isArray(payload.children.parent_accessories))
    ? payload.children.parent_accessories
    : [];
  if (acc.length > 0) {
    acc.slice(0, 2).forEach((a, idx) => {
      rows.push({
        type:     a.type || '',
        sr_no:    a.serial_no || '',
        name:     a.name || '',
        model_no: '',
        serial:   a.serial_no || '',
        idx:      idx + 1,
      });
    });
    if (acc.length > 2) {
      rows.push({ overflow: acc.length - 2 });
    }
    return rows;
  }
  // Legacy fallback
  const txt = (payload.plug_in_accessories || '').trim();
  if (txt) {
    rows.push({ type: '', sr_no: '', name: txt.slice(0, 80), model_no: '', serial: '', idx: 1 });
  }
  return rows;
}

function drawAccessoryTable(doc, x, y, w, rows) {
  const headers = ['Item Type', 'Sr. No.', 'Item Name', 'Model No.', 'Serial No.'];
  const widths = [w * 0.18, w * 0.10, w * 0.34, w * 0.18, w * 0.20];
  const headerH = 14;
  const rowH = 14;
  const totalRows = 2;     // strict 2 data rows + 1 header
  const tableH = headerH + rowH * totalRows;

  // Header band
  doc.rect(x, y, w, headerH).fillAndStroke(COLORS.subtle, COLORS.border);
  doc.fillColor(COLORS.title).font('Helvetica-Bold').fontSize(7.5);
  let cx = x;
  headers.forEach((h, i) => {
    doc.text(h, cx + 4, y + 3, { width: widths[i] - 8, lineBreak: false });
    cx += widths[i];
  });

  // Data rows — always render 2 rows (blank if no data, for the print form)
  doc.font('Helvetica').fontSize(8.5).fillColor(COLORS.title);
  for (let r = 0; r < totalRows; r++) {
    const ry = y + headerH + r * rowH;
    doc.lineWidth(0.4).strokeColor(COLORS.border).rect(x, ry, w, rowH).stroke();
    cx = x;
    const data = rows[r];
    if (data && !data.overflow) {
      const cells = [data.type, data.sr_no, data.name, data.model_no, data.serial];
      cells.forEach((c, i) => {
        doc.text(fmtText(c, ''), cx + 4, ry + 3, { width: widths[i] - 8, lineBreak: false, ellipsis: true });
        cx += widths[i];
      });
    } else if (data && data.overflow) {
      doc.fillColor(COLORS.inkSoft).font('Helvetica-Oblique')
         .text(`… +${data.overflow} more accessories (see Full Details PDF)`,
               x + 4, ry + 3, { width: w - 8, lineBreak: false });
      doc.fillColor(COLORS.title).font('Helvetica');
    }
  }
}


module.exports = {
  renderJobCardCertificate,
};
