export interface Stat {
  id: string;
  title: string;
  variable: string;
  geographyType: string;
  lastUpdated: number;
  refreshCadence?: string;
  values?: StatValue[];
}

export interface StatValue {
  id: string;
  geoid: string;
  value: number;
  stat?: { id: string };
}
