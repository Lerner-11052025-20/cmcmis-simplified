'use strict';

const repo = require('./src/modules/projects/projects.repo');
const pool = require('./src/config/db');

async function main() {
  try {
    const [rows] = await pool.query('SELECT PR_ID, PR_NAME, PR_STATE FROM cmms_proj_mst WHERE PR_ID IN (100, 184)');
    console.log('Specific rows:');
    for (const r of rows) {
      console.log(`ID: ${r.PR_ID}, Name: "${r.PR_NAME}", State: ${r.PR_STATE}`);
    }

    // Try search for "demo"
    const s1 = await repo.findAndCount({ page: 1, pageSize: 10, q: 'demo' });
    console.log(`\nSearch for "demo" total: ${s1.total}`);
    s1.items.forEach(item => {
      console.log(`- ID: #${item.id}, Name: "${item.name}", State: ${item.is_active}`);
    });

  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
}

setTimeout(main, 1000);
