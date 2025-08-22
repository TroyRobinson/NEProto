'use client';

import React, { useState, useMemo, useEffect } from 'react';
import type { Organization } from '../types/organization';
import { geocode } from '../lib/geocode';
import { addOrgFromProPublica, nteeToCategory, inOkcCounty } from '../lib/propublica';

interface OrgSearchSidebarProps {
  existingOrgs: Organization[];
  onLocalResults: (orgs: Organization[]) => void;
  onRemoteResults: (orgs: Organization[]) => void;
  onSelect: (org: Organization) => void;
  onHover: (orgId: string | null) => void;
}

interface SearchResult {
  ein: number;
  org: Organization;
}

interface ProPublicaSearchOrg {
  ein: number;
  name: string;
  city: string;
  state: string;
  ntee_code?: string;
}

export default function OrgSearchSidebar({ existingOrgs, onLocalResults, onRemoteResults, onSelect, onHover }: OrgSearchSidebarProps) {
  const [query, setQuery] = useState('');
  const [remoteResults, setRemoteResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setRemoteResults((prev) => {
      const existingEins = new Set(existingOrgs.map((o) => o.ein).filter(Boolean) as number[]);
      const existingNames = new Set(existingOrgs.map((o) => o.name.toLowerCase()));
      const filtered = prev.filter(
        (r) => !existingEins.has(r.ein) && !existingNames.has(r.org.name.toLowerCase())
      );
      if (filtered.length !== prev.length) {
        onRemoteResults(filtered.map((r) => r.org));
      }
      return filtered;
    });
  }, [existingOrgs, onRemoteResults]);

  const localMatches = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return [];
    return existingOrgs.filter(
      (org) =>
        org.name.toLowerCase().includes(term) ||
        org.description.toLowerCase().includes(term) ||
        org.category.toLowerCase().includes(term)
    );
  }, [query, existingOrgs]);

  useEffect(() => {
    onLocalResults(localMatches);
  }, [localMatches, onLocalResults]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) {
      setRemoteResults([]);
      onLocalResults([]);
      onRemoteResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/propublica/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      const orgs: ProPublicaSearchOrg[] = (data.organizations || []).slice(0, 10);

      const geocoded = await Promise.all(
        orgs.map(async (o) => {
          const address = `${o.city}, ${o.state}`;
          const coords = await geocode(address);
          if (!coords) return null;
          if (!inOkcCounty(coords.latitude, coords.longitude)) return null;
          return {
            ein: o.ein,
            org: {
              id: `search-${o.ein}`,
              name: o.name,
              description: '',
              category: nteeToCategory(o.ntee_code),
              ein: o.ein,
              createdAt: Date.now(),
              locations: [
                {
                  id: `loc-${o.ein}`,
                  address,
                  latitude: coords.latitude,
                  longitude: coords.longitude,
                  isPrimary: true,
                },
              ],
            },
          } as SearchResult;
        })
      );

      const existingEins = new Set(existingOrgs.map((o) => o.ein).filter(Boolean) as number[]);
      const existingNames = new Set(existingOrgs.map((o) => o.name.toLowerCase()));
      const items = geocoded.filter(
        (r): r is SearchResult =>
          r !== null &&
          !existingEins.has(r.ein) &&
          !existingNames.has(r.org.name.toLowerCase())
      );
      setRemoteResults(items);
      onRemoteResults(items.map((i) => i.org));
    } catch (err) {
      console.error('Search error', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectRemote = async (item: SearchResult) => {
    const existing = existingOrgs.find(
      (o) => o.ein === item.ein || o.name.toLowerCase() === item.org.name.toLowerCase()
    );
    if (existing) {
      onSelect(existing);
      return;
    }
    const saved = await addOrgFromProPublica(item.ein);
    if (saved) {
      onSelect(saved);
      const filtered = remoteResults.filter((r) => r.ein !== item.ein);
      setRemoteResults(filtered);
      onRemoteResults(filtered.map((r) => r.org));
    } else {
      onSelect(item.org);
    }
  };

  return (
    <aside className="w-80 bg-white border-r overflow-y-auto p-4">
      <form onSubmit={handleSearch} className="mb-4">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (e.target.value.trim() === '') {
              setRemoteResults([]);
              onLocalResults([]);
              onRemoteResults([]);
            }
          }}
          placeholder="Search organizations"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </form>
      {loading && <div className="text-sm text-gray-500">Searching...</div>}
      {localMatches.length > 0 && (
        <div className="mb-4">
          <h3 className="font-semibold text-gray-800 mb-2 text-sm">In Database</h3>
          <ul>
            {localMatches.map((org) => (
              <li
                key={org.id}
                className="mb-2 cursor-pointer"
                onClick={() => onSelect(org)}
                onMouseEnter={() => onHover(org.id)}
                onMouseLeave={() => onHover(null)}
              >
                <div className="font-medium text-gray-900">{org.name}</div>
                <div className="text-sm text-gray-500">{org.locations[0]?.address}</div>
              </li>
            ))}
          </ul>
        </div>
      )}
      {remoteResults.length > 0 && (
        <div>
          <h3 className="font-semibold text-gray-800 mb-2 text-sm">Other Results</h3>
          <ul>
            {remoteResults.map((r) => (
              <li
                key={r.ein}
                className="mb-2 cursor-pointer"
                onClick={() => handleSelectRemote(r)}
                onMouseEnter={() => onHover(r.org.id)}
                onMouseLeave={() => onHover(null)}
              >
                <div className="font-medium text-gray-900">{r.org.name}</div>
                <div className="text-sm text-gray-500">{r.org.locations[0].address}</div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  );
}
