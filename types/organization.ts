export interface Organization {
  id: string;
  name: string;
  description: string;
  category: string;
  ein?: number;
  website?: string;
  phone?: string;
  email?: string;
  statistics?: string;
  createdAt: number;
  locations: Location[];
  logo?: {
    id: string;
    url: string;
  };
  photos?: Array<{
    id: string;
    url: string;
  }>;
}

export interface Location {
  id: string;
  address: string;
  latitude: number;
  longitude: number;
  isPrimary: boolean;
  organization?: {
    id: string;
    name: string;
  };
}

export const ORG_CATEGORIES = [
  'Food Security',
  'Housing & Shelter',
  'Education',
  'Healthcare',
  'Youth Development',
  'Senior Services',
  'Environmental',
  'Arts & Culture',
  'Community Development',
  'Other'
] as const;

export type OrgCategory = typeof ORG_CATEGORIES[number];