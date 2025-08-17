import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const dataset = searchParams.get('dataset');
  const variable = searchParams.get('variable');
  if (!dataset || !variable) {
    return NextResponse.json(
      { error: 'dataset and variable required' },
      { status: 400 }
    );
  }
  try {
    const year = dataset.split('/')[0];
    const res = await fetch(
      `https://api.census.gov/data/${dataset}?get=NAME,${variable}&for=tract:*&in=state:40+county:109`
    );
    if (!res.ok) throw new Error(`Request failed with ${res.status}`);
    const json = await res.json();
    const headers: string[] = json[0];
    const nameIdx = headers.indexOf('NAME');
    const varIdx = headers.indexOf(variable);
    const stateIdx = headers.indexOf('state');
    const countyIdx = headers.indexOf('county');
    const tractIdx = headers.indexOf('tract');
    const data = json.slice(1).map((row: string[]) => ({
      geoid: `${row[stateIdx]}${row[countyIdx]}${row[tractIdx]}`,
      name: row[nameIdx],
      value: Number(row[varIdx]),
      year,
    }));
    return NextResponse.json(data);
  } catch (e) {
    console.error('Failed to load census variable', e);
    return NextResponse.json(
      { error: 'Failed to load census variable' },
      { status: 500 }
    );
  }
}
