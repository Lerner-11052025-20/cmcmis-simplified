// ============================================================================
// src/modules/pdf/templates/tmeCalibrationJobClosingForm/tmeCalibrationJobClosingForm.js
// ----------------------------------------------------------------------------
// Dedicated Job Closing Form PDF for ONLY T&ME Calibration job cards.
// Mirrors reports PDFs/latex/T&ME_Calibration_JobClosingForm.tex with dynamic
// DB-backed rows, guarded pagination, official logos, and dynamic footer pages.
// ============================================================================

'use strict';

const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const { COLORS, fmtDate, fmtText } = require('../_isroHeader');

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

function fittedLabelWidth(doc, label, labelW, valueW, opts = {}) {
  const text = clean(label);
  if (!text) return labelW;
  const pad = opts.pad ?? 3;
  const size = opts.size || 7.3;
  const totalW = labelW + valueW;
  const minValueW = opts.minValueW ?? 24;
  doc.font('Helvetica-Bold').fontSize(size);
  const naturalW = Math.ceil(doc.widthOfString(text) + pad * 2 + 4);
  return Math.min(totalW - minValueW, Math.max(12, naturalW));
}

function labelValueRow(doc, x, y, specs, h = 18) {
  let cx = x;
  specs.forEach((s) => {
    const totalW = s.lw + s.vw;
    const labelSize = s.labelSize || 7.3;
    const labelW = fittedLabelWidth(doc, s.label, s.lw, s.vw, { size: labelSize });
    const valueW = totalW - labelW;
    cell(doc, cx, y, labelW, h, s.label, { bold: true, size: labelSize });
    cell(doc, cx + labelW, y, valueW, h, s.value, { size: s.valueSize || 7.6 });
    cx += totalW;
  });
}

function sectionTitle(doc, title, y) {
  doc.save().rect(M, y, CONTENT_W, 14).fill(SECTION_BG).restore();
  doc.font('Helvetica-Bold').fontSize(8.5).fillColor(COLORS.title);
  doc.text(title, M + 4, y + 3, { width: CONTENT_W - 8, lineBreak: false });
  return y + 16;
}

function header(doc, subtitle = 'T&ME CALIBRATION') {
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
  return y + 76;
}

