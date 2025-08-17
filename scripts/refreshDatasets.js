require('dotenv').config({ path: '.env.local' });
const { init } = require('@instantdb/admin');

const APP_ID = process.env.NEXT_PUBLIC_INSTANT_APP_ID;
const ADMIN_TOKEN = process.env.INSTANT_ADMIN_TOKEN;

if (!APP_ID || !ADMIN_TOKEN) {
  console.error('Missing environment variables');
  process.exit(1);
}

const db = init({ appId: APP_ID, adminToken: ADMIN_TOKEN });

async function refresh() {
  const res = await fetch('https://api.census.gov/data.json');
  const json = await res.json();
  const datasets = json.dataset || [];
  const txs = datasets.map((d) =>
    db.tx.censusDatasets[d.identifier].update({ title: d.title })
  );
  if (txs.length) {
    await db.transact(txs);
  }
  console.log(`Stored ${txs.length} datasets`);
}

refresh();
