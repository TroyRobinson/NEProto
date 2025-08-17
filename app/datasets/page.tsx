'use client';

import { useState } from 'react';
import db from '../../lib/db';

export default function DatasetSearchPage() {
  const [term, setTerm] = useState('');
  const { data } = db.useQuery({
    censusDatasets: {
      $: {
        where: term ? { title: { $ilike: `%${term}%` } } : undefined,
        orderBy: { title: 'asc' },
        limit: 50,
      },
    },
  });
  const results = data?.censusDatasets || [];

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Census Datasets</h1>
      <input
        type="text"
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        placeholder="Search datasets..."
        className="w-full border px-3 py-2 rounded"
      />
      <ul className="space-y-1">
        {results.map((d) => (
          <li key={d.id} className="border-b py-1">
            <div className="font-medium">{d.title}</div>
            <div className="text-xs text-gray-600">{d.identifier}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
