// ============================================================================
// src/modules/pdf/templates/tmeRepairJobClosingForm/tmeRepairJobClosingForm.js
// ----------------------------------------------------------------------------
// Dedicated Job Closing Form PDF for ONLY T&ME Repair job cards.
// Mirrors reports PDFs/latex/T&ME_Repair_JobClosingForm.tex with DB-backed
// rows, guarded pagination, official logos, and dynamic footer pages.
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

function clean(v) {
  return fmtText(v, '');
}

function dateText(d) {
  const s = fmtDate(d, '');
  return s === '-' ? '' : s;
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

function jcCode(payload) {
  const d = payload.jc_recd_date || payload.created_at;
  const year = d ? new Date(d).getUTCFullYear() : '----';
  return `JC-${year}-${String(payload.jc_no || '').padStart(4, '0')}`;
}

function equipmentId(payload) {
  return [payload.equipment_type, payload.equipment_id].map(clean).filter(Boolean).join('-');
}

function firstText(...values) {
  return values.map(clean).find(Boolean) || '';
}

function cell(doc, x, y, w, h, text = '', opts = {}) {
  doc.lineWidth(0.45).strokeColor(LINE).rect(x, y, w, h).stroke();
  if (opts.fill) {
    doc.save().rect(x, y, w, h).fill(opts.fill).restore();
    doc.lineWidth(0.45).strokeColor(LINE).rect(x, y, w, h).stroke();
  }
  const pad = opts.pad ?? 3;
  doc.font(opts.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(opts.size || 7.7).fillColor(COLORS.title);
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
    cell(doc, cx, y, s.lw, h, s.label, { bold: true, size: s.labelSize || 7.3 });
    cell(doc, cx + s.lw, y, s.vw, h, s.value, { size: s.valueSize || 7.6 });
    cx += s.lw + s.vw;
  });
}

function sectionTitle(doc, title, y, style = 'bar') {
  if (style === 'line') {
    doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.title);
    doc.text(title, M, y, { width: CONTENT_W, lineBreak: false });
    doc.moveTo(M, y + 13).lineTo(PAGE_W - M, y + 13).strokeColor(LINE).lineWidth(0.55).stroke();
    return y + 19;
  }
  doc.save().rect(M, y, CONTENT_W, 14).fill(SECTION_BG).restore();
  doc.font('Helvetica-Bold').fontSize(8.5).fillColor(COLORS.title);
  doc.text(title, M + 4, y + 3, { width: CONTENT_W - 8, lineBreak: false });
  return y + 16;
}

function header(doc, subtitle = 'T&ME REPAIR', drawRule = false) {
  const y = 24;
  if (ISRO_LOGO) doc.image(ISRO_LOGO, M + 2, y, { fit: [60, 52], align: 'center', valign: 'center' });
  if (SAC_LOGO) doc.image(SAC_LOGO, PAGE_W - M - 62, y + 2, { fit: [60, 48], align: 'center', valign: 'center' });

  const cx = M + 70;
  const cw = CONTENT_W - 140;
  doc.font('Helvetica-Bold').fontSize(14).fillColor(COLORS.title)
    .text('SPACE APPLICATIONS CENTRE', cx, y + 1, { width: cw, align: 'center' });
  doc.font('Helvetica-Bold').fontSize(11)
    .text('TIMCD', cx, y + 21, { width: cw, align: 'center' });
  doc.font('Helvetica-Bold').fontSize(13)
    .text('JOB CLOSURE REPORT', cx, y + 38, { width: cw, align: 'center' });
  doc.font('Helvetica').fontSize(9)
    .text(subtitle, cx, y + 56, { width: cw, align: 'center' });
  if (drawRule) {
    doc.moveTo(M, y + 74).lineTo(PAGE_W - M, y + 74).strokeColor(LINE).lineWidth(0.6).stroke();
    return y + 86;
  }
  return y + 76;
}

function drawFooter(doc, payload, y, pageNo, totalPages, formatText = 'Repair Closure Format') {
  doc.moveTo(M, y).lineTo(PAGE_W - M, y).strokeColor(LINE).lineWidth(0.6).stroke();
  doc.font('Helvetica').fontSize(6.8).fillColor(COLORS.title);
  const footerText = [
    `Document No. ${jcCode(payload)}`,
    `Revised on ${longDate(payload.created_at || payload.jc_recd_date)}`,
    formatText,
    `Page ${pageNo} of ${totalPages}`,
    'SAC, ISRO, Ahmedabad',
  ].join('     ');
  doc.text(footerText, M, y + 8, {
    width: CONTENT_W,
    align: 'left',
    lineBreak: false,
    ellipsis: true,
  });
}

