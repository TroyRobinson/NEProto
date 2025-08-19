export interface Stat {
  id: string;
  variableId: string;
  title: string;
  description: string;
  category?: string;
  dataset: string;
  year: string;
  source: string;
  values: Record<string, number | null>;
}
