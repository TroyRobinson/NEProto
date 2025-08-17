import { NextResponse } from 'next/server';
import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import type { CensusVariable } from '../../../types/census';

const DATA_PATH = path.join(process.cwd(), 'app', 'api', 'selected-variables', 'selected-variables.json');

export async function GET() {
  const text = await readFile(DATA_PATH, 'utf8');
  const vars: CensusVariable[] = JSON.parse(text);
  return NextResponse.json(vars);
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as CensusVariable;
    const text = await readFile(DATA_PATH, 'utf8');
    const vars: CensusVariable[] = JSON.parse(text);
    if (!vars.some(v => v.name === body.name && v.datasetPath === body.datasetPath)) {
      vars.push(body);
      await writeFile(DATA_PATH, JSON.stringify(vars, null, 2));
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('Failed to save variable', e);
    return NextResponse.json({ error: 'Failed to save variable' }, { status: 500 });
  }
}