function repairEquipmentText(rows) {
  return (rows || [])
    .map((r) => [r.equipment_id, r.equipment_name].map(clean).filter(Boolean).join(' - '))
    .filter(Boolean)
    .join(', ');
}

function drawDeviceHeader(doc, y, quantityLabel = 'Quantity') {
  const widths = [34, 238, 96, 70, CONTENT_W - 34 - 238 - 96 - 70];
  const headers = ['Sr. No.', 'Description', 'Part No.', quantityLabel, 'Cost (Rs.)'];
  let cx = M;
  headers.forEach((h, i) => {
    cell(doc, cx, y, widths[i], 20, h, { bold: true, size: 7 });
    cx += widths[i];
  });
  return y + 20;
}

function drawDeviceRow(doc, y, row, index) {
  const widths = [34, 238, 96, 70, CONTENT_W - 34 - 238 - 96 - 70];
  const values = [
    row.sr_no || index + 1,
    row.part_description || row.spare_type || row.description,
    row.part_no,
    row.quantity,
    row.cost,
  ];
  let cx = M;
  values.forEach((v, i) => {
    cell(doc, cx, y, widths[i], 24, v, { size: 6.9, align: i === 0 || i >= 3 ? 'center' : 'left' });
    cx += widths[i];
  });
  return y + 24;
}

