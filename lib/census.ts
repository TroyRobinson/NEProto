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

export interface GeoFeature extends Feature {
  geometry: Geometry;
  properties: {
    id: string;
    name?: string;
    value: number | null;
    [key: string]: unknown;
  };
}

const metricCache = new Map<string, GeoFeature[]>();

interface BoundaryFeature extends Feature {
  geometry: Geometry;
  properties: {
    id: string;
    name?: string;
    [key: string]: unknown;
  };
}

let zctaBoundaryPromise: Promise<BoundaryFeature[]> | null = null;
let countyBoundaryPromise: Promise<BoundaryFeature[]> | null = null;

async function loadZctaBoundaries(): Promise<BoundaryFeature[]> {
  if (!zctaBoundaryPromise) {
    zctaBoundaryPromise = fetch(
      'https://raw.githubusercontent.com/OpenDataDE/State-zip-code-GeoJSON/master/ok_oklahoma_zip_codes_geo.min.json'
    )
      .then((res) => res.json())
      .then((geoJson) =>
        (geoJson.features as Array<{ geometry: Geometry; properties: Record<string, unknown> }>)
          .map((f) => ({
            type: 'Feature',
            geometry: f.geometry,
            properties: {
              id: String(f.properties['ZCTA5CE10']),
              name: String(f.properties['ZCTA5CE10']),
            },
          }))
      );
  }
  return zctaBoundaryPromise;
}

async function loadCountyBoundaries(): Promise<BoundaryFeature[]> {
  if (!countyBoundaryPromise) {
    countyBoundaryPromise = fetch(
      'https://raw.githubusercontent.com/codeforamerica/click_that_hood/master/public/data/oklahoma-counties.geojson'
    )
      .then((res) => res.json())
      .then((geoJson) =>
        (geoJson.features as Array<{ geometry: Geometry; properties: Record<string, unknown> }>)
          .map((f) => ({
            type: 'Feature',
            geometry: f.geometry,
            properties: {
              id: String(f.properties['county']).padStart(3, '0'),
              name: String(f.properties['name']),
            },
          }))
      );
  }
  return countyBoundaryPromise;
}

export function prefetchZctaBoundaries() {
  loadZctaBoundaries().catch(() => {});
}

export function prefetchCountyBoundaries() {
  loadCountyBoundaries().catch(() => {});
}

export async function featuresFromMap(
  map: Record<string, number | null>,
  geography: 'zip code tabulation area' | 'county',
): Promise<GeoFeature[]> {
  const boundaries =
    geography === 'county' ? await loadCountyBoundaries() : await loadZctaBoundaries();
  return boundaries
    .filter((f) => Object.prototype.hasOwnProperty.call(map, f.properties.id))
    .map((f) => ({
      type: 'Feature',
      geometry: f.geometry,
      properties: {
        ...f.properties,
        value: map[f.properties.id] ?? null,
      },
    }));
}

interface MetricOptions {
  year?: string;
  dataset?: string;
  geography?: 'zip code tabulation area' | 'county';
  ids?: string[];
}

export async function fetchMetric(
  variable: string,
  options: MetricOptions = {},
): Promise<GeoFeature[]> {
  const {
    year = '2023',
    dataset = 'acs/acs5',
    geography = 'zip code tabulation area',
    ids,
  } = options;

  let geoIds = ids;
  let query = '';
  if (geography === 'zip code tabulation area') {
    geoIds = geoIds ?? OKC_ZCTAS;
    query = `for=zip%20code%20tabulation%20area:${geoIds.join(',')}`;
  } else if (geography === 'county') {
    const boundaries = await loadCountyBoundaries();
    geoIds = geoIds ?? boundaries.map((b) => b.properties.id);
    query = `for=county:${geoIds.join(',')}&in=state:40`;
  } else {
    throw new Error('Unsupported geography');
  }

  const cacheKey = `${dataset}-${year}-${geography}-${variable}-${geoIds.join(',')}`;
  if (metricCache.has(cacheKey)) {
    return metricCache.get(cacheKey)!;
  }

  const values = new Map<string, number | null>();

  await log({
    service: 'US Census',
    direction: 'request',
    message: { type: 'metric', variable, year, dataset },
  });

  const res = await fetch(`https://api.census.gov/data/${year}/${dataset}?get=${variable}&${query}`);
  const json = await res.json();
  for (let i = 1; i < json.length; i++) {
    const raw = Number(json[i][0]);
    const id = String(json[i][1]);
    // Filter out large negative sentinel values that represent missing data
    const val = isNaN(raw) || raw < -100000 ? null : raw;
    values.set(id, val);
  }

  const boundaries =
    geography === 'county' ? await loadCountyBoundaries() : await loadZctaBoundaries();

  const features: GeoFeature[] = boundaries
    .filter((f) => geoIds!.includes(f.properties.id))
    .map((f) => ({
      type: 'Feature',
      geometry: f.geometry,
      properties: {
        ...f.properties,
        value: values.get(f.properties.id) ?? null,
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
