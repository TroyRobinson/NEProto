// Migration: tag existing stats with region and geography (JS version)
// Usage:
//   cp .env.local .env   # or set env vars directly
//   node scripts/migrate_stats_add_region.js

require('dotenv').config();
const { init } = require('@instantdb/admin');

const APP_ID = process.env.INSTANT_APP_ID || process.env.NEXT_PUBLIC_INSTANT_APP_ID;
const ADMIN_TOKEN = process.env.INSTANT_ADMIN_TOKEN;

if (!APP_ID || !ADMIN_TOKEN) {
  console.error('Missing INSTANT_APP_ID or INSTANT_ADMIN_TOKEN');
  process.exit(1);
}

const db = init({ appId: APP_ID, adminToken: ADMIN_TOKEN });

async function run() {
  const res = await db.query({ stats: {} });
  const stats = res.stats || [];
  const txs = [];

  for (const s of stats) {
    const patch = {};
    if (!s.region) patch.region = 'Oklahoma County';
    if (!s.geography) patch.geography = 'ZIP';
    if (Object.keys(patch).length) {
      txs.push(db.tx.stats[s.id].update(patch));
    }
  }

  if (!txs.length) {
    console.log('No updates needed.');
    return;
  }

  console.log(`Updating ${txs.length} stat rows...`);
  await db.transact(txs);
  console.log('Done.');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});

