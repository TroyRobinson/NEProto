import { NextRequest, NextResponse } from 'next/server';
import { addLog } from '../../../lib/logStore';
import type { ZctaFeature } from '../../../lib/census';
import type { Geometry } from 'geojson';
import { init as initAdmin } from '@instantdb/admin';

const APP_ID = process.env.NEXT_PUBLIC_INSTANT_APP_ID;
const ADMIN_TOKEN = process.env.INSTANT_ADMIN_TOKEN;
const db = APP_ID && ADMIN_TOKEN ? initAdmin({ appId: APP_ID, adminToken: ADMIN_TOKEN }) : null;

export async function GET(req: NextRequest) {
  const variable = req.nextUrl.searchParams.get('id');
  if (!variable) {
    return NextResponse.json({ error: 'missing id' }, { status: 400 });
  }

  const cacheKey = `acs/acs5:2023:40109:${variable}`;
  let json: string[][] | null = null;

  if (db) {
    const result = await db.query({ acsCache: { $: { where: { key: cacheKey } } } });
    const entry = result.acsCache?.[0];
    if (entry && entry.fetchedAt > Date.now() - 86400_000) {
      json = JSON.parse(entry.rows);
    }
  }

  const wantMoe = variable.endsWith('_E');
  const moeVar = wantMoe ? variable.replace('_E', '_M') : null;
  const getVars = `NAME,${variable}${moeVar ? `,${moeVar}` : ''}`;

  if (!json) {
    addLog({
      service: 'US Census',
      direction: 'request',
      message: { type: 'metric', variable },
    });

    const url = `https://api.census.gov/data/2023/acs/acs5?get=${getVars}&ucgid=pseudo(0500000US40109$8600000)`;
    const res = await fetch(url, {
      next: { revalidate: 86400, tags: ['acs-2023', 'ok-40109'] },
    });
    json = await res.json();
    if (db) {
      await db.transact([
        db.tx.acsCache[cacheKey].update({
          key: cacheKey,
          rows: JSON.stringify(json),
          fetchedAt: Date.now(),
          source: url,
        }),
      ]);
    }
  }

  if (!json) {
    return NextResponse.json({ error: 'failed to load data' }, { status: 500 });
  }

  const values = new Map<string, { value: number | null; moe: number | null }>();
  for (let i = 1; i < json.length; i++) {
    const row = json[i] as string[];
    const name = row[0];
    const rawVal = row[1];
    const rawMoe = row[2];
    const zcta = name.split(' ')[1];
    const raw = Number(rawVal);
    const val = isNaN(raw) || raw < -100000 ? null : raw;
    let moe: number | null = null;
    if (wantMoe && rawMoe !== undefined) {
      const m = Number(rawMoe);
      moe = isNaN(m) || m < -100000 ? null : m;
    }
    values.set(zcta, { value: val, moe });
  }

  const geoRes = await fetch(
    'https://raw.githubusercontent.com/OpenDataDE/State-zip-code-GeoJSON/master/ok_oklahoma_zip_codes_geo.min.json',
    { next: { revalidate: 86400 } }
  );
  const geoJson = await geoRes.json();

  const features: ZctaFeature[] = (geoJson.features as Array<{
    geometry: Geometry;
    properties: Record<string, unknown>;
  }>)
    .filter((f) => values.has(String(f.properties['ZCTA5CE10'])))
    .map((f) => {
      const { value, moe } = values.get(String(f.properties['ZCTA5CE10']))!;
      return {
        type: 'Feature',
        geometry: f.geometry,
        properties: {
          ...(f.properties as Record<string, unknown>),
          ZCTA5CE10: String(f.properties['ZCTA5CE10']),
          value,
          moe,
        },
      };
    });

  addLog({
    service: 'US Census',
    direction: 'response',
    message: { type: 'metric', variable, count: features.length },
  });

  return NextResponse.json({ features });
}
