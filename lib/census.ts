import type { Feature, Geometry } from 'geojson';
import { OKC_ZCTAS } from './okcZctas';

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

const metricCache = new Map<string, ZctaFeature[]>();

interface ZctaBoundary extends Feature {
  geometry: Geometry;
  properties: {
    ZCTA5CE10: string;
    [key: string]: unknown;
  };
}

// Cache boundary loads per state
const boundaryPromises = new Map<string, Promise<ZctaBoundary[]>>();

function inferStateFromZctas(zctas: string[]): 'OK' | 'KS' {
  // Heuristic based on ZIP ranges: KS 660–679, OK 730–749
  const sample = zctas.find(Boolean) || '';
  const prefix = Number(sample.slice(0, 3));
  if (!isNaN(prefix) && prefix >= 660 && prefix <= 679) return 'KS';
  return 'OK';
}

function boundaryUrlForState(state: 'OK' | 'KS'): string {
  const base = 'https://raw.githubusercontent.com/OpenDataDE/State-zip-code-GeoJSON/master';
  return state === 'KS'
    ? `${base}/ks_kansas_zip_codes_geo.min.json`
    : `${base}/ok_oklahoma_zip_codes_geo.min.json`;
}

async function loadZctaBoundariesFor(state: 'OK' | 'KS'): Promise<ZctaBoundary[]> {
  if (!boundaryPromises.has(state)) {
    const url = boundaryUrlForState(state);
    boundaryPromises.set(
      state,
      fetch(url)
        .then((res) => res.json())
        .then((geoJson) =>
          (geoJson.features as Array<{ geometry: Geometry; properties: Record<string, unknown> }>)
            .map((f) => ({
              type: 'Feature',
              geometry: f.geometry,
              properties: {
                ...(f.properties as Record<string, unknown>),
                ZCTA5CE10: String(f.properties['ZCTA5CE10']),
              },
            }))
        )
    );
  }
  return boundaryPromises.get(state)!;
}

export function prefetchZctaBoundaries() {
  // Prefetch OK boundaries by default
  loadZctaBoundariesFor('OK').catch(() => {});
}

export async function featuresFromZctaMap(
  zctaMap: Record<string, number | null>
): Promise<ZctaFeature[]> {
  const state = inferStateFromZctas(Object.keys(zctaMap));
  const boundaries = await loadZctaBoundariesFor(state);
  return boundaries
    .filter((f) => Object.prototype.hasOwnProperty.call(zctaMap, String(f.properties['ZCTA5CE10'])))
    .map((f) => ({
      type: 'Feature',
      geometry: f.geometry,
      properties: {
        ...f.properties,
        value: zctaMap[String(f.properties['ZCTA5CE10'])] ?? null,
      },
    }));
}

interface MetricOptions {
  year?: string;
  dataset?: string;
  zctas?: string[];
}

export async function fetchZctaMetric(
  variable: string,
  options: MetricOptions = {}
): Promise<ZctaFeature[]> {
  const { year = '2023', dataset = 'acs/acs5', zctas = OKC_ZCTAS } = options;
  const cacheKey = `${dataset}-${year}-${variable}-${zctas.join(',')}`;
  if (metricCache.has(cacheKey)) {
    return metricCache.get(cacheKey)!;
  }

  const values = new Map<string, number | null>();

  await log({
    service: 'US Census',
    direction: 'request',
    message: { type: 'metric', variable, year, dataset },
  });

  const res = await fetch(
    `https://api.census.gov/data/${year}/${dataset}?get=${variable}&for=zip%20code%20tabulation%20area:${zctas.join(',')}`
  );
  const json = await res.json();
  for (let i = 1; i < json.length; i++) {
    const raw = Number(json[i][0]);
    const zcta = String(json[i][1]);
    // Filter out large negative sentinel values that represent missing data
    const val = isNaN(raw) || raw < -100000 ? null : raw;
    values.set(zcta, val);
  }

  const state = inferStateFromZctas(zctas);
  const boundaries = await loadZctaBoundariesFor(state);

  const features: ZctaFeature[] = boundaries
    .filter((f) => zctas.includes(String(f.properties['ZCTA5CE10'])))
    .map((f) => ({
      type: 'Feature',
      geometry: f.geometry,
      properties: {
        ...f.properties,
        value: values.get(String(f.properties['ZCTA5CE10'])) ?? null,
      },
    }));

  await log({
    service: 'US Census',
    direction: 'response',
    message: { type: 'metric', variable, count: features.length },
  });

  metricCache.set(cacheKey, features);
  return features;
}
