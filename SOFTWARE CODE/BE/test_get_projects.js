'use strict';

const repo = require('./src/modules/projects/projects.repo');

async function main() {
  try {
    const res = await repo.findAndCount({ page: 1, pageSize: 10, q: '' });
    console.log(`Total count: ${res.total}`);
    console.log(`Returned items count: ${res.items.length}`);
    console.log('Items:');
    res.items.forEach((item, idx) => {
      console.log(`${idx + 1}. ID: #${item.id}, Name: ${item.name}, Status: ${item.is_active}`);
    });
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
}

setTimeout(main, 1000);
