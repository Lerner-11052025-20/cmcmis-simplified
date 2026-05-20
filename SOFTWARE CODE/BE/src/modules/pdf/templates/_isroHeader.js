// ============================================================================
// src/modules/pdf/templates/_isroHeader.js  —  Shared header + footer helpers
// ----------------------------------------------------------------------------
// PHASE 11 — PDF Generation
//
// PURPOSE
//   Single source of truth for the ISRO + SAC seal blocks and the
//   "SPACE APPLICATIONS CENTRE / TIMCD" title bar that appears at the
//   top of every CMCMIS PDF (Certificate, JC Details, JR Details).
//
//   Also exports a `stampPageNumbers()` helper used by the multi-page
//   PDFs (#2 and #3) — the Certificate is strictly single-page so it
//   does NOT call this; the helper would still work (1 of 1) but the
//   certificate template renders its own footer-less single page.
//
// LOGO STRATEGY
//   This module looks for the official ISRO + SAC SVGs/PNGs at
//   `src/assets/isro-sac-logo.{svg,png}` and friends. If absent, it
//   falls back to a typographic "ISRO / SAC" seal block — exactly the
//   approach Phase-10 reports.pdf.js uses. This is intentional:
//     1. Government licensing concerns mean we ship no logo binary by
//        default; the CMCMIS instance operator drops the official assets
//        into `src/assets/` and they show up automatically.
//     2. The fallback is visually consistent with the supplied reference
//        PDF (typographic + framed) and prints cleanly in B/W.
//
//   To upgrade later: drop a 256×256 PNG at one of the searched paths;
//   `tryLoadLogo()` will pick it up on next request.
// ============================================================================

'use strict';

const fs   = require('fs');
const path = require('path');

// Layout constants — referenced by all three templates so they share
// the same margins, column gutters, and palette.
const PAGE_MARGIN_X      = 36;       // 0.5 inch (PDFKit uses PostScript points)
const PAGE_MARGIN_TOP    = 36;
const PAGE_MARGIN_BOTTOM = 50;
const FOOTER_HEIGHT      = 24;

const COLORS = Object.freeze({
  title:    '#1a1a1a',
  border:   '#888888',
  headerBg: '#e6ebf3',
  subtle:   '#f3f4f6',
  inkSoft:  '#555555',
  inkMute:  '#9ca3af',
  accent:   '#1f3a8a',     // ISRO blue-ish for accents (used very sparingly)
});

// ── Logo asset discovery ─────────────────────────────────────────────────
// Try several plausible filenames so an operator can drop the asset in
// without touching this code. `null` on miss → typographic fallback kicks in.
function tryLoadLogo(filenames) {
  const assetsDir = path.resolve(__dirname, '..', '..', '..', 'assets');
  for (const f of filenames) {
    const p = path.join(assetsDir, f);
    try {
      if (fs.existsSync(p)) return p;
    } catch { /* ignore */ }
  }
  return null;
}

const ISRO_LOGO_PATH = tryLoadLogo([
  'isro-logo.png', 'isro-logo.jpg', 'isro.png', 'isro.jpg',
]);
const SAC_LOGO_PATH  = tryLoadLogo([
  'sac-logo.png', 'sac-logo.jpg', 'sac.png', 'sac.jpg',
  // Existing repo has an SVG at src/assets/isro-sac-logo.svg (FE side).
  // PDFKit cannot embed SVG natively, so we ignore SVGs here and rely on
  // the typographic fallback when no PNG/JPG exists. Operator can convert
  // their SVG to PNG and drop it in src/assets to enable the image path.
]);


// ── HEADER RENDERER (shared across all three PDFs) ───────────────────────

/**
 * Draw the standard CMCMIS PDF header onto the current page.
 *
 *   ┌──────────────────────────────────────────────────────────┐
 *   │ [ISRO seal]   SPACE APPLICATIONS CENTRE       [SAC seal] │
 *   │               TIMCD                                      │
 *   │               <REPORT TITLE>                             │
 *   │               <Optional sub-title>                       │
 *   └──────────────────────────────────────────────────────────┘
 *
 * Footers (page numbers etc.) are stamped in a second pass — see
 * `stampPageNumbers()` below.
 *
 * @param {PDFKit.PDFDocument} doc
 * @param {Object} opts
 * @param {string} opts.title       — e.g. "JOB REQUEST OF T&ME FOR CALIBRATION"
 * @param {string} [opts.subtitle]  — e.g. "CMCMIS REPORT MODULE"
 * @param {boolean} [opts.compact]  — when true, reduce the title block height
 *                                     (used by the locked Certificate so the
 *                                     entire page fits on A4 landscape).
 */
