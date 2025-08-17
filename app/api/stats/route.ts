import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import adminDb from '@/lib/admin';
import { POST as refresh } from './[id]/refresh/route';

export async function POST(request: Request) {
  const { title, variable, geographyType, refreshCadence } = await request.json();
  const id = randomUUID();
  try {
    await adminDb.transact([
      adminDb.tx.stats[id].update({
        title,
        variable,
        geographyType,
        lastUpdated: 0,
        refreshCadence: refreshCadence || 'manual',
      }),
    ]);
    // refresh data immediately
    await refresh(request, { params: { id } });
    return NextResponse.json({ id });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

