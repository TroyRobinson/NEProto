import type { FeatureCollection, Feature } from 'geojson';

export type GeoType = 'zip' | 'tract';

interface GeoConfig {
  boundaryUrl: string;
  boundaryIdProp: string;
  dataFor: string;
  dataIn: string;
  rowToId: (row: string[]) => string;
}

const GEO_CONFIG: Record<GeoType, GeoConfig> = {
  zip: {
    boundaryUrl:
      'https://raw.githubusercontent.com/OpenDataDE/State-zip-code-GeoJSON/master/ok_oklahoma_zip_codes_geo.min.json',
    boundaryIdProp: 'ZCTA5CE10',
    dataFor: 'zip%20code%20tabulation%20area:*',
    dataIn: 'state:40',
    rowToId: (row) => row[row.length - 1]
  },
  tract: {
    boundaryUrl:
      'https://raw.githubusercontent.com/censusreporter/census-shapefiles/master/geojson/2020/tracts/40.json',
    boundaryIdProp: 'GEOID',
    dataFor: 'tract:*',
    dataIn: 'state:40+county:*',
    rowToId: (row) => row[2] + row[3] + row[4]
  }
};

export async function fetchCensusChoropleth({
  geoType,
  variable,
  year = 2022
}: {
  geoType: GeoType;
  variable: string;
  year?: number;
}): Promise<FeatureCollection> {
  const config = GEO_CONFIG[geoType];

  const url = new URL(`https://api.census.gov/data/${year}/acs/acs5`);
  url.searchParams.set('get', `NAME,${variable}`);
  url.searchParams.set('for', config.dataFor);
  if (config.dataIn) url.searchParams.set('in', config.dataIn);

  const [geoResp, dataResp] = await Promise.all([
    fetch(config.boundaryUrl).then((r) => r.json()),
    fetch(url.toString()).then((r) => r.json())
  ]);

  const [_header, ...rows]: [string[], ...string[][]] = dataResp;
  const valueIdx = 1;
  const dataMap: Record<string, number> = {};
  rows.forEach((row) => {
    const id = config.rowToId(row);
    const val = Number(row[valueIdx]);
    dataMap[id] = isNaN(val) ? 0 : val;
  });

  const features = geoResp.features.map((f: Feature) => {
    const id = f.properties[config.boundaryIdProp];
    return {
      ...f,
      properties: { ...f.properties, value: dataMap[id] }
    };
  });

  return { type: 'FeatureCollection', features };
}
