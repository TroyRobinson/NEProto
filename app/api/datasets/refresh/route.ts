import { NextResponse } from 'next/server';
import { init } from '@instantdb/admin';

const APP_ID = process.env.NEXT_PUBLIC_INSTANT_APP_ID!;
const ADMIN_TOKEN = process.env.INSTANT_ADMIN_TOKEN!;
const db = init({ appId: APP_ID, adminToken: ADMIN_TOKEN });

interface DatasetItem {
  identifier: string;
  title: string;
}

export async function GET() {
  try {
    const res = await fetch('https://api.census.gov/data.json');
    const json = await res.json();
    const datasets: DatasetItem[] = json.dataset || [];
    const txs = datasets.map((d) =>
      db.tx.censusDatasets[d.identifier].update({ title: d.title })
    );
    if (txs.length) {
      await db.transact(txs);
    }
    return NextResponse.json({ count: txs.length });
  } catch {
    return NextResponse.json(
      { error: 'Failed to refresh datasets' },
      { status: 500 }
    );
  }
}