function renderTmeRepairJobClosingForm(payload, stream, options = {}) {
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

  const sectionStyle = options.sectionStyle || 'bar';
  const showCalLabRows = options.showCalLabRows !== false;
  const showEquipmentUsed = options.showEquipmentUsed !== false;
  const showUserAcceptance = options.showUserAcceptance === true;

  let y = header(doc, options.subtitle || 'T&ME REPAIR', options.headerRule === true);
  y = ensureSpace(y, 18 * 3 + 10);
  labelValueRow(doc, M, y, [
    { label: 'Job Card No.', value: jcCode(payload), lw: 86, vw: 166 },
    { label: 'Equipment ID', value: equipmentId(payload), lw: 84, vw: CONTENT_W - 86 - 166 - 84 },
  ]);
  y += 18;
  labelValueRow(doc, M, y, [
    { label: 'Equipment Name', value: payload.equipment_name, lw: 100, vw: 184 },
    { label: 'Section Job No.', value: payload.section_job_no, lw: 100, vw: CONTENT_W - 100 - 184 - 100 },
  ]);
  y += 18;
  labelValueRow(doc, M, y, [
    { label: 'Division / Project', value: [payload.division_code || payload.division_name, payload.jr_project_name].map(clean).filter(Boolean).join(' / '), lw: 106, vw: CONTENT_W - 106 },
  ]);
  y += 22;

  y = ensureSpace(y, 16 + 18 * (showCalLabRows ? 4 : 3) + 6);
  y = sectionTitle(doc, 'REPAIR SUMMARY', y, sectionStyle);
  labelValueRow(doc, M, y, [
    { label: 'Job Started Date', value: dateText(payload.repair_job_start_planned_date || payload.job_start_date || payload.planned_start_date), lw: 104, vw: 154 },
    { label: 'Job Completed Date', value: dateText(payload.repair_job_complete_date || payload.job_end_date || payload.actual_completion_date), lw: 116, vw: CONTENT_W - 104 - 154 - 116 },
  ]);
  y += 18;
  labelValueRow(doc, M, y, [
    { label: 'Repair Status', value: formatStatus(firstText(payload.repair_status, payload.job_status_display, payload.status)), lw: 92, vw: 166 },
    { label: 'Reason For Not Repaired', value: payload.repair_not_repairable_reason, lw: 136, vw: CONTENT_W - 92 - 166 - 136 },
  ]);
  y += 18;
  if (showCalLabRows) {
    labelValueRow(doc, M, y, [
      { label: 'Equipment Received From CAL Lab', value: payload.repair_equipment_received_from_cal_lab, lw: 170, vw: 88 },
      { label: 'Sent To CAL Lab Date', value: dateText(payload.repair_sent_to_cal_lab_on), lw: 126, vw: CONTENT_W - 170 - 88 - 126 },
    ]);
    y += 18;
  }
  labelValueRow(doc, M, y, [
    { label: 'Attended By', value: firstText(payload.repair_attended_by_name, payload.repair_attended_by_employee_id, payload.attended_by, payload.assigned_engineer_name), lw: 86, vw: CONTENT_W - 86 },
  ]);
  y += 24;

  y = ensureSpace(y, 16 + 24 * 2 + 18 * 2 + 6);
  y = sectionTitle(doc, 'FAULT ANALYSIS', y, sectionStyle);
  labelValueRow(doc, M, y, [
    { label: 'Fault Description', value: firstText(payload.repair_fault_analysis_description, payload.repair_fault_description, payload.complaint_description), lw: 112, vw: CONTENT_W - 112 },
  ], 34);
  y += 34;
  labelValueRow(doc, M, y, [
    { label: 'Action Taken', value: firstText(payload.repair_fault_analysis_action_taken, payload.repair_action_taken_description, payload.observations_text), lw: 96, vw: CONTENT_W - 96 },
  ], 34);
  y += 34;
  labelValueRow(doc, M, y, [
    { label: 'Faulty Section', value: firstText(payload.repair_fault_analysis_sections, payload.repair_faulty_section), lw: 96, vw: CONTENT_W - 96 },
  ]);
  y += 18;
  labelValueRow(doc, M, y, [
    { label: 'Fault Category', value: firstText(payload.repair_fault_analysis_category, payload.repair_fault_category), lw: 96, vw: CONTENT_W - 96 },
  ]);
  y += 24;

  y = ensureSpace(y, 16 + 20);
  const deviceTitle = options.deviceTitle || 'FAULTY DEVICE(S) & COST DETAILS';
  y = sectionTitle(doc, deviceTitle, y, sectionStyle);
  y = drawDeviceHeader(doc, y, options.quantityLabel || 'Quantity');
  (payload.children?.spares || []).forEach((row, index) => {
    if (y + 24 > CONTENT_BOTTOM_Y) {
      y = newContentPage();
      y = sectionTitle(doc, `${deviceTitle} (CONTINUED)`, y, sectionStyle);
      y = drawDeviceHeader(doc, y, options.quantityLabel || 'Quantity');
    }
    y = drawDeviceRow(doc, y, row, index);
  });
  y += 8;

  if (showEquipmentUsed) {
    y = ensureSpace(y, 28 + 6);
    labelValueRow(doc, M, y, [
      { label: 'Equipment Used For Repairs (ID Nos.)', value: repairEquipmentText(payload.children?.repair_equipment), lw: 190, vw: CONTENT_W - 190 },
    ], 28);
    y += 34;
  }

  if (showUserAcceptance) {
    y = ensureSpace(y, 16 + 18 * 2 + 34 + 6);
    y = sectionTitle(doc, 'USER ACCEPTANCE', y, sectionStyle);
    labelValueRow(doc, M, y, [
      { label: 'System Working Satisfactorily After Repair', value: payload.customer_acknowledged ? 'YES' : '', lw: 230, vw: CONTENT_W - 230 },
    ]);
    y += 18;
    labelValueRow(doc, M, y, [
      { label: 'Date', value: dateText(payload.customer_received_date), lw: 58, vw: 198 },
      { label: 'Name', value: payload.equipment_received_by_customer, lw: 60, vw: CONTENT_W - 58 - 198 - 60 },
    ]);
    y += 18;
    labelValueRow(doc, M, y, [
      { label: 'In-Charge Signature', value: '', lw: 122, vw: CONTENT_W - 122 },
    ], 34);
    y += 40;
  }

  y = ensureSpace(y, 16 + 42 + 70);
  y = sectionTitle(doc, 'REMARKS', y, sectionStyle);
  cell(doc, M, y, CONTENT_W, 42, firstText(payload.repair_remarks, payload.final_closure_notes, payload.review_comments, payload.legacy_remarks), { size: 7.7 });
  y += 52;
  doc.font('Helvetica-Bold').fontSize(8).fillColor(COLORS.title);
  if (options.showInchargeName !== false) {
    doc.text(firstText(payload.reviewed_by, payload.assigned_engineer_name, payload.repair_attended_by_name, 'Name of In-Charge'), M, y, { width: CONTENT_W, align: 'right' });
  }
  doc.text('Signature of In-Charge', M, options.showInchargeName === false ? y : y + 20, { width: CONTENT_W, align: 'right' });
  doc.moveTo(PAGE_W - M - 142, y + 46).lineTo(PAGE_W - M, y + 46).strokeColor(LINE).lineWidth(0.5).stroke();
  y += 58;

  const lastFooterY = y + 16;
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i += 1) {
    const pageNo = i - range.start + 1;
    const totalPages = range.count;
    const isLastPage = pageNo === totalPages;
    doc.switchToPage(i);
    drawFooter(doc, payload, isLastPage ? Math.min(lastFooterY, FOOTER_Y) : FOOTER_Y, pageNo, totalPages, options.footerFormatText || 'Repair Closure Format');
  }
  doc.end();
}

module.exports = {
  renderTmeRepairJobClosingForm,
};
