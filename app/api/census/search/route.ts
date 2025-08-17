import { NextRequest, NextResponse } from 'next/server';

interface VarInfo { label: string }

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.toLowerCase() || '';
  const res = await fetch('https://api.census.gov/data/2022/acs/acs5/variables.json');
  const json = (await res.json()) as { variables: Record<string, VarInfo> };
  const vars = Object.entries(json.variables).map(([name, info]) => ({
    name,
    label: info.label
  }));
  const filtered = vars.filter(v => v.label.toLowerCase().includes(q)).slice(0, 20);
  return NextResponse.json(filtered);
}
