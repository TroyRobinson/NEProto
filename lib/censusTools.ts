import { addLog } from './logStore';
import { CURATED_VARIABLES } from './censusVariables';
import { COMMON_QUERY_MAP } from './censusQueryMap';

export interface CensusVariable {
  id: string;
  label: string;
  concept: string;
}

const variablesCache = new Map<string, Array<[string, { label: string; concept: string }]>>();
const searchCache = new Map<string, CensusVariable[]>();

const STOP_WORDS = new Set([
  'or',
  'and',
  'the',
  'a',
  'an',
  'population',
  'pop',
]);

export async function loadVariables(year: string, dataset: string) {
  const key = `${dataset}-${year}`;
  if (!variablesCache.has(key)) {
    addLog({
      service: 'US Census',
      direction: 'request',
      message: { endpoint: 'variables.json', year, dataset },
    });
    const resp = await fetch(`https://api.census.gov/data/${year}/${dataset}/variables.json`);
    const json = await resp.json();
    addLog({
      service: 'US Census',
      direction: 'response',
      message: { variables: Object.keys(json.variables).length, year, dataset },
    });
    variablesCache.set(
      key,
      Object.entries(json.variables as Record<string, { label: string; concept: string }>)
    );
  }
  return variablesCache.get(key)!;
}

export async function validateVariableId(id: string, year: string, dataset: string) {
  if (CURATED_VARIABLES.some((v) => v.id === id)) return true;
  const vars = await loadVariables(year, dataset);
  return vars.some(([vid]) => vid === id);
}

export async function searchCensus(
  query: string,
  year: string,
  dataset: string
): Promise<CensusVariable[]> {
  const q = query.toLowerCase().trim();
  const cacheKey = `${dataset}-${year}-${q}`;
  if (searchCache.has(cacheKey)) return searchCache.get(cacheKey)!;

  if (COMMON_QUERY_MAP[q]) {
    const { id, label, concept } = COMMON_QUERY_MAP[q];
    const result = [{ id, label, concept }];
    searchCache.set(cacheKey, result);
    return result;
  }

  const tokens = q.split(/\s+/).filter((t) => !STOP_WORDS.has(t));
  const curated = CURATED_VARIABLES.filter((v) =>
    tokens.every(
      (t) =>
        v.label.toLowerCase().includes(t) ||
        v.keywords.some((k) => k.includes(t))
    )
  ).map(({ id, label, concept }) => ({ id, label, concept }));

  if (curated.length) {
    searchCache.set(cacheKey, curated);
    return curated;
  }

  const vars = await loadVariables(year, dataset);
  addLog({
    service: 'US Census',
    direction: 'request',
    message: { type: 'search', query, year, dataset },
  });
  const results = vars
    .filter(([, info]) =>
      tokens.every((t) => info.label.toLowerCase().includes(t))
    )
    .slice(0, 5)
    .map(([id, info]) => ({ id, label: info.label, concept: info.concept }));
  searchCache.set(cacheKey, results);
  addLog({
    service: 'US Census',
    direction: 'response',
    message: results,
  });
  return results;
}
