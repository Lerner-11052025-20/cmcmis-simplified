// Quick inspector: list textual strings embedded in a PDFKit PDF.
'use strict';
const fs   = require('fs');
const path = require('path');
const os   = require('os');

const file = process.argv[2] || path.join(os.tmpdir(), 'cert.pdf');
const buf  = fs.readFileSync(file);
const s    = buf.toString('binary');

// PDFKit embeds text inside (...) tokens (PDF string literal). Capture
// printable runs ≥ 3 chars that contain a letter, ignoring control bytes.
const parenRe = /\(([^)\\]{2,80})\)/g;
const seen = new Set();
const out  = [];
let m;
while ((m = parenRe.exec(s)) !== null) {
  const t = m[1];
  if (!/[A-Za-z]{3,}/.test(t)) continue;
  if (/[\x00-\x1f]/.test(t))  continue;
  if (seen.has(t))             continue;
  seen.add(t);
  out.push(t);
}
out.slice(0, 60).forEach((t) => console.log(' ·', t));
console.log(`(${out.length} unique strings total)`);
