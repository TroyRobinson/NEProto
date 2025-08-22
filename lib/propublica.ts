'use client';

import { id } from '@instantdb/react';
import db from './db';
import type { Organization } from '../types/organization';
import { geocode } from './geocode';
import type { OrgCategory } from '../types/organization';

const NTEE_CATEGORY_MAP: Record<string, OrgCategory> = {
  A: 'Arts & Culture',
  B: 'Education',
  C: 'Environmental',
  D: 'Environmental',
  E: 'Healthcare',
  F: 'Healthcare',
  G: 'Healthcare',
  H: 'Healthcare',
  I: 'Community Development',
  J: 'Community Development',
  K: 'Food Security',
  L: 'Housing & Shelter',
  M: 'Community Development',
  N: 'Community Development',
  O: 'Youth Development',
  P: 'Community Development',
  Q: 'Community Development',
  R: 'Community Development',
  S: 'Community Development',
  T: 'Community Development',
  U: 'Community Development',
  V: 'Community Development',
  W: 'Community Development',
  X: 'Community Development',
  Y: 'Other',
  Z: 'Other',
};

export function nteeToCategory(ntee?: string | null): OrgCategory {
  if (!ntee) return 'Other';
  const major = ntee.charAt(0).toUpperCase();
  if (major === 'P' && (ntee.startsWith('P7') || ntee.startsWith('P81') || ntee.startsWith('P82') || ntee.startsWith('P83'))) {
    return 'Senior Services';
  }
  return NTEE_CATEGORY_MAP[major] || 'Other';
}

export const OKC_BOUNDS = {
  minLat: 35.3768782,
  maxLat: 35.7259831,
  minLng: -97.6740183,
  maxLng: -97.1410425,
};

export function inOkcCounty(lat: number, lng: number) {
  return (
    lat >= OKC_BOUNDS.minLat &&
    lat <= OKC_BOUNDS.maxLat &&
    lng >= OKC_BOUNDS.minLng &&
    lng <= OKC_BOUNDS.maxLng
  );
}

export async function addOrgFromProPublica(ein: number): Promise<Organization | null> {
  const res = await fetch(`/api/propublica/organizations/${ein}`);
  if (!res.ok) {
    return null;
  }
  const data = await res.json();
  const orgData = data.organization;
  if (!orgData) {
    return null;
  }
  const addressParts = [orgData.address, orgData.city, orgData.state, orgData.zipcode].filter(Boolean);
  const fullAddress = addressParts.join(', ');
  const coords = await geocode(fullAddress);
  if (!coords || !inOkcCounty(coords.latitude, coords.longitude)) {
    return null;
  }
  const orgId = id();
  const locId = id();
  await db.transact([
    db.tx.organizations[orgId].update({
      name: orgData.name,
      description: `NTEE ${orgData.ntee_code || 'Unknown'}`,
      category: nteeToCategory(orgData.ntee_code),
      ein: orgData.ein,
      createdAt: Date.now(),
    }),
    db.tx.locations[locId]
      .update({
        address: fullAddress,
        latitude: coords.latitude,
        longitude: coords.longitude,
        isPrimary: true,
      })
      .link({ organization: orgId }),
  ]);
  return {
    id: orgId,
    name: orgData.name,
    description: `NTEE ${orgData.ntee_code || 'Unknown'}`,
    category: nteeToCategory(orgData.ntee_code),
    ein: orgData.ein,
    createdAt: Date.now(),
    locations: [
      {
        id: locId,
        address: fullAddress,
        latitude: coords.latitude,
        longitude: coords.longitude,
        isPrimary: true,
      },
    ],
  };
}
