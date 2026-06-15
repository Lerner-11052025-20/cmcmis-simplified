// ============================================================================
// src/modules/pdf/templates/tmeCalibrationJrf/tmeCalibrationJrf.js
// ----------------------------------------------------------------------------
// Dedicated Job Request Form PDF for ONLY T&ME Calibration job requests.
// Mirrors reports PDFs/latex/T&ME_Calibration_JRF.tex as a fixed one-page
// A4 form and fills all available values from pdf.repo.loadJobRequestFull().
// ============================================================================

'use strict';

const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const { COLORS, fmtDate, fmtText } = require('../_isroHeader');

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

const M = 34;
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const CONTENT_W = PAGE_W - M * 2;
const SECTION_BG = '#ebeef2';
const LINE = '#111111';
const PAGE_TOP_Y = 34;
const FOOTER_Y = PAGE_H - 50;
const CONTENT_BOTTOM_Y = FOOTER_Y - 12;

function assetPath(filename) {
  const candidates = [
    path.resolve(__dirname, '..', '..', '..', '..', 'assets', filename),
    path.resolve(__dirname, '..', '..', '..', '..', '..', '..', 'reports PDFs', 'logo', filename),
  ];
  return candidates.find((p) => {
    try { return fs.existsSync(p); } catch { return false; }
  }) || null;
}

const ISRO_LOGO = assetPath('isro-logo.png');
const SAC_LOGO = assetPath('sac-logo.png');

function jrCode(payload) {
  const d = payload.created_at || payload.submitted_at_legacy;
  const year = d ? new Date(d).getUTCFullYear() : '----';
  return `JR-${year}-${String(payload.jr_no || '').padStart(4, '0')}`;
}

function longDate(d) {
  if (!d) return '';
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return '';
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  return `${String(dt.getUTCDate()).padStart(2, '0')}-${months[dt.getUTCMonth()]}-${dt.getUTCFullYear()}`;
}

function dateText(d) {
  const s = fmtDate(d, '');
  return s === '-' ? '' : s;
}

function clean(v) {
  return fmtText(v, '');
}

function equipmentId(p) {
  const parts = [p.equipment_type, p.equipment_id].map(clean).filter(Boolean);
  return parts.join('-');
}

function boolText(v) {
  if (v === true || v === 1 || v === '1' || String(v).toUpperCase() === 'Y' || String(v).toUpperCase() === 'YES') return 'Yes';
  if (v === false || v === 0 || v === '0' || String(v).toUpperCase() === 'N' || String(v).toUpperCase() === 'NO') return 'No';
  return '';
}

function cell(doc, x, y, w, h, text = '', opts = {}) {
  doc.lineWidth(0.45).strokeColor(LINE).rect(x, y, w, h).stroke();
  if (opts.fill) {
    doc.save().rect(x, y, w, h).fill(opts.fill).restore();
    doc.lineWidth(0.45).strokeColor(LINE).rect(x, y, w, h).stroke();
  }
  const pad = opts.pad ?? 3;
  const font = opts.bold ? 'Helvetica-Bold' : 'Helvetica';
  doc.font(font).fontSize(opts.size || 8).fillColor(COLORS.title);
  doc.text(clean(text), x + pad, y + (opts.valign === 'center' ? Math.max(2, (h - (opts.size || 8)) / 2 - 1) : 3), {
    width: w - pad * 2,
    height: h - 4,
    align: opts.align || 'left',
    ellipsis: true,
    lineBreak: true,
  });
}

function labelValueRow(doc, x, y, specs, h = 18) {
  let cx = x;
  specs.forEach((s) => {
    cell(doc, cx, y, s.lw, h, s.label, { bold: true, size: s.labelSize || 7.4 });
    cell(doc, cx + s.lw, y, s.vw, h, s.value, { size: s.valueSize || 7.8 });
    cx += s.lw + s.vw;
  });
}