function drawHeader(doc, { title, subtitle, compact = false } = {}) {
  const pageWidth = doc.page.width;
  const leftX  = PAGE_MARGIN_X;
  const rightX = pageWidth - PAGE_MARGIN_X;

  const startY = doc.y;
  const sealW = compact ? 52 : 60;
  const sealH = compact ? 52 : 60;

  // ── LEFT SEAL — ISRO ───────────────────────────────────────────────
  if (ISRO_LOGO_PATH) {
    try {
      doc.image(ISRO_LOGO_PATH, leftX, startY, { fit: [sealW, sealH], align: 'center', valign: 'center' });
    } catch {
      drawTypographicSeal(doc, leftX, startY, sealW, sealH, 'ISRO', 'भारत · INDIA', 'Space Dept.');
    }
  } else {
    drawTypographicSeal(doc, leftX, startY, sealW, sealH, 'ISRO', 'भारत · INDIA', 'Space Dept.');
  }

  // ── RIGHT SEAL — SAC ───────────────────────────────────────────────
  const sacX = rightX - sealW;
  if (SAC_LOGO_PATH) {
    try {
      doc.image(SAC_LOGO_PATH, sacX, startY, { fit: [sealW, sealH], align: 'center', valign: 'center' });
    } catch {
      drawTypographicSeal(doc, sacX, startY, sealW, sealH, 'SAC', 'Ahmedabad', 'CMCMIS');
    }
  } else {
    drawTypographicSeal(doc, sacX, startY, sealW, sealH, 'SAC', 'Ahmedabad', 'CMCMIS');
  }

  // ── CENTRE TITLE BLOCK ─────────────────────────────────────────────
  const centreX = leftX + sealW + 12;
  const centreW = sacX - 12 - centreX;
  const titleFont = compact ? 13 : 14;
  const sublabelFont = compact ? 9 : 10;

  doc.font('Helvetica-Bold').fontSize(titleFont).fillColor(COLORS.title);
  doc.text('SPACE APPLICATIONS CENTRE', centreX, startY + 4, { width: centreW, align: 'center' });
  doc.font('Helvetica').fontSize(sublabelFont).fillColor(COLORS.inkSoft);
  doc.text('TIMCD', centreX, startY + 22, { width: centreW, align: 'center' });
  doc.font('Helvetica-Bold').fontSize(compact ? 12 : 13).fillColor(COLORS.title);
  doc.text(title, centreX, startY + 36, { width: centreW, align: 'center' });
  if (subtitle) {
    doc.font('Helvetica').fontSize(8).fillColor(COLORS.inkSoft);
    doc.text(subtitle, centreX, startY + (compact ? 50 : 52), { width: centreW, align: 'center' });
  }

  // Move the cursor below the header block.
  doc.y = startY + sealH + (compact ? 6 : 10);
}

/** Typographic seal fallback — used when the image asset is absent. */
function drawTypographicSeal(doc, x, y, w, h, label1, label2, label3) {
  doc.lineWidth(0.6).strokeColor(COLORS.border);
  doc.rect(x, y, w, h).stroke();
  doc.font('Helvetica-Bold').fontSize(13).fillColor(COLORS.title);
  doc.text(label1, x, y + 10, { width: w, align: 'center' });
  doc.font('Helvetica').fontSize(7).fillColor(COLORS.inkSoft);
  doc.text(label2, x, y + 28, { width: w, align: 'center' });
  doc.text(label3, x, y + 40, { width: w, align: 'center' });
}

// ── FOOTER STAMP (multi-page only) ───────────────────────────────────────

/**
 * Stamp "Page X of Y" + a generated timestamp on every page.
 *
 * MUST be called AFTER all content is drawn so `doc.bufferedPageRange()`
 * knows the final page count. The Certificate template (#1) does NOT
 * call this — it's a single-page document and never adds a page.
 *
 * @param {PDFKit.PDFDocument} doc  Must have been created with bufferPages:true.
 * @param {Object} [opts]
 * @param {string} [opts.docId]   — e.g. "JC-2026-24219" for the footer left side.
 */
function stampPageNumbers(doc, { docId } = {}) {
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    const y = doc.page.height - PAGE_MARGIN_BOTTOM + 6;
    const leftX  = PAGE_MARGIN_X;
    const rightX = doc.page.width - PAGE_MARGIN_X;
    doc.font('Helvetica').fontSize(8).fillColor(COLORS.inkSoft);
    const leftStr = docId
      ? `${docId} · Generated ${new Date().toISOString().slice(0, 19).replace('T', ' ')} UTC`
      : `Generated ${new Date().toISOString().slice(0, 19).replace('T', ' ')} UTC`;
    doc.text(leftStr, leftX, y, { width: rightX - leftX, align: 'left' });
    doc.text(`Page ${i - range.start + 1} of ${range.count}`,
             leftX, y, { width: rightX - leftX, align: 'right' });
  }
}


// ── DATE FORMATTING (NULL-safe) ──────────────────────────────────────────
// Renders dates as DD-MM-YYYY (matches the UI) and degrades to em dash
// for NULL / undefined / invalid values so the PDF never prints "null".

function fmtDate(d, fallback = '—') {
  if (d === null || d === undefined || d === '') return fallback;
  const dt = (d instanceof Date) ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return fallback;
  const dd = String(dt.getUTCDate()).padStart(2, '0');
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const yy = dt.getUTCFullYear();
  return `${dd}-${mm}-${yy}`;
}

function fmtDateTime(d, fallback = '—') {
  if (d === null || d === undefined || d === '') return fallback;
  const dt = (d instanceof Date) ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return fallback;
  return `${fmtDate(dt)} ${String(dt.getUTCHours()).padStart(2, '0')}:${String(dt.getUTCMinutes()).padStart(2, '0')}`;
}

function fmtText(s, fallback = '—') {
  if (s === null || s === undefined) return fallback;
  const str = String(s).trim();
  return str === '' ? fallback : str;
}


module.exports = {
  // Layout constants
  PAGE_MARGIN_X,
  PAGE_MARGIN_TOP,
  PAGE_MARGIN_BOTTOM,
  FOOTER_HEIGHT,
  COLORS,
  // Renderers
  drawHeader,
  stampPageNumbers,
  // NULL-safe formatters
  fmtDate,
  fmtDateTime,
  fmtText,
};
