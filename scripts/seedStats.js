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

async function fetchOKCData(variable) {
  const url = `https://api.census.gov/data/2022/acs/acs5/profile?get=${variable}&for=tract:*&in=state:40+place:55000`;
  const res = await fetch(url);
  const data = await res.json();
  const headers = data[0];
  const varIndex = headers.indexOf(variable);
  const tractIndex = headers.indexOf('tract');
  return data.slice(1).map(row => ({ geoid: row[tractIndex], value: parseFloat(row[varIndex]) }));
}

async function addStat(title, censusVar) {
  const values = await fetchOKCData(censusVar);
  const statId = crypto.randomUUID();
  const ops = [
    db.tx.stats[statId].update({
      title,
      censusVar,
      geography: 'tract',
      lastUpdated: Date.now(),
    })
  ];
  values.forEach(v => {
    ops.push(
      db.tx.statValues[crypto.randomUUID()].update({ geoid: v.geoid, value: v.value }).link({ stat: statId })
    );
  });
  await db.transact(ops);
  console.log(`Added stat ${title}`);
}

(async function run() {
  await addStat('% of adults with high school diploma', 'DP02_0067PE');
  await addStat('% of households under poverty line', 'DP03_0119PE');
})();
