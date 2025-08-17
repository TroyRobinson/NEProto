import type { FeatureCollection, Feature, Polygon, MultiPolygon } from 'geojson';

export type Geography = 'zcta' | 'tract' | 'county';

const TIGER_LAYER_IDS: Record<Geography, number> = {
  // Layer ids based on TIGERweb/tigerWMS_Current MapServer
  // https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/tigerWMS_Current/MapServer
  // zcta5 layer id 86, census tract layer id 14, county layer id 6
  zcta: 86,
  tract: 14,
  county: 6
};

const GEO_FOR_MAP: Record<Geography, string> = {
  zcta: 'zip+code+tabulation+area',
  tract: 'tract',
  county: 'county'
};

const GEO_ID_FIELD: Record<Geography, string> = {
  zcta: 'GEOID10',
  tract: 'GEOID',
  county: 'GEOID'
};

const STATE_FIPS = '40'; // Oklahoma

export interface ChoroplethOptions {
  variable: string; // e.g. B01003_001E total population
  geography: Geography;
  bbox?: [number, number, number, number]; // [west, south, east, north]
}

export async function fetchChoropleth({ variable, geography, bbox }: ChoroplethOptions): Promise<FeatureCollection> {
  // Fetch statistic values from Census Data API
  const geoFor = GEO_FOR_MAP[geography];
  const geoParam = `for=${geoFor}:*&in=state:${STATE_FIPS}`;
  const dataUrl = `https://api.census.gov/data/2021/acs/acs5?get=NAME,${variable}&${geoParam}`;
  const resp = await fetch(dataUrl);
  const json = (await resp.json()) as string[][];
  const headers = json[0];
  const records = json.slice(1);
  const valueIdx = headers.indexOf(variable);
  const geoIdx = headers.findIndex((h: string) => h.includes(geoFor));
  const values: Record<string, number> = {};
  records.forEach((row) => {
    values[row[geoIdx]] = Number(row[valueIdx]);
  });

  // Fetch geometry from TIGERweb
  const layer = TIGER_LAYER_IDS[geography];
  let url = `https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/tigerWMS_Current/MapServer/${layer}/query` +
    `?where=STATE='${STATE_FIPS}'&outFields=GEOID,GEOID10&outSR=4326&f=geojson`;
  if (bbox) {
    const [minX, minY, maxX, maxY] = bbox;
    url += `&geometry=${minX},${minY},${maxX},${maxY}&geometryType=esriGeometryEnvelope&spatialRel=esriSpatialRelIntersects&inSR=4326`;    
  }
  const geoResp = await fetch(url);
  const geoJson = (await geoResp.json()) as FeatureCollection;

  // attach values
  geoJson.features.forEach((f: Feature<Polygon | MultiPolygon, Record<string, unknown>>) => {
    const geoIdField = GEO_ID_FIELD[geography];
    const id = (f.properties?.[geoIdField] as string) || '';
    f.properties = {
      ...f.properties,
      value: values[id] ?? null
    };
  });
  return geoJson;
}

export function colorScale(value: number | null, min: number, max: number): [number, number, number, number] {
  if (value === null || isNaN(value)) {
    return [200, 200, 200, 80];
  }
  const t = (value - min) / (max - min || 1);
  const r = Math.round(255 * t);
  const b = Math.round(255 * (1 - t));
  return [r, 100, b, 180];
}
