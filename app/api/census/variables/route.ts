import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory cache keyed by year
const cache: Record<string, [string, { label?: string; concept?: string }][]> = {};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const year = searchParams.get('year') ?? '2021';
  const refresh = searchParams.get('refresh') === '1' || searchParams.get('refresh') === 'true';

  if (!refresh && cache[year]) {
    return NextResponse.json(cache[year]);
  }

  const res = await fetch(`https://api.census.gov/data/${year}/acs/acs5/variables.json`);
  if (!res.ok) {
    return NextResponse.json({ error: 'Failed to fetch variables' }, { status: 500 });
  }
  const json = await res.json();
  const entries = Object.entries(json.variables as Record<string, { label?: string; concept?: string }>);
  const condensed: [string, { label?: string; concept?: string }][] = entries.map(
    ([id, meta]) => [id, { label: meta.label, concept: meta.concept }]
  );

  cache[year] = condensed;
  return NextResponse.json(condensed);
}
