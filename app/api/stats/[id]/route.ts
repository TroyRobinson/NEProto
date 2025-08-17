/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import adminDb from '../../../../lib/admin';
import { fetchOKCData } from '../../../../lib/census';

export async function POST(request: Request, context: { params: { id: string } }) {
  const id = context.params.id;
  const statRes: any = await adminDb.query({
    stats: { $: { where: { id }, limit: 1 } }
  });
  const stat = statRes.stats[0];
  if (!stat) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const values = await fetchOKCData(stat.censusVar);
  const existing: any = await adminDb.query({
    statValues: { $: { where: { 'stat.id': id } } }
  });
  const ops: any[] = existing.statValues.map((v: any) => adminDb.tx.statValues[v.id].delete());
  ops.push(adminDb.tx.stats[id].update({ lastUpdated: Date.now() }));
  for (const v of values) {
    ops.push(
      adminDb.tx.statValues[randomUUID()].update({ geoid: v.geoid, value: v.value }).link({ stat: id })
    );
  }
  await adminDb.transact(ops);
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, context: { params: { id: string } }) {
  const id = context.params.id;
  const existing: any = await adminDb.query({
    statValues: { $: { where: { 'stat.id': id } } }
  });
  const ops: any[] = existing.statValues.map((v: any) => adminDb.tx.statValues[v.id].delete());
  ops.push(adminDb.tx.stats[id].delete());
  await adminDb.transact(ops);
  return NextResponse.json({ ok: true });
}