function sectionTitle(doc, title, y) {
  doc.save().rect(M, y, CONTENT_W, 14).fill(SECTION_BG).restore();
  doc.font('Helvetica-Bold').fontSize(8.5).fillColor(COLORS.title);
  doc.text(title, M + 4, y + 3, { width: CONTENT_W - 8, lineBreak: false });
  return y + 16;
}

function header(doc, title, subtitle) {
  const y = 24;
  if (ISRO_LOGO) {
    doc.image(ISRO_LOGO, M + 2, y, { fit: [60, 52], align: 'center', valign: 'center' });
  }
  if (SAC_LOGO) {
    doc.image(SAC_LOGO, PAGE_W - M - 62, y + 2, { fit: [60, 48], align: 'center', valign: 'center' });
  }

  const cx = M + 70;
  const cw = CONTENT_W - 140;
  doc.font('Helvetica-Bold').fontSize(14).fillColor(COLORS.title)
    .text('SPACE APPLICATIONS CENTRE', cx, y + 2, { width: cw, align: 'center' });
  doc.font('Helvetica-Bold').fontSize(11)
    .text('TIMCD', cx, y + 22, { width: cw, align: 'center' });
  doc.font('Helvetica-Bold').fontSize(13)
    .text(title, cx, y + (subtitle ? 39 : 43), { width: cw, align: 'center' });
  if (subtitle) {
    doc.font('Helvetica').fontSize(9).fillColor(COLORS.title)
      .text(subtitle, cx, y + 57, { width: cw, align: 'center' });
  }

  doc.moveTo(M, y + 70).lineTo(PAGE_W - M, y + 70).strokeColor(LINE).lineWidth(0.6).stroke();
  return y + 78;
}

function instructionBox(doc, y, lines, title = 'Instructions for User:') {
  const h = Math.max(36, 18 + lines.length * 13 + 10);
  doc.save().rect(M, y, CONTENT_W, h).fillAndStroke(SECTION_BG, LINE).restore();
  doc.font('Helvetica-Bold').fontSize(8).fillColor(COLORS.title)
    .text(title, M + 6, y + 5);
  doc.font('Helvetica').fontSize(7.3);
  let yy = y + 18;
  lines.forEach((line) => {
    doc.text(line, M + 10, yy, { width: CONTENT_W - 20, height: 12, ellipsis: true });
    yy += 13;
  });
  return y + h + 5;
}

function drawFooter(doc, payload, y, pageNo, totalPages) {
  const footerY = y;
  const code = jrCode(payload);
  doc.moveTo(M, footerY).lineTo(PAGE_W - M, footerY).strokeColor(LINE).lineWidth(0.6).stroke();
  doc.font('Helvetica').fontSize(6.8).fillColor(COLORS.title);
  const revised = longDate(payload.created_at || payload.submitted_at_legacy);
  const footerText = [
    `Document No. ${code}`,
    `Revised on ${revised}`,
    'Job Request Format TIMCD JRF-01',
    `Page ${pageNo} of ${totalPages}`,
    'SAC, ISRO, Ahmedabad',
  ].join('     ');
  doc.text(footerText, M, footerY + 8, {
    width: CONTENT_W,
    align: 'left',
    lineBreak: false,
    ellipsis: true,
  });
}

function drawAccessories(doc, y, rows) {
  const headers = ['Item Type', 'Item Name', 'Serial No.'];
  const widths = [130, 300, CONTENT_W - 130 - 300];
  const rowH = 18;
  let cx = M;
  headers.forEach((h, i) => {
    cell(doc, cx, y, widths[i], rowH, h, { bold: true, size: 7.4 });
    cx += widths[i];
  });

  rows.forEach((item, r) => {
    cx = M;
    const values = [
      item.type,
      item.name,
      item.serial_no,
    ];
    values.forEach((v, i) => {
      cell(doc, cx, y + rowH * (r + 1), widths[i], rowH, v, { size: 7.5 });
      cx += widths[i];
    });
  });

  return y + rowH * (rows.length + 1) + 4;
}

