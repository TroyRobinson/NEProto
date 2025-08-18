import type { Feature, Geometry } from 'geojson';

export interface ZctaFeature extends Feature {
  geometry: Geometry;
  properties: {
    ZCTA5CE10: string;
    value: number | null;
    [key: string]: unknown;
  };
}

const OKC_ZCTAS = [
  '73003', '73007', '73008', '73012', '73013', '73020', '73025', '73034', '73045',
  '73049', '73054', '73066', '73078', '73084', '73097', '73102', '73103', '73104',
  '73105', '73106', '73107', '73108', '73109', '73110', '73111', '73112', '73114',
  '73115', '73116', '73117', '73118', '73119', '73120', '73121', '73122', '73127',
  '73128', '73129', '73130', '73131', '73132', '73134', '73135', '73139', '73141',
  '73142', '73145', '73149', '73150', '73151', '73159', '73162', '73169', '73179',
  '74857'
];

export async function fetchZctaMetric(
  variable: string,
  year = '2021'
): Promise<ZctaFeature[]> {
  const values = new Map<string, number | null>();

  await Promise.all(
    OKC_ZCTAS.map(async (zcta) => {
      const res = await fetch(
        `https://api.census.gov/data/${year}/acs/acs5?get=${variable}&for=zip%20code%20tabulation%20area:${zcta}`
      );
      const json = await res.json();
      const raw = Number(json[1][0]);
      // Filter out large negative sentinel values that represent missing data
      const val = isNaN(raw) || raw < -100000 ? null : raw;
      values.set(zcta, val);
    })
  );

  const geoRes = await fetch(
    'https://raw.githubusercontent.com/OpenDataDE/State-zip-code-GeoJSON/master/ok_oklahoma_zip_codes_geo.min.json'
  );
  const geoJson = await geoRes.json();

  const features: ZctaFeature[] = (geoJson.features as Array<{
    geometry: Geometry;
    properties: Record<string, unknown>;
  }>)
    .filter((f) => OKC_ZCTAS.includes(String(f.properties['ZCTA5CE10'])))
    .map((f) => ({
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
