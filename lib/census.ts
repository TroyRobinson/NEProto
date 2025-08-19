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

type BoundaryFeature = { geometry: Geometry; properties: Record<string, unknown> };

const metricCache = new Map<string, ZctaFeature[]>();
let boundaryCache: BoundaryFeature[] | null = null;
let boundaryPromise: Promise<BoundaryFeature[]> | null = null;

async function loadZctaBoundaries(): Promise<BoundaryFeature[]> {
  if (boundaryCache) return boundaryCache;
  if (!boundaryPromise) {
    boundaryPromise = fetch(
      'https://raw.githubusercontent.com/OpenDataDE/State-zip-code-GeoJSON/master/ok_oklahoma_zip_codes_geo.min.json',
    )
      .then((res) => res.json())
      .then((json) => (boundaryCache = json.features as BoundaryFeature[]));
  }
  return boundaryPromise;
}

export function preloadZctaBoundaries(): void {
  void loadZctaBoundaries();
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

  const boundaries = await loadZctaBoundaries();

  const features: ZctaFeature[] = boundaries
    .filter((f) => zctas.includes(String(f.properties['ZCTA5CE10'])))
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

  metricCache.set(cacheKey, features);
  return features;
}
