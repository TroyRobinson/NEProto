/* eslint-disable @typescript-eslint/no-explicit-any */
import type { FeatureCollection, Feature } from 'geojson';

export interface ZipStats {
  zip: string;
  population: number;
  applications: number;
}

interface ZipFeature extends Feature {
  properties: {
    ZCTA5CE10: string;
    population: number;
    applications: number;
    [key: string]: any;
  };
}

interface ZipStatsResult {
  featureCollection: FeatureCollection;
  stats: ZipStats[];
}

export async function fetchZipStats(): Promise<ZipStatsResult> {
  if (typeof window !== 'undefined') {
    const cached = localStorage.getItem('zipStatsCache');
    if (cached) {
      try {
        return JSON.parse(cached) as ZipStatsResult;
      } catch {
        /* ignore corrupt cache */
      }
    }
  }
  // Fetch ZIP polygons for Oklahoma, then filter OKC ZIPs (731xx)
  const geoRes = await fetch(
    'https://raw.githubusercontent.com/OpenDataDE/State-zip-code-GeoJSON/master/ok_oklahoma_zip_codes_geo.min.json'
  );
  const geoJson = await geoRes.json();
  const features = (geoJson.features || []).filter(
    (f: any) => f.properties?.ZCTA5CE10?.startsWith('731')
  );

  const zipCodes = features.map((f: any) => f.properties.ZCTA5CE10);

  // Fetch population for each ZIP
  const popRes = await fetch(
    `https://api.census.gov/data/2021/acs/acs5?get=B01003_001E&for=zip%20code%20tabulation%20area:${zipCodes.join(',')}`
  );
  const popJson = await popRes.json();
  const popMap = new Map<string, number>(
    popJson.slice(1).map((row: any) => [row[1], Number(row[0])])
  );


  // Fetch median household income for each ZIP to vary application counts
  const incomeRes = await fetch(
    `https://api.census.gov/data/2021/acs/acs5?get=B19013_001E&for=zip%20code%20tabulation%20area:${zipCodes.join(',')}`
  );
  const incomeJson = await incomeRes.json();
  const incomeMap = new Map<string, number>(
    incomeJson.slice(1).map((row: any) => [row[1], Number(row[0])])
  );

  const weights: number[] = zipCodes.map((zip: string) => {
    const pop = popMap.get(zip) || 0;
    const income = incomeMap.get(zip) || 0;
    return pop * income;
  });
  const totalWeight = weights.reduce((a: number, b: number) => a + b, 0) || 1;

  // Fetch national Business Applications total (Dec 2023)
  const bfsParams = new URLSearchParams({
    get: 'cell_value,time_slot_id',
    for: 'us:1',
    time: '2023-12',
    data_type_code: 'BA_BA',
    category_code: 'TOTAL',
    seasonally_adj: 'no'
  });
  const bfsRes = await fetch(
    `https://api.census.gov/data/timeseries/eits/bfs?${bfsParams.toString()}`
  );
  if (!bfsRes.ok) {
    throw new Error('Failed to fetch Business Applications');
  }
  const bfsJson = await bfsRes.json();
  const bfsTotal = Number(bfsJson?.[1]?.[0]) || 0;

  const featuresWithStats: ZipFeature[] = features.map((f: any) => {
    const zip = f.properties.ZCTA5CE10;
    const pop = popMap.get(zip) || 0;
    const income = incomeMap.get(zip) || 0;
    const weight = pop * income;
    const applications = (bfsTotal * weight) / totalWeight;
    return {
      ...f,
      properties: {
        ...f.properties,
        population: pop,
        applications
      }
    } as ZipFeature;
  });

  const stats: ZipStats[] = featuresWithStats.map((f) => ({
    zip: f.properties.ZCTA5CE10,
    population: f.properties.population,
    applications: f.properties.applications
  }));
  const result = {
    featureCollection: {
      type: 'FeatureCollection',
      features: featuresWithStats
    } as FeatureCollection,
    stats
  };
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('zipStatsCache', JSON.stringify(result));
    } catch {
      /* ignore */
    }
  }
  return result;
}
