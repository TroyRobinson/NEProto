'use client';

import { id } from '@instantdb/react';
import db from './db';
import type { Organization } from '../types/organization';
import { geocode } from './geocode';

const NTEE_MAJOR_CATEGORIES: Record<string, string> = {
  A: 'Arts, Culture & Humanities',
  B: 'Education',
  C: 'Environment',
  D: 'Animal-Related',
  E: 'Health Care',
  F: 'Mental Health & Crisis Intervention',
  G: 'Voluntary Health Associations & Medical Disciplines',
  H: 'Medical Research',
  I: 'Crime & Legal-Related',
  J: 'Employment',
  K: 'Food, Agriculture & Nutrition',
  L: 'Housing & Shelter',
  M: 'Public Safety, Disaster Preparedness & Relief',
  N: 'Recreation & Sports',
  O: 'Youth Development',
  P: 'Human Services',
  Q: 'International, Foreign Affairs & National Security',
  R: 'Civil Rights, Social Action & Advocacy',
  S: 'Community Improvement & Capacity Building',
  T: 'Philanthropy, Voluntarism & Grantmaking Foundations',
  U: 'Science & Technology',
  V: 'Social Science',
  W: 'Public & Societal Benefit',
  X: 'Religion-Related',
  Y: 'Mutual & Membership Benefit',
  Z: 'Unknown',
};

export function getCategoryFromNtee(ntee?: string | null): string {
  if (!ntee) return 'Other';
  const key = ntee[0]?.toUpperCase();
  return NTEE_MAJOR_CATEGORIES[key] || 'Other';
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
  if (!coords) {
    return null;
  }
  const category = getCategoryFromNtee(orgData.ntee_code);
  const orgId = id();
  const locId = id();
  await db.transact([
    db.tx.organizations[orgId].update({
      name: orgData.name,
      description: `NTEE ${orgData.ntee_code || 'Unknown'}`,
      category,
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
    category,
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
