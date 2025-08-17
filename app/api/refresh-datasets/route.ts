import { NextResponse } from 'next/server';
import { init } from '@instantdb/admin';
import crypto from 'crypto';

type CensusDataset = { identifier: string; title: string };

const APP_ID = process.env.NEXT_PUBLIC_INSTANT_APP_ID;
const ADMIN_TOKEN = process.env.INSTANT_ADMIN_TOKEN;

// Fetch the list of datasets from the Census API and, when InstantDB
// credentials are available, cache the titles for faster searches. When
// credentials are missing we still return the titles to the caller so the
// datasets page can fall back to a client-side search instead of failing.
export async function GET() {
  try {
    const res = await fetch('https://api.census.gov/data.json');
    const json = await res.json();
    const datasets = (json.dataset || []) as CensusDataset[];

    if (APP_ID && ADMIN_TOKEN) {
      const db = init({ appId: APP_ID, adminToken: ADMIN_TOKEN });

      const ops = datasets.map((ds) => {
        const id = crypto
          .createHash('sha1')
          .update(ds.identifier)
          .digest('hex');
        return db.tx.censusDatasets[id].update({
          identifier: ds.identifier,
          title: ds.title,
        });
      });

      const chunkSize = 50;
      for (let i = 0; i < ops.length; i += chunkSize) {
        await db.transact(ops.slice(i, i + chunkSize));
      }
    }

    return NextResponse.json({ datasets });
  } catch (err) {
    console.error('Failed to refresh datasets:', err);
    return NextResponse.json(
      { error: 'Failed to refresh datasets' },
      { status: 500 }
    );
  }
}

