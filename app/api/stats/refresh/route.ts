import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';
import adminDb from '../../../../lib/admin';
import { fetchCensusStat } from '../../../../lib/census';
import { id as newId } from '@instantdb/admin';
import fs from 'fs';
import path from 'path';

let okcGeoids: Set<string> | null = null;
function getOkcGeoids(): Set<string> {
  if (!okcGeoids) {
    const geojson: { features: { properties: { GEOID: string } }[] } = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'public', 'okc_tracts.geojson'), 'utf8')
    );
    okcGeoids = new Set(geojson.features.map(f => f.properties.GEOID));
  }
  return okcGeoids;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

export async function POST(req: NextRequest) {
  const { id } = await req.json();
  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }
  try {
    const result = await adminDb.query({ stats: { where: { id }, values: {} } });
    const stat = result.stats[0];
    if (!stat) {
      return NextResponse.json({ error: 'Stat not found' }, { status: 404 });
    }
    const rawValues = await fetchCensusStat(stat.variable, stat.geography);
    const okc = stat.geography === 'tract' ? getOkcGeoids() : null;
    const values = okc ? rawValues.filter(v => okc.has(v.geoid)) : rawValues;

    await adminDb.transact([adminDb.tx.stats[id].update({ lastUpdated: Date.now() })]);

    const tx = values.map(v =>
      adminDb.tx.statValues[newId()]
        .update({ geoid: v.geoid, value: v.value })
        .link({ stat: id })
    );
    for (const c of chunk(tx, 50)) {
      await adminDb.transact(c);
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to refresh' }, { status: 500 });
  }
}
