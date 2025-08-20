import type { CensusVariableInfo } from './censusVariables';
import { CURATED_VARIABLES } from './censusVariables';

function find(id: string): CensusVariableInfo {
  const variable = CURATED_VARIABLES.find((v) => v.id === id);
  if (!variable) {
    throw new Error(`Unknown variable id ${id}`);
  }
  return variable;
}

export const COMMON_QUERY_MAP: Record<string, CensusVariableInfo> = {
  'median household income': find('B19013_001E'),
  'median income': find('B19013_001E'),
  'total population': find('B01003_001E'),
  population: find('B01003_001E'),
  'per capita income': find('B19301_001E'),
  latino: find('B03003_003E'),
  'latino population': find('B03003_003E'),
  hispanic: find('B03003_003E'),
  'hispanic population': find('B03003_003E'),
  'hispanic or latino population': find('B03003_003E'),
};
