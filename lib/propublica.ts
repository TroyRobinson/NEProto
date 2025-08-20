'use client';

import { id } from '@instantdb/react';
import db from './db';
import type { Organization } from '../types/organization';
import { geocode } from './geocode';

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
  const orgId = id();
  const locId = id();
  await db.transact([
    db.tx.organizations[orgId].update({
      name: orgData.name,
      description: `NTEE ${orgData.ntee_code || 'Unknown'}`,
      category: 'Other',
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
    category: 'Other',
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
