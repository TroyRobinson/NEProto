/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import adminDb from '../../../lib/admin';
import { fetchOKCData } from '../../../lib/census';

export async function POST(req: Request) {
  const { title, censusVar, geography } = await req.json();
  const values = await fetchOKCData(censusVar);
  const statId = randomUUID();
  const now = Date.now();
  const ops: any[] = [
    adminDb.tx.stats[statId].update({
      title,
      censusVar,
      geography: geography || 'tract',
      lastUpdated: now,
    }),
  ];
  for (const v of values) {
    ops.push(
      adminDb.tx.statValues[randomUUID()].update({ geoid: v.geoid, value: v.value }).link({ stat: statId })
    );
  }
  await adminDb.transact(ops);
  return NextResponse.json({ id: statId });
}
