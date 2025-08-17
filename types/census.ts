export interface CensusVariable {
  name: string;
  label: string;
  datasetPath: string;
}

export interface CensusRecord {
  geoid: string;
  name: string;
  value: number;
  year: string;
}
