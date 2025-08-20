"use client";

import React from 'react';
import type { Organization } from '../types/organization';

interface SearchResultsProps {
  results: Organization[];
  onSelect: (org: Organization) => void;
  onHover: (org: Organization | null) => void;
}

export default function SearchResults({ results, onSelect, onHover }: SearchResultsProps) {
  return (
    <div className="w-96 ml-4 mt-14 bg-white shadow-lg overflow-y-auto h-[calc(100%-3.5rem)]">
      <div className="p-4 space-y-3">
        {results.length === 0 && (
          <div className="text-sm text-gray-500">No results found</div>
        )}
        {results.map((org) => (
          <div
            key={org.id}
            className="p-3 border rounded cursor-pointer hover:bg-gray-50"
            onClick={() => onSelect(org)}
            onMouseEnter={() => onHover(org)}
            onMouseLeave={() => onHover(null)}
          >
            <h3 className="font-semibold text-gray-900">{org.name}</h3>
            <p className="text-xs text-gray-600 line-clamp-2">{org.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
