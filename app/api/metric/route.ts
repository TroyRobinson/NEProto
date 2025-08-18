import { NextRequest, NextResponse } from 'next/server';
import { addLog } from '../../../lib/logStore';
import type { ZctaFeature } from '../../../lib/census';
import type { Geometry } from 'geojson';

export async function GET(req: NextRequest) {
  const variable = req.nextUrl.searchParams.get('id');
  if (!variable) {
    return NextResponse.json({ error: 'missing id' }, { status: 400 });
  }

  addLog({
    service: 'US Census',
    direction: 'request',
    message: { type: 'metric', variable },
  });

  const res = await fetch(
    `https://api.census.gov/data/2023/acs/acs5?get=NAME,${variable}&ucgid=pseudo(0500000US40109$8600000)`,
    { next: { revalidate: 86400, tags: ['acs-2023', 'ok-40109'] } }
  );
  const json = await res.json();

  const values = new Map<string, number | null>();
  for (let i = 1; i < json.length; i++) {
    const [name, rawVal] = json[i] as [string, string];
    const zcta = name.split(' ')[1];
    const raw = Number(rawVal);
    const val = isNaN(raw) || raw < -100000 ? null : raw;
    values.set(zcta, val);
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
    .map((f) => ({
      type: 'Feature',
      geometry: f.geometry,
      properties: {
        ...(f.properties as Record<string, unknown>),
        ZCTA5CE10: String(f.properties['ZCTA5CE10']),
        value: values.get(String(f.properties['ZCTA5CE10'])) ?? null,
      },
    }));

  addLog({
    service: 'US Census',
    direction: 'response',
    message: { type: 'metric', variable, count: features.length },
  });

  return NextResponse.json({ features });
}
