/**
 * Migration: tag existing stats with region and geography
 *
 * - Sets region = 'Oklahoma County' for rows missing region
 * - Sets geography = 'ZIP' when missing
 *
 * Requirements:
 * - Install deps (already in package.json): @instantdb/admin, ts-node
 * - Env vars:
 *   - INSTANT_APP_ID (or use NEXT_PUBLIC_INSTANT_APP_ID)
 *   - INSTANT_ADMIN_TOKEN (admin token from InstantDB dashboard)
 *
 * Run:
 *   INSTANT_APP_ID=xxx INSTANT_ADMIN_TOKEN=xxx npx ts-node scripts/migrate_stats_add_region.ts
 */

import 'dotenv/config';
import { init } from '@instantdb/admin';

const APP_ID = process.env.INSTANT_APP_ID || process.env.NEXT_PUBLIC_INSTANT_APP_ID;
const ADMIN_TOKEN = process.env.INSTANT_ADMIN_TOKEN;

if (!APP_ID || !ADMIN_TOKEN) {
  console.error('Missing INSTANT_APP_ID or INSTANT_ADMIN_TOKEN');
  process.exit(1);
}

const db = init({ appId: APP_ID, adminToken: ADMIN_TOKEN });

async function run() {
  const res = await db.query({ stats: {} });
  const stats = (res as any).stats as Array<{
    id: string;
    region?: string | null;
    geography?: string | null;
  }>;

  const txs: any[] = [];
  for (const s of stats) {
    const patch: Record<string, any> = {};
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
