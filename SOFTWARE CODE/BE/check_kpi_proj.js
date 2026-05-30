'use strict';

const pool = require('./src/config/db');

async function main() {
  try {
    const [rows] = await pool.query('SELECT PR_STATE, COUNT(*) as cnt FROM cmms_proj_mst GROUP BY PR_STATE');
    console.log('Query results:');
    for (const r of rows) {
      console.log(`PR_STATE value: ${r.PR_STATE}, type: ${typeof r.PR_STATE}, count: ${r.cnt}`);
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
}

setTimeout(main, 1000);
