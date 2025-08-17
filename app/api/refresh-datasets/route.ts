import { NextResponse } from 'next/server';
import { init } from '@instantdb/admin';
import crypto from 'crypto';

type CensusDataset = { identifier: string; title: string };

const APP_ID = process.env.NEXT_PUBLIC_INSTANT_APP_ID!;
const ADMIN_TOKEN = process.env.INSTANT_ADMIN_TOKEN!;

export async function GET() {
  if (!APP_ID || !ADMIN_TOKEN) {
    return NextResponse.json(
      { error: 'Missing InstantDB credentials' },
      { status: 500 }
    );
  }

  const db = init({ appId: APP_ID, adminToken: ADMIN_TOKEN });

  const res = await fetch('https://api.census.gov/data.json');
  const json = await res.json();
  const datasets = (json.dataset || []) as CensusDataset[];

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

  return NextResponse.json({ stored: datasets.length });
}
