export interface CensusFetchOptions {
  variable: string;
  dataset: string; // e.g., 'acs/acs5' or 'acs/acs5/subject'
  geography: string; // e.g., 'tract'
  state?: string; // default 40 (Oklahoma)
  county?: string; // optional
}

export async function fetchCensusData(options: CensusFetchOptions): Promise<Record<string, number>> {
  const { variable, dataset, geography, state = '40', county } = options;
  const geo = encodeURIComponent(geography);
  let url = `https://api.census.gov/data/2022/${dataset}?get=${variable}&for=${geo}:*`;
  if (county) {
    url += `&in=state:${state}%20county:${county}`;
  } else {
    url += `&in=state:${state}`;
  }

  const res = await fetch(url);
  const json = await res.json();
  const headers: string[] = json[0];
  const variableIndex = headers.indexOf(variable);
  const geoIndexes = headers
    .map((h, i) => (i !== variableIndex ? i : -1))
    .filter((i): i is number => i >= 0);

  const data: Record<string, number> = {};
  for (let i = 1; i < json.length; i++) {
    const row = json[i];
    const geoid = geoIndexes.map(idx => row[idx]).join('');
    const val = Number(row[variableIndex]);
    if (!isNaN(val)) {
      data[geoid] = val;
    }
  }
  return data;
}

export async function searchCensusVariables(query: string) {
  const datasets = ['acs/acs5/subject', 'acs/acs5'];
  const results: { name: string; label: string; dataset: string }[] = [];
  await Promise.all(
    datasets.map(async (ds) => {
      const res = await fetch(`https://api.census.gov/data/2022/${ds}/variables.json`);
      const json = await res.json();
      const variables = json.variables || {};
      Object.keys(variables).forEach((key) => {
        const label = variables[key].label || '';
        if (label.toLowerCase().includes(query.toLowerCase())) {
          results.push({ name: key, label, dataset: ds });
        }
      });
    })
  );
  return results;
}
