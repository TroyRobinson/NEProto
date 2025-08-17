export interface CensusVariable {
  name: string;
  label: string;
  concept: string;
}

let cached: CensusVariable[] | null = null;

export async function fetchCensusVariables(): Promise<CensusVariable[]> {
  if (cached) return cached;
  const res = await fetch('https://api.census.gov/data/2021/acs/acs5/variables.json');
  if (!res.ok) {
    throw new Error('Failed to load census variables');
  }
  const json = await res.json();
  type VariableInfo = { label: string; concept: string };
  const vars = json.variables as Record<string, VariableInfo>;
  const variables = Object.entries(vars).map(([name, info]) => ({
    name,
    label: info.label,
    concept: info.concept
  }));
  cached = variables;
  return variables;
}
