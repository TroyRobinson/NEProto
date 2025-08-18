import type { Feature, Geometry } from 'geojson';

async function log(entry: {
  service: string;
  direction: 'request' | 'response';
  message: unknown;
}) {
  try {
    await fetch('/api/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    });
  } catch {
    // ignore logging errors on client
  }
}

export interface ZctaFeature extends Feature {
  geometry: Geometry;
  properties: {
    ZCTA5CE10: string;
    value: number | null;
    [key: string]: unknown;
  };
}

export async function fetchZctaMetric(
  variable: string,
  year = '2023'
): Promise<ZctaFeature[]> {
  await log({
    service: 'US Census',
    direction: 'request',
    message: { type: 'metric', variable, year },
  });

  const res = await fetch(
    `https://api.census.gov/data/${year}/acs/acs5?get=NAME,${variable}&ucgid=pseudo(0500000US40109$8600000)`
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
    'https://raw.githubusercontent.com/OpenDataDE/State-zip-code-GeoJSON/master/ok_oklahoma_zip_codes_geo.min.json'
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

  await log({
    service: 'US Census',
    direction: 'response',
    message: { type: 'metric', variable, count: features.length },
  });

  return features;
}
