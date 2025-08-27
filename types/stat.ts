export interface Stat {
  id: string;
  code: string;
  codeRaw?: string;
  description: string;
  dataset: string;
  source: string;
  year: number;
  region?: string;
  geography?: string;
  city?: string;
  data: string;
}