function drawFooter(doc, payload, y, pageNo, totalPages) {
  doc.moveTo(M, y).lineTo(PAGE_W - M, y).strokeColor(LINE).lineWidth(0.6).stroke();
  doc.font('Helvetica').fontSize(6.8).fillColor(COLORS.title);
  const footerText = [
    `Document No. ${jcCode(payload)}`,
    `Revised on ${longDate(payload.created_at || payload.jc_recd_date)}`,
    'Job Closure Format',
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

function standardsText(rows) {
  return (rows || [])
    .map((r) => [r.equipment_id, r.equipment_name].map(clean).filter(Boolean).join(' - '))
    .filter(Boolean)
    .join(', ');
}

function drawAdjustmentHeader(doc, y) {
  const widths = [34, 110, 78, 104, 95, CONTENT_W - 34 - 110 - 78 - 104 - 95];
  const headers = ['Sr.No.', 'Parameter', 'Test Value', 'Specification / Limits', 'Before Adjustment', 'After Adjustment'];
  let cx = M;
  headers.forEach((h, i) => {
    cell(doc, cx, y, widths[i], 20, h, { bold: true, size: 7 });
    cx += widths[i];
  });
  return y + 20;
}

function drawAdjustmentRow(doc, y, row) {
  const widths = [34, 110, 78, 104, 95, CONTENT_W - 34 - 110 - 78 - 104 - 95];
  const values = [
    row.sr_no,
    row.parameter_name,
    row.test_value,
    row.specifications_limits,
    row.observation_before,
    row.observation_after,
  ];
  let cx = M;
  values.forEach((v, i) => {
    cell(doc, cx, y, widths[i], 24, v, { size: 6.9 });
    cx += widths[i];
  });
  return y + 24;
}

function renderTmeCalibrationJobClosingForm(payload, stream, options = {}) {
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

  let y = header(doc, options.subtitle || 'T&ME CALIBRATION');
  y = ensureSpace(y, 18 * 3 + 10);
  labelValueRow(doc, M, y, [
    { label: 'Job Card No.', value: jcCode(payload), lw: 86, vw: 166 },
    { label: 'Equipment ID', value: equipmentId(payload), lw: 84, vw: CONTENT_W - 86 - 166 - 84 },
  ]);
  y += 18;
  labelValueRow(doc, M, y, [
    { label: 'Equipment Name', value: payload.equipment_name, lw: 100, vw: 184 },
    { label: 'Calibration Ref. No.', value: payload.cal_ref_no, lw: 116, vw: CONTENT_W - 100 - 184 - 116 },
  ]);
  y += 18;
  labelValueRow(doc, M, y, [
    { label: 'Division / Project', value: [payload.division_code || payload.division_name, payload.jr_project_name].map(clean).filter(Boolean).join(' / '), lw: 106, vw: CONTENT_W - 106 },
  ]);
  y += 22;

  y = ensureSpace(y, 58);
  cell(doc, M, y, CONTENT_W, 58, [
    '• Statement of conformity, decision rule and calibration due date as per SAC centralized policy EP/033.',
    `• User Signature :`,
    `• Job Request Reviewed : ${payload.review_date ? 'YES' : 'NO'}`,
  ].join('\n\n'), { size: 7.7 });
  y += 62;

  y = ensureSpace(y, 16 + 18 * 5 + 6);
  y = sectionTitle(doc, 'CALIBRATION SUMMARY', y);
  labelValueRow(doc, M, y, [
    { label: 'Job Started Date', value: dateText(payload.cal_job_started_date || payload.job_start_date), lw: 104, vw: 154 },
    { label: 'Job Completed Date', value: dateText(payload.cal_job_completed_date || payload.job_end_date), lw: 116, vw: CONTENT_W - 104 - 154 - 116 },
  ]);
  y += 18;
  labelValueRow(doc, M, y, [
    { label: 'Calibration Status', value: payload.cal_calibration_status, lw: 110, vw: 148 },
    { label: 'Calibration Due Date', value: dateText(payload.cal_due_date), lw: 120, vw: CONTENT_W - 110 - 148 - 120 },
  ]);
  y += 18;
  labelValueRow(doc, M, y, [
    { label: 'Temperature', value: payload.cal_temperature_c, lw: 86, vw: 172 },
    { label: 'Relative Humidity', value: payload.cal_relative_humidity, lw: 112, vw: CONTENT_W - 86 - 172 - 112 },
  ]);
  y += 18;
  labelValueRow(doc, M, y, [
    { label: 'Calibration Ref. No.', value: payload.cal_ref_no, lw: 112, vw: 146 },
    { label: 'Calibrated By', value: payload.calibrated_by_name || payload.calibrated_by_employee_id, lw: 92, vw: CONTENT_W - 112 - 146 - 92 },
  ]);
  y += 18;
  labelValueRow(doc, M, y, [
    { label: 'Signature', value: '', lw: 72, vw: CONTENT_W - 72 },
  ]);
  y += 24;

  y = ensureSpace(y, 16 + 18 * 4 + 30 + 6);
  y = sectionTitle(doc, 'CALIBRATION ACTIVITY DETAILS', y);
  labelValueRow(doc, M, y, [
    { label: 'Status of Equipment as Received', value: payload.cal_equipment_received_status, lw: 170, vw: CONTENT_W - 170 },
  ]);
  y += 18;
  labelValueRow(doc, M, y, [
    { label: 'Repair Carried Out By', value: payload.cal_repair_carried_out_by, lw: 130, vw: CONTENT_W - 130 },
  ]);
  y += 18;
  labelValueRow(doc, M, y, [
    { label: 'Sent to Lab Date', value: dateText(payload.cal_sent_to_lab_date), lw: 100, vw: 156 },
    { label: 'Received from Lab Date', value: dateText(payload.cal_received_from_lab_date), lw: 130, vw: CONTENT_W - 100 - 156 - 130 },
  ]);
  y += 18;
  labelValueRow(doc, M, y, [
    { label: 'Adjustment(s)', value: payload.cal_adjustment_status, lw: 92, vw: 164 },
    { label: 'Adjustment Status', value: payload.cal_adjustment_status, lw: 112, vw: CONTENT_W - 92 - 164 - 112 },
  ]);
  y += 18;
  labelValueRow(doc, M, y, [
    { label: 'Reason for Limited / Partial / No Calibration', value: payload.cal_limited_reason, lw: 220, vw: CONTENT_W - 220 },
  ], 30);
  y += 36;

  y = ensureSpace(y, 16 + 28 + 6);
  y = sectionTitle(doc, 'STANDARDS USED', y);
  labelValueRow(doc, M, y, [
    { label: 'Equipment Used for Calibration (ID Nos.)', value: standardsText(payload.children?.calibration_equipment), lw: 210, vw: CONTENT_W - 210 },
  ], 28);
  y += 34;

  y = ensureSpace(y, 16 + 20);
  y = sectionTitle(doc, 'ADJUSTMENT DETAILS', y);
  y = drawAdjustmentHeader(doc, y);
  (payload.children?.calibration_adjustments || []).forEach((row) => {
    if (y + 24 > CONTENT_BOTTOM_Y) {
      y = newContentPage();
      y = sectionTitle(doc, 'ADJUSTMENT DETAILS (CONTINUED)', y);
      y = drawAdjustmentHeader(doc, y);
    }
    y = drawAdjustmentRow(doc, y, row);
  });
  y += 6;

  y = ensureSpace(y, 16 + 42 + 70);
  y = sectionTitle(doc, 'REMARKS', y);
  cell(doc, M, y, CONTENT_W, 42, payload.cal_remarks || payload.review_comments || payload.final_closure_notes, { size: 7.7 });
  y += 52;
  doc.font('Helvetica-Bold').fontSize(8).fillColor(COLORS.title);
  doc.text(clean(payload.cal_incharge_name || payload.cal_incharge_employee_id || 'Name of In-Charge'), M, y, { width: CONTENT_W, align: 'right' });
  doc.text('Signature of In-Charge', M, y + 20, { width: CONTENT_W, align: 'right' });
  doc.moveTo(PAGE_W - M - 142, y + 46).lineTo(PAGE_W - M, y + 46).strokeColor(LINE).lineWidth(0.5).stroke();
  y += 58;

  const lastFooterY = y + 16;
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i += 1) {
    const pageNo = i - range.start + 1;
    const totalPages = range.count;
    const isLastPage = pageNo === totalPages;
    doc.switchToPage(i);
    drawFooter(doc, payload, isLastPage ? Math.min(lastFooterY, FOOTER_Y) : FOOTER_Y, pageNo, totalPages);
  }
  doc.end();
}

module.exports = {
  renderTmeCalibrationJobClosingForm,
};
