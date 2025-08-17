import { NextResponse } from 'next/server';
import adminDb from '@/lib/admin';

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const statId = params.id;
  try {
    const existing = await adminDb.query({
      statValues: { $: { where: { 'stat.id': statId } } },
    });
    const existingValues = existing.statValues as Array<{ id: string }>;
    const tx: unknown[] = existingValues.map((v) => adminDb.tx.statValues[v.id].delete());
    tx.push(adminDb.tx.stats[statId].delete());
    await adminDb.transact(tx);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

