import { NextResponse } from 'next/server';

const VARIABLES_URL = 'https://api.census.gov/data/2022/acs/acs5/profile/variables.json';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.toLowerCase() || '';

  try {
    const resp = await fetch(VARIABLES_URL);
    const json = (await resp.json()) as { variables: Record<string, { label: string }> };
    const variables = Object.entries(json.variables) as Array<[string, { label: string }]>;
    const results = variables
      .filter(([name, v]) =>
        name.toLowerCase().includes(q) || v.label.toLowerCase().includes(q)
      )
      .slice(0, 50)
      .map(([name, v]) => ({ id: name, label: v.label }));
    return NextResponse.json({ results });
  } catch (e) {
    return NextResponse.json({ results: [], error: String(e) }, { status: 500 });
  }
}

