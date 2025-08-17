export interface CensusValue {
  geoid: string;
  value: number;
}

export async function fetchCensusStat(variable: string, geography: string): Promise<CensusValue[]> {
  const baseUrl = 'https://api.census.gov/data/2022/acs/acs5';
  let url = '';
  if (geography === 'tract') {
    // Query all tracts in Oklahoma and filter client-side to those within OKC
    // The Census API does not support `place` as a qualifier for `tract`
    url = `${baseUrl}?get=NAME,${variable}&for=tract:*&in=state:40`;
  } else {
    url = `${baseUrl}?get=NAME,${variable}&for=place:55000&in=state:40`;
  }
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error('Failed to fetch census data');
  }
  const json = await res.json();
  const [header, ...rows] = json as string[][];
  const valueIndex = header.indexOf(variable);
  const geoIndex = header.indexOf('tract') !== -1 ? header.indexOf('tract') : header.indexOf('place');
  return rows.map(r => ({ geoid: r[geoIndex], value: Number(r[valueIndex]) }));
}
