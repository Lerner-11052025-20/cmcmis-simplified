'use strict';

const fs = require('fs');
const path = require('path');

const files = ['describe_jobcard.js'];

for (const f of files) {
  const p = path.join(__dirname, f);
  if (fs.existsSync(p)) {
    try {
      fs.unlinkSync(p);
      console.log(`Deleted: ${f}`);
    } catch (err) {
      console.error(`Error deleting ${f}:`, err);
    }
  }
}
process.exit(0);
