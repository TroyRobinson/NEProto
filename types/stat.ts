export interface StatValue {
  id: string;
  zcta: string;
  value: number | null;
}

export interface Stat {
  id: string;
  variable: string;
  title: string;
  description: string;
  category: string;
  dataset: string;
  year: string;
  source: string;
  updatedAt: number;
  values?: StatValue[];
}
