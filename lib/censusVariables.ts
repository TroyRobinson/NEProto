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
  {
    id: 'B01002_001E',
    label: 'Median Age',
    concept: 'Median Age -- Total',
    keywords: ['median', 'age'],
  },
  {
    id: 'B03003_003E',
    label: 'Hispanic or Latino population',
    concept: 'Hispanic or Latino Origin',
    keywords: ['hispanic', 'latino'],
  },
  {
    id: 'P1_001N',
    label: 'Total Population (Decennial)',
    concept: 'P1: RACE -- Total population',
    keywords: ['population', 'people', 'total', 'decennial'],
  },
  {
    id: 'H1_001N',
    label: 'Total Housing Units',
    concept: 'H1: OCCUPANCY STATUS -- Housing units',
    keywords: ['housing', 'units', 'total', 'decennial'],
  },
];
