'use strict';

const pool = require('./src/config/db');

async function main() {
  try {
    const [rows] = await pool.query('SELECT PR_ID, PR_NAME FROM cmms_proj_mst WHERE PR_NAME LIKE "%D%"');
    console.log(`Total matching "D": ${rows.length}`);
    rows.forEach(r => {
      console.log(`- ID: #${r.PR_ID}, Name: "${r.PR_NAME}"`);
    });
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

setTimeout(main, 1000);
