export interface CensusVariable {
  id: string;
  label: string;
  concept: string;
  keywords: string[];
}

export const CENSUS_VARIABLES: CensusVariable[] = [
  {
    id: 'B19013_001E',
    label: 'Median household income in the past 12 months',
    concept: 'INCOME IN THE PAST 12 MONTHS (IN 2023 INFLATION-ADJUSTED DOLLARS)',
    keywords: ['income', 'median', 'household', 'hh'],
  },
  {
    id: 'B19301_001E',
    label: 'Per capita income in the past 12 months',
    concept: 'INCOME IN THE PAST 12 MONTHS (IN 2023 INFLATION-ADJUSTED DOLLARS)',
    keywords: ['income', 'per', 'capita'],
  },
  {
    id: 'B01003_001E',
    label: 'Total population',
    concept: 'TOTAL POPULATION',
    keywords: ['population', 'total'],
  },
  {
    id: 'B01002_001E',
    label: 'Median age',
    concept: 'MEDIAN AGE BY SEX',
    keywords: ['age', 'median'],
  },
];
