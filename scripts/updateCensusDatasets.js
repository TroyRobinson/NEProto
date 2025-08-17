require('dotenv').config({ path: '.env.local' });
const { init } = require('@instantdb/admin');
const crypto = require('crypto');

const APP_ID = process.env.NEXT_PUBLIC_INSTANT_APP_ID;
const ADMIN_TOKEN = process.env.INSTANT_ADMIN_TOKEN;

if (!APP_ID || !ADMIN_TOKEN) {
  console.error('Missing environment variables');
  process.exit(1);
}

const db = init({ appId: APP_ID, adminToken: ADMIN_TOKEN });

async function refreshDatasets() {
  const res = await fetch('https://api.census.gov/data.json');
  const json = await res.json();
  const datasets = json.dataset || [];

  const ops = datasets.map((ds) => {
    const id = crypto.createHash('sha1').update(ds.identifier).digest('hex');
    return db.tx.censusDatasets[id].update({
      identifier: ds.identifier,
      title: ds.title,
    });
  });

  const chunkSize = 50;
  for (let i = 0; i < ops.length; i += chunkSize) {
    await db.transact(ops.slice(i, i + chunkSize));
  }
  console.log(`Stored ${datasets.length} datasets`);
}

refreshDatasets().catch((err) => {
  console.error(err);
  process.exit(1);
});
