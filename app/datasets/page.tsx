'use client';

import { useState } from 'react';
import TopNav from '../../components/TopNav';
import db from '../../lib/db';

export default function DatasetSearchPage() {
  const [term, setTerm] = useState('');
  const { data } = db.useQuery({
    censusDatasets: {
      $: {
        where: term ? { title: { $ilike: `%${term}%` } } : undefined,
        order: { title: 'asc' },
        limit: 50,
      },
    },
  });
  const results = data?.censusDatasets || [];

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Census Datasets</h1>
          <TopNav />
        </div>
      </header>
      <main className="max-w-5xl mx-auto p-4 space-y-4">
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
      </main>
    </div>
  );
}
