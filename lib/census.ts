import type { FeatureCollection, Feature } from 'geojson';

export type Geography = 'state' | 'county' | 'zip';

const STAT_VAR = 'B01003_001E'; // Total population

// Fetch census geometries and statistics and merge into a FeatureCollection
type GeoFeature = Feature & { properties: Record<string, unknown> };

export async function fetchChoroplethData(geo: Geography): Promise<FeatureCollection> {
  let geomUrl: string;
  let statsUrl: string;
  let featureIdFn: (f: GeoFeature) => string;

  if (geo === 'state') {
    geomUrl = 'https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json';
    statsUrl = `https://api.census.gov/data/2022/acs/acs5?get=NAME,${STAT_VAR}&for=state:*`;
    featureIdFn = (f) => f.id; // state FIPS
  } else if (geo === 'county') {
    geomUrl = 'https://raw.githubusercontent.com/plotly/datasets/master/geojson-counties-fips.json';
    // Oklahoma counties only (state FIPS 40)
    statsUrl = `https://api.census.gov/data/2022/acs/acs5?get=NAME,${STAT_VAR}&for=county:*&in=state:40`;
    featureIdFn = (f) => f.id; // 5-digit FIPS (state+county)
  } else {
    // Zip Code Tabulation Areas for Oklahoma
    geomUrl = 'https://raw.githubusercontent.com/OpenDataDE/State-zip-code-GeoJSON/master/ok_oklahoma_zip_codes_geo.min.json';
    statsUrl = `https://api.census.gov/data/2022/acs/acs5?get=NAME,${STAT_VAR}&for=zip%20code%20tabulation%20area:*`;
    featureIdFn = (f) => f.properties?.ZCTA5CE10;
  }

  const [geom, stats] = await Promise.all([
    fetch(geomUrl).then((r) => r.json()),
    fetch(statsUrl).then((r) => r.json()),
  ]);

  const valueMap: Record<string, number> = {};
  const rows = (stats as string[][]).slice(1);
  if (geo === 'state') {
    rows.forEach((row) => {
      const [, value, id] = row;
      valueMap[id] = Number(value);
    });
  } else if (geo === 'county') {
    rows.forEach((row) => {
      const [, value, state, county] = row;
      valueMap[state + county] = Number(value);
    });
  } else {
    rows.forEach((row) => {
      const [, value, zcta] = row;
      valueMap[zcta] = Number(value);
    });
  }

  const features = (geom.features as GeoFeature[])
    .filter((f) => {
      if (geo === 'county') {
        const state = f.properties.STATE as string | undefined;
        return state === '40' || featureIdFn(f).startsWith('40');
      }
      return true;
    })
    .map((f) => {
      const id = featureIdFn(f);
      const value = valueMap[id];
      return { ...f, properties: { ...f.properties, value } } as GeoFeature;
    });

  return { type: 'FeatureCollection', features } as FeatureCollection;
}
