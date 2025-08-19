import { NextRequest, NextResponse } from 'next/server';
import adminDb from '../../../lib/adminDb';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const variable = searchParams.get('variable');
  if (!variable) {
    return NextResponse.json({ error: 'variable required' }, { status: 400 });
  }

  const { stats } = await adminDb.query({
    stats: {
      where: { variable },
      values: {},
    },
  });

  const stat = (stats || [])[0];
  if (!stat) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  return NextResponse.json({ stat: { ...stat, values: undefined }, values: stat.values });
}
