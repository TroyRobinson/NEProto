import { NextResponse } from 'next/server';
import { searchCensusVariables } from '../../../../lib/census';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') || '';
  if (!q) {
    return NextResponse.json([]);
  }
  const vars = await searchCensusVariables(q);
  return NextResponse.json(vars);
}
