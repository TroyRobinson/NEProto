import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import adminDb from '@/lib/admin';

async function fetchCensus(variable: string) {
  const url = `https://api.census.gov/data/2022/acs/acs5?get=${variable}&for=tract:*&in=state:40+place:55000`;
  const resp = await fetch(url);
  const json = await resp.json();
  return json;
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const statId = params.id;

  try {
    const statQuery = await adminDb.query({
      stats: {
        $: { where: { id: statId } },
      },
    });
    const stat = statQuery.stats[0];
    if (!stat) {
      return NextResponse.json({ error: 'Stat not found' }, { status: 404 });
    }

    const data = await fetchCensus(stat.variable);
    const rows = data.slice(1) as string[][]; // skip header

    const existing = await adminDb.query({
      statValues: { $: { where: { 'stat.id': statId } } },
    });
    const existingValues = existing.statValues as Array<{ id: string }>;

    const tx: unknown[] = [];
    for (const val of existingValues) {
      tx.push(adminDb.tx.statValues[val.id].delete());
    }
    for (const row of rows) {
      const value = parseFloat(row[1]);
      const geoid = row[row.length - 1];
      const id = randomUUID();
      tx.push(
        adminDb.tx.statValues[id]
          .update({ geoid, value })
          .link({ stat: statId })
      );
    }
    tx.push(adminDb.tx.stats[statId].update({ lastUpdated: Date.now() }));

    await adminDb.transact(tx);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

