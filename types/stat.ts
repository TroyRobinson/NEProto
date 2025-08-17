export interface Stat {
  id: string;
  title: string;
  variable: string;
  dataset: string;
  geography: string;
  data: string;
  lastUpdated: number;
  refreshCadence?: string;
}
