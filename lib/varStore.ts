export type CensusVar = {
  id: string;
  label: string;
  datasetPath: string;
};

export type CensusRow = {
  geoid: string;
  name: string;
  value: number;
  year: string;
};

const VARS_KEY = 'censusVars';
const DATA_PREFIX = 'censusData:';

export function loadSavedVars(): CensusVar[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(VARS_KEY);
    return raw ? (JSON.parse(raw) as CensusVar[]) : [];
  } catch {
    return [];
  }
}

export function saveVar(v: CensusVar): void {
  if (typeof window === 'undefined') return;
  const vars = loadSavedVars();
  if (!vars.some((x) => x.id === v.id && x.datasetPath === v.datasetPath)) {
    vars.push(v);
    localStorage.setItem(VARS_KEY, JSON.stringify(vars));
  }
}

export function saveVarData(id: string, rows: CensusRow[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(DATA_PREFIX + id, JSON.stringify(rows));
}

export function loadVarData(id: string): CensusRow[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(DATA_PREFIX + id);
    return raw ? (JSON.parse(raw) as CensusRow[]) : null;
  } catch {
    return null;
  }
}
