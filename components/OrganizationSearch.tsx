'use client';

import React from 'react';
import type { Organization } from '../types/organization';

interface SearchBarProps {
  query: string;
  onQueryChange: (value: string) => void;
  onSubmit: () => void;
}

export function SearchBar({ query, onQueryChange, onSubmit }: SearchBarProps) {
  return (
    <input
      type="text"
      value={query}
      onChange={(e) => onQueryChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          onSubmit();
        }
      }}
      placeholder="Search organizations..."
      className="bg-white px-3 py-1 rounded shadow w-64 text-sm"
    />
  );
}

interface SearchResultsProps {
  results: Organization[];
  onSelect: (org: Organization) => void;
  onHover: (orgId: string | null) => void;
}

export function SearchResults({ results, onSelect, onHover }: SearchResultsProps) {
  return (
    <div
      className="w-96 bg-white shadow-lg overflow-y-auto"
      onMouseLeave={() => onHover(null)}
    >
      <div className="p-4 space-y-2">
        {results.length === 0 && (
          <div className="text-sm text-gray-500">No organizations found.</div>
        )}
        {results.map((org) => (
          <div
            key={org.id}
            className="p-2 border rounded cursor-pointer hover:bg-gray-50"
            onClick={() => onSelect(org)}
            onMouseEnter={() => onHover(org.id)}
            onMouseLeave={() => onHover(null)}
          >
            <div className="font-semibold text-gray-900">{org.name}</div>
            <div className="text-sm text-gray-600">{org.category}</div>
            {org.locations[0] && (
              <div className="text-xs text-gray-500">
                {org.locations[0].address}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

