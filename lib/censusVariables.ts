export interface CensusVariableInfo {
  id: string;
  label: string;
  concept: string;
  keywords: string[];
}

export const CURATED_VARIABLES: CensusVariableInfo[] = [
  {
    id: 'B19013_001E',
    label: 'Median Household Income',
    concept: 'INCOME IN THE PAST 12 MONTHS (IN 2023 INFLATION-ADJUSTED DOLLARS)',
    keywords: ['median', 'household', 'income', 'hh'],
  },
  {
    id: 'B01003_001E',
    label: 'Total Population',
    concept: 'TOTAL POPULATION',
    keywords: ['population', 'people', 'total'],
  },
  {
    id: 'B19301_001E',
    label: 'Per Capita Income',
    concept: 'INCOME IN THE PAST 12 MONTHS (IN 2023 INFLATION-ADJUSTED DOLLARS)',
    keywords: ['per', 'capita', 'income'],
  },
];
