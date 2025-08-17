import { NextRequest, NextResponse } from 'next/server';
import adminDb from '../../../../lib/admin';
import { fetchCensusStat } from '../../../../lib/census';
import { id as newId } from '@instantdb/admin';

export async function POST(req: NextRequest) {
  const { id } = await req.json();
  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }
  const result = await adminDb.query({ stats: { where: { id }, values: {} } });
  const stat = result.stats[0];
  if (!stat) {
    return NextResponse.json({ error: 'Stat not found' }, { status: 404 });
  }
  const values = await fetchCensusStat(stat.variable, stat.geography);
  const tx = [
    adminDb.tx.stats[id].update({ lastUpdated: Date.now() }),
    ...values.map((v) =>
      adminDb.tx.statValues[newId()]
        .update({ geoid: v.geoid, value: v.value })
        .link({ stat: id })
    ),
  ];
  await adminDb.transact(tx);
  return NextResponse.json({ ok: true });
}
