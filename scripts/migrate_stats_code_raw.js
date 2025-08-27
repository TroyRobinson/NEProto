// Migration: backfill codeRaw and avoid unique(code) conflicts by making code composite
// Usage:
//   cp .env.local .env
//   node scripts/migrate_stats_code_raw.js

require('dotenv').config();
const { init } = require('@instantdb/admin');

const APP_ID = process.env.INSTANT_APP_ID || process.env.NEXT_PUBLIC_INSTANT_APP_ID;
const ADMIN_TOKEN = process.env.INSTANT_ADMIN_TOKEN;

if (!APP_ID || !ADMIN_TOKEN) {
  console.error('Missing INSTANT_APP_ID or INSTANT_ADMIN_TOKEN');
  process.exit(1);
}

const db = init({ appId: APP_ID, adminToken: ADMIN_TOKEN });

function cityFromRegion(region) {
  switch ((region || '').toLowerCase()) {
    case 'tulsa county':
      return 'Tulsa';
    case 'wichita':
    case 'sedgwick county':
      return 'Wichita';
    case 'oklahoma county':
    default:
      return 'OKC';
  }
}

async function run() {
  const res = await db.query({ stats: {} });
  const stats = res.stats || [];
  const txs = [];
  for (const s of stats) {
    const updates = {};
    if (!s.codeRaw) updates.codeRaw = s.code;
    const city = s.city || cityFromRegion(s.region);
    // If code does not include a city suffix, make it composite to avoid unique(code) conflicts
    if (typeof s.code === 'string' && !/\|/.test(s.code) && city) {
      updates.code = `${s.code}|${city}`;
    }
    if (Object.keys(updates).length) {
      txs.push(db.tx.stats[s.id].update(updates));
    }
  }
  if (!txs.length) {
    console.log('No updates needed.');
    return;
  }
  console.log(`Updating ${txs.length} stat rows with codeRaw/composite code...`);
  await db.transact(txs);
  console.log('Done.');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});

