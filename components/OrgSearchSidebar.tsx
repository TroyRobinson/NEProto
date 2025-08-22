'use client';

import React, { useState } from 'react';
import type { Organization } from '../types/organization';
import { geocode } from '../lib/geocode';
import { addOrgFromProPublica, nteeToCategory, inOkcCounty } from '../lib/propublica';

interface OrgSearchSidebarProps {
  existingOrgs: Organization[];
  onResults: (orgs: Organization[]) => void;
  onSelect: (org: Organization) => void;
  onHover: (org: Organization | null) => void;
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

export default function OrgSearchSidebar({ existingOrgs, onResults, onSelect, onHover }: OrgSearchSidebarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
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

      const items = geocoded.filter((r): r is SearchResult => r !== null);
      setResults(items);
      onResults(items.map(i => i.org));
    } catch (err) {
      console.error('Search error', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = async (item: SearchResult) => {
    const existing = existingOrgs.find(
      (o) => o.name.toLowerCase() === item.org.name.toLowerCase()
    );
    if (existing) {
      onSelect(existing);
      onHover(null);
      return;
    }
    const saved = await addOrgFromProPublica(item.ein);
    if (saved) {
      onSelect(saved);
      const filtered = results.filter(r => r.ein !== item.ein);
      setResults(filtered);
      onResults(filtered.map(r => r.org));
    } else {
      onSelect(item.org);
    }
    onHover(null);
  };

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
      <ul>
        {results.map((r) => (
          <li
            key={r.ein}
            className="mb-2 cursor-pointer"
            onClick={() => handleSelect(r)}
            onMouseEnter={() => onHover(r.org)}
            onMouseLeave={() => onHover(null)}
          >
            <div className="font-medium text-gray-900">{r.org.name}</div>
            <div className="text-sm text-gray-500">{r.org.locations[0].address}</div>
          </li>
        ))}
      </ul>
    </aside>
  );
}
