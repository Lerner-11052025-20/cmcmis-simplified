'use strict';

const fs = require('fs');
const path = require('path');

const files = [
  'check_kpi_proj.js',
  'test_get_projects.js',
  'test_search_proj.js',
  'test_d_search.js',
  'list_tables.js',
  'describe_tables.js',
  'check_tasks.js'
];

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
