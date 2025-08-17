import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const dataset = searchParams.get('dataset');
  const variable = searchParams.get('variable');
  if (!dataset || !variable) {
    return NextResponse.json(
      { error: 'Missing dataset or variable parameter' },
      { status: 400 }
    );
  }
  try {
    const res = await fetch(
      `https://api.census.gov/data/${dataset}?get=NAME,${variable}&for=tract:*&in=state:40+county:109`
    );
    if (!res.ok) {
      throw new Error(`Request failed with ${res.status}`);
    }
    const json = await res.json();
    const headers = json[0];
    const nameIdx = headers.indexOf('NAME');
    const varIdx = headers.indexOf(variable);
    const stateIdx = headers.indexOf('state');
    const countyIdx = headers.indexOf('county');
    const tractIdx = headers.indexOf('tract');
    const year = dataset.split('/')[0];
    const rows = json.slice(1).map((row: string[]) => ({
      geoid: `${row[stateIdx]}${row[countyIdx]}${row[tractIdx]}`,
      name: row[nameIdx],
      value: Number(row[varIdx]),
      year,
    }));
    return NextResponse.json({ rows });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to load variable data';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
