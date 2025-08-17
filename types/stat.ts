export interface StatValue {
  id: string;
  geoid: string;
  value: number;
}

export interface Stat {
  id: string;
  title: string;
  variable: string;
  geography: string;
  lastUpdated: number;
  refreshCadence?: string;
  values: StatValue[];
}
