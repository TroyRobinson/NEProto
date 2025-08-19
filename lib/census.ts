import type { Feature, Geometry } from 'geojson';

export interface ZctaFeature extends Feature {
  geometry: Geometry;
  properties: {
    ZCTA5CE10: string;
    value: number | null;
    moe: number | null;
    [key: string]: unknown;
  };
}

export async function fetchZctaMetric(variable: string): Promise<ZctaFeature[]> {
  const res = await fetch(`/api/metric?id=${encodeURIComponent(variable)}`);
  const json = await res.json();
  return json.features as ZctaFeature[];
}