function drawAccessoryHeader(doc, y) {
  const headers = ['Item Type', 'Item Name', 'Serial No.'];
  const widths = [130, 300, CONTENT_W - 130 - 300];
  let cx = M;
  headers.forEach((h, i) => {
    cell(doc, cx, y, widths[i], 18, h, { bold: true, size: 7.4 });
    cx += widths[i];
  });
  return y + 18;
}

function drawAccessoryRow(doc, y, item) {
  const widths = [130, 300, CONTENT_W - 130 - 300];
  const values = [item.type, item.name, item.serial_no];
  let cx = M;
  values.forEach((v, i) => {
    cell(doc, cx, y, widths[i], 18, v, { size: 7.5 });
    cx += widths[i];
  });
  return y + 18;
}

function renderTmeJrf(payload, stream, config) {
  const doc = new PDFDocument({
    size: 'A4',
    margin: M,
    bufferPages: true,
    autoFirstPage: true,
  });
  doc.pipe(stream);

  function newContentPage() {
    doc.addPage();
    return PAGE_TOP_Y;
  }

  function ensureSpace(yPos, neededHeight) {
    return yPos + neededHeight > CONTENT_BOTTOM_Y ? newContentPage() : yPos;
  }

  let y = header(doc, config.title, config.subtitle);

  y = ensureSpace(y, 25);
  labelValueRow(doc, M, y, [
    { label: 'Equipment ID', value: equipmentId(payload), lw: 84, vw: CONTENT_W - 84 },
  ], 20);
  y += 25;

  if (config.equipmentLayout === 'fpe') {
    y = ensureSpace(y, 16 + 18 * 2 + 23);
    y = sectionTitle(doc, config.equipmentSectionTitle || 'EQUIPMENT DETAILS', y);
    labelValueRow(doc, M, y, [
      { label: 'Name of Equipment', value: payload.equipment_name, lw: 106, vw: 190 },
      { label: 'Make', value: payload.make, lw: 52, vw: CONTENT_W - 106 - 190 - 52 },
    ]);
    y += 18;
    labelValueRow(doc, M, y, [
      { label: 'Model No.', value: payload.model_no, lw: 78, vw: 218 },
      { label: 'Serial No.', value: payload.serial_no, lw: 70, vw: CONTENT_W - 78 - 218 - 70 },
    ]);
    y += 23;
  } else {
    y = ensureSpace(y, 16 + 18 * 3 + 23);
    y = sectionTitle(doc, config.equipmentSectionTitle || 'EQUIPMENT INFORMATION', y);
    labelValueRow(doc, M, y, [
      { label: 'Name of Equipment', value: payload.equipment_name, lw: 106, vw: 190 },
      { label: 'Make', value: payload.make, lw: 52, vw: CONTENT_W - 106 - 190 - 52 },
    ]);
    y += 18;
    labelValueRow(doc, M, y, [
      { label: 'Identification of Equipment', value: payload.equipment_id, lw: 130, vw: 166 },
      { label: 'Option(s) & Description', value: payload.options_description, lw: 118, vw: CONTENT_W - 130 - 166 - 118 },
    ]);
    y += 18;
    labelValueRow(doc, M, y, [
      { label: 'Model No.', value: payload.model_no, lw: 78, vw: 218 },
      { label: 'Serial No.', value: payload.serial_no, lw: 70, vw: CONTENT_W - 78 - 218 - 70 },
    ]);
    y += 23;
  }

  if (config.showAccessories !== false) {
    y = ensureSpace(y, 16 + 18);
    y = sectionTitle(doc, 'ACCESSORIES / ATTACHMENTS', y);
    y = drawAccessoryHeader(doc, y);
    (payload.children?.accessories || []).forEach((item) => {
      if (y + 18 > CONTENT_BOTTOM_Y) {
        y = newContentPage();
        y = sectionTitle(doc, 'ACCESSORIES / ATTACHMENTS (CONTINUED)', y);
        y = drawAccessoryHeader(doc, y);
      }
      y = drawAccessoryRow(doc, y, item);
    });
    y += 4;
  }

  if (config.systemInformation) {
    y = ensureSpace(y, 16 + 25 * 2 + 23);
    y = sectionTitle(doc, 'SYSTEM INFORMATION', y);
    labelValueRow(doc, M, y, [
      { label: 'Present System Status', value: config.systemStatusValue || '', lw: 130, vw: CONTENT_W - 130 },
    ], 25);
    y += 25;
    labelValueRow(doc, M, y, [
      { label: 'Complaints / Symptoms', value: payload.complaint_description, lw: 130, vw: CONTENT_W - 130 },
    ], 25);
    y += 30;
  }

  if (config.kind === 'calibration') {
    y = ensureSpace(y, 16 + 18 + 23);
    y = sectionTitle(doc, 'CALIBRATION INFORMATION', y);
    labelValueRow(doc, M, y, [
      { label: 'Equipment is being sent after Repairs', value: boolText(payload.equipment_sent_after_repair), lw: 190, vw: CONTENT_W - 190 },
    ]);
    y += 23;
  } else if (!config.systemInformation) {
    y = ensureSpace(y, 16 + 25 + 23);
    y = sectionTitle(doc, 'COMPLAINT DETAILS', y);
    labelValueRow(doc, M, y, [
      { label: 'Complaints / Symptoms', value: payload.complaint_description, lw: 130, vw: CONTENT_W - 130 },
    ], 25);
    y += 30;
  }

  y = ensureSpace(y, 16 + 24 + 18 + 18 + 90 + 6);
  y = sectionTitle(doc, 'REQUEST DETAILS', y);
  const colW = CONTENT_W / 2;
  cell(doc, M, y, colW, 24, 'SUBMITTED BY', { fill: SECTION_BG, bold: true, size: 8, align: 'center', valign: 'center' });
  cell(doc, M + colW, y, colW, 24, 'APPROVAL\nForwarded through Head of Division / Engineer In-Charge', {
    fill: SECTION_BG, bold: true, size: 7.6, align: 'center', valign: 'center',
  });
  y += 24;

  const leftLabel = 78;
  const rightLabel = 58;
  const leftValue = colW - leftLabel;
  const rightValue = colW - rightLabel;
  const approvalName = payload.approved_by_name || payload.division_head_name || '';
  labelValueRow(doc, M, y, [
    { label: 'Name', value: payload.submitted_by_name, lw: leftLabel, vw: leftValue },
    { label: 'Name', value: approvalName, lw: rightLabel, vw: rightValue },
  ], 18);
  y += 18;
  labelValueRow(doc, M, y, [
    { label: 'Designation', value: payload.submitted_by_designation, lw: leftLabel, vw: leftValue },
    { label: 'Date', value: dateText(payload.approved_at), lw: rightLabel, vw: rightValue },
  ], 18);
  y += 18;
  const sigH = 90;
  const approvalX = M + colW;
  const sigLabelW = 70;
  const submitRows = [
    ['Phone (Lab)', payload.lab_phone],
    ['Room No.', payload.room_phone],
    ['Division', payload.division_code || payload.division_name],
    ['Sub-System', payload.subsystem],
    [config.projectLabel || 'Name of Project', payload.project_name],
  ];
  submitRows.forEach(([label, value], i) => {
    labelValueRow(doc, M, y + i * 18, [{ label, value, lw: leftLabel, vw: leftValue }], 18);
  });
  cell(doc, approvalX, y, sigLabelW, sigH, 'Signature', { bold: true, size: 7.4, valign: 'center' });
  cell(doc, approvalX + sigLabelW, y, colW - sigLabelW, sigH, '', { size: 7.6 });
  y += sigH + 6;

  y = ensureSpace(y, Math.max(36, 18 + config.instructions.length * 13 + 10) + 5);
  y = instructionBox(doc, y, config.instructions, config.instructionTitle);

  y = ensureSpace(y, 16 + 18 * 5 + 23);
  y = sectionTitle(doc, 'FOR TIMCD USE ONLY', y);
  labelValueRow(doc, M, y, [
    { label: 'Job Card Received Date', value: dateText(payload.linked_job_card_received_date), lw: 118, vw: 148 },
    { label: 'Instrument Received Date', value: dateText(payload.linked_instrument_received_date), lw: 130, vw: CONTENT_W - 118 - 148 - 130 },
  ]);
  y += 18;
  labelValueRow(doc, M, y, [
    { label: 'Job Type', value: payload.linked_internal_job_type || payload.linked_job_card_workflow_type, lw: 78, vw: 188 },
    { label: 'Repair Type', value: payload.linked_repair_type, lw: 76, vw: CONTENT_W - 78 - 188 - 76 },
  ]);
  y += 18;
  labelValueRow(doc, M, y, [
    { label: 'Job Start Planned Date', value: dateText(payload.linked_job_start_planned_date), lw: 124, vw: 142 },
    { label: 'Job Complete Planned Date', value: dateText(payload.linked_job_complete_planned_date), lw: 136, vw: CONTENT_W - 124 - 142 - 136 },
  ]);
  y += 18;
  labelValueRow(doc, M, y, [
    { label: 'Section Job No.', value: payload.linked_job_card_section_no, lw: 92, vw: 174 },
    { label: config.engineerLabel || 'Engineer In-Charge', value: payload.linked_engineer_name || payload.assigned_engineer_name, lw: 104, vw: CONTENT_W - 92 - 174 - 104 },
  ]);
  y += 18;
  labelValueRow(doc, M, y, [
    { label: 'Job Status', value: payload.linked_job_status_display || formatStatus(payload.linked_job_card_status), lw: 78, vw: CONTENT_W - 78 },
  ]);
  y += 23;

  if (config.showReceipt !== false) {
    y = ensureSpace(y, 16 + 25 + 29 + 23 + 18);
    y = sectionTitle(doc, 'EQUIPMENT RECEIPT ACKNOWLEDGEMENT', y);
    cell(doc, M, y, CONTENT_W, 25, config.receiptText, { bold: true, size: 8 });
    y += 29;
    labelValueRow(doc, M, y, [
      { label: 'Date', value: dateText(payload.linked_customer_received_date), lw: 58, vw: 190 },
      { label: 'Signature', value: '', lw: 70, vw: CONTENT_W - 58 - 190 - 70 },
    ], 23);
    y += 23;
    labelValueRow(doc, M, y, [
      { label: 'Name', value: payload.linked_customer_received_by, lw: 58, vw: 190 },
      { label: '', value: '', lw: 70, vw: CONTENT_W - 58 - 190 - 70 },
    ], 18);
    y += 18;
  }

  const firstPageFooterY = y + 22;
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i += 1) {
    const pageNo = i - range.start + 1;
    const totalPages = range.count;
    const isLastPage = pageNo === totalPages;
    doc.switchToPage(i);
    drawFooter(
      doc,
      payload,
      isLastPage ? Math.min(firstPageFooterY, FOOTER_Y) : FOOTER_Y,
      pageNo,
      totalPages,
    );
  }
  doc.end();
}

function renderTmeCalibrationJrf(payload, stream) {
  renderTmeJrf(payload, stream, {
    kind: 'calibration',
    title: 'JOB REQUEST OF T&ME FOR CALIBRATION',
    instructionTitle: 'Instructions for User:',
    instructions: [
      "1. At the time of submission of equipment for calibration and receiving equipment after calibration, the user's representative shall demonstrate / ensure the equipment is in working condition.",
      '2. Equipment must accompany the operation and service manual(s) and accessory kit (if any).',
      '3. Please fill up a separate Job Card for each equipment.',
    ],
    receiptText: 'The Equipment is Received from Calibration Lab',
  });
}

module.exports = {
  renderTmeCalibrationJrf,
  renderTmeJrf,
};
