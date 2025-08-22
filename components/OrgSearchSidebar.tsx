'use client';

import React, { useState } from 'react';
import type { Organization } from '../types/organization';
import { geocode } from '../lib/geocode';
import { addOrgFromProPublica, nteeToCategory, inOkcCounty } from '../lib/propublica';

interface OrgSearchSidebarProps {
  existingOrgs: Organization[];
  onResults: (orgs: Organization[]) => void; // remote results only
  onSelect: (org: Organization) => void;
  onHover: (orgId: string | null) => void;
}

interface SearchResult {
  ein?: number;
  org: Organization;
  source: 'local' | 'propublica';
}

interface ProPublicaSearchOrg {
  ein: number;
  name: string;
  city: string;
  state: string;
  ntee_code?: string;
}

export default function OrgSearchSidebar({ existingOrgs, onResults, onSelect, onHover }: OrgSearchSidebarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const term = query.trim();
    if (!term) {
      setResults([]);
      onResults([]);
      return;
    }
    const lower = term.toLowerCase();
    const localMatches: SearchResult[] = existingOrgs
      .filter((o) => o.name.toLowerCase().includes(lower) || o.description.toLowerCase().includes(lower))
      .map((o) => ({ org: o, ein: o.ein, source: 'local' }));
    setResults(localMatches);
    onResults([]); // clear remote markers while fetching

    setLoading(true);
    try {
      const res = await fetch(`/api/propublica/search?q=${encodeURIComponent(term)}`);
      const data = await res.json();
      const orgs: ProPublicaSearchOrg[] = (data.organizations || []).slice(0, 10);
      const geocoded = await Promise.all(
        orgs.map(async (o) => {
          const address = `${o.city}, ${o.state}`;
          const coords = await geocode(address);
          if (!coords) return null;
          if (!inOkcCounty(coords.latitude, coords.longitude)) return null;
          // Skip if duplicate of existing
          if (existingOrgs.some((ex) => ex.ein === o.ein || ex.name.toLowerCase() === o.name.toLowerCase())) {
            return null;
          }
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
            source: 'propublica',
          } as SearchResult;
        })
      );
      const remote = geocoded.filter((r): r is SearchResult => r !== null);
      const combined = [...localMatches, ...remote];
      setResults(combined);
      onResults(remote.map((r) => r.org));
    } catch (err) {
      console.error('Search error', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = async (item: SearchResult) => {
    if (item.source === 'local') {
      onSelect(item.org);
      return;
    }
    const saved = await addOrgFromProPublica(item.ein!);
    if (saved) {
      onSelect(saved);
      const filtered = results.filter((r) => r.ein !== item.ein);
      setResults(filtered);
      onResults(filtered.filter((r) => r.source === 'propublica').map((r) => r.org));
    } else {
      onSelect(item.org);
    }
  };

  const localResults = results.filter((r) => r.source === 'local');
  const remoteResults = results.filter((r) => r.source === 'propublica');

  return (
    <aside className="w-80 bg-white border-r overflow-y-auto p-4">
      <form onSubmit={handleSearch} className="mb-4">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search organizations"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </form>
      {loading && <div className="text-sm text-gray-500">Searching...</div>}
      <div>
        {localResults.length > 0 && (
          <div className="mb-4">
            <h3 className="text-xs font-semibold text-gray-500 mb-2">In Database</h3>
            <ul>
              {localResults.map((r) => (
                <li
                  key={r.org.id}
                  className="mb-2 cursor-pointer"
                  onClick={() => handleSelect(r)}
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
        {remoteResults.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-gray-500 mb-2">ProPublica</h3>
            <ul>
              {remoteResults.map((r) => (
                <li
                  key={r.ein}
                  className="mb-2 cursor-pointer"
                  onClick={() => handleSelect(r)}
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
      </div>
    </aside>
  );
}
