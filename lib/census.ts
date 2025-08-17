/* eslint-disable @typescript-eslint/no-explicit-any */
export async function fetchOKCData(variable: string) {
  const url = `https://api.census.gov/data/2022/acs/acs5/profile?get=${variable}&for=tract:*&in=state:40+place:55000`;
  const res = await fetch(url);
  const data = await res.json();
  const headers = data[0];
  const varIndex = headers.indexOf(variable);
  const tractIndex = headers.indexOf('tract');
  return data.slice(1).map((row: string[]) => ({
    geoid: row[tractIndex],
    value: parseFloat(row[varIndex]),
  }));
}

export async function searchCensusVariables(query: string) {
  const res = await fetch('https://api.census.gov/data/2022/acs/acs5/profile/variables.json');
  const json = await res.json();
  const entries = Object.entries(json.variables) as [string, any][];
  return entries
    .filter(([, info]) => info.label.toLowerCase().includes(query.toLowerCase()))
    .map(([name, info]) => ({ name, label: info.label }));
}

export async function fetchOKCTractGeoJSON() {
  const url = 'https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Tracts_Blocks/MapServer/9/query?where=STATE%3D40+AND+PLACE%3D55000&outFields=GEOID&f=geojson';
  const res = await fetch(url);
  return res.json();
}
