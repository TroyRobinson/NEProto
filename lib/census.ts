import type { Feature, Geometry } from 'geojson';

export interface ZctaFeature extends Feature {
  geometry: Geometry;
  properties: {
    ZCTA5CE10: string;
    value: number | null;
    [key: string]: unknown;
  };
}

export async function fetchZctaMetric(variable: string): Promise<ZctaFeature[]> {
  const dataRes = await fetch(
    `https://api.census.gov/data/2021/acs/acs5?get=NAME,${variable}&for=zip%20code%20tabulation%20area:*&in=state:40`
  );
  const dataJson = await dataRes.json();
  const values = new Map<string, number | null>();
  for (const row of dataJson.slice(1)) {
    const zip = row[2];
    const val = Number(row[1]);
    values.set(zip, isNaN(val) ? null : val);
  }

  const geoRes = await fetch(
    'https://raw.githubusercontent.com/OpenDataDE/State-zip-code-GeoJSON/master/ok_oklahoma_zip_codes_geo.min.json'
  );
  const geoJson = await geoRes.json();

  const features: ZctaFeature[] = (geoJson.features as Array<{
    geometry: Geometry;
    properties: Record<string, unknown>;
  }>).map((f) => ({
    type: 'Feature',
    geometry: f.geometry,
    properties: {
      ...(f.properties as Record<string, unknown>),
      ZCTA5CE10: String(f.properties['ZCTA5CE10']),
      value: values.get(String(f.properties['ZCTA5CE10'])) ?? null,
    },
  }));

  return features;
}
