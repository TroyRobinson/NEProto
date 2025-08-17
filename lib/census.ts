export interface CensusFetchOptions {
  variable: string;
  dataset?: string;
  geography: string;
  state?: string;
  county?: string;
}

export async function fetchCensusData(options: CensusFetchOptions): Promise<Record<string, number>> {
  const { variable, dataset = 'acs/acs5', geography, state = '40', county } = options;
  const geo = `${encodeURIComponent(geography)}:*`;
  let url = `https://api.census.gov/data/2022/${dataset}?get=${variable}&for=${geo}&in=state:${state}`;
  if (county) {
    url += `%20county:${county}`;
  }
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Census API error ${res.status}`);
  }
  const json = await res.json();
  const headers = json[0];
  const variableIndex = headers.indexOf(variable);
  const geoIndex = headers.length - 1;
  const data: Record<string, number> = {};
  for (let i = 1; i < json.length; i++) {
    const row = json[i];
    const geoid = row[geoIndex];
    const val = Number(row[variableIndex]);
    if (!isNaN(val)) {
      data[geoid] = val;
    }
  }
  return data;
}

export async function searchCensusVariables(dataset: string, query: string) {
  const url = `https://api.census.gov/data/2022/${dataset}/variables.json`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Census API error ${res.status}`);
  }
  const json = await res.json();
  const variables = json.variables || {};
  return Object.keys(variables)
    .filter(key => variables[key].label.toLowerCase().includes(query.toLowerCase()))
    .map(key => ({ name: key, label: variables[key].label }));
}
