'use client';

import React, { useEffect, useState } from 'react';
import TopNav from '../../components/TopNav';
import {
  loadSavedVars,
  loadVarData,
  type CensusRow,
  type CensusVar,
} from '../../lib/varStore';

const DEFAULT_VARS: CensusVar[] = [
  { id: 'B01003_001E', label: 'Population', datasetPath: '2022/acs/acs5' },
  { id: 'B19013_001E', label: 'Median Income', datasetPath: '2022/acs/acs5' },
];

export default function DataPage() {
  const [options, setOptions] = useState<CensusVar[]>(DEFAULT_VARS);
  const [censusVar, setCensusVar] = useState('B01003_001E');
  const [rows, setRows] = useState<CensusRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setOptions([...DEFAULT_VARS, ...loadSavedVars()]);
  }, []);

  const current = options.find((o) => o.id === censusVar) || DEFAULT_VARS[0];

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      const cached = loadVarData(censusVar);
      if (cached) {
        setRows(cached);
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(
          `/api/census-variable?dataset=${current.datasetPath}&variable=${censusVar}`
        );
        if (!res.ok) throw new Error(`Request failed with ${res.status}`);
        const json = await res.json();
        setRows(json.rows as CensusRow[]);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to load census data';
        setError(msg);
      }
      setLoading(false);
    }
    load();
  }, [censusVar, current]);

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Census Data</h1>
          <TopNav />
        </div>
      </header>
      <main className="max-w-5xl mx-auto p-4">
        <div className="mb-4">
          <label className="mr-2">Statistic</label>
          <select
            value={censusVar}
            onChange={(e) => setCensusVar(e.target.value)}
            className="border rounded p-1"
          >
            {options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        {loading && <div>Loading...</div>}
        {error && <div className="text-red-500">{error}</div>}
        {!loading && !error && (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 border">Year</th>
                  <th className="px-3 py-2 border">GEOID</th>
                  <th className="px-3 py-2 border text-left">Location</th>
                  <th className="px-3 py-2 border text-right">{current.label}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.geoid} className="odd:bg-gray-100">
                    <td className="px-3 py-2 border text-center">{row.year}</td>
                    <td className="px-3 py-2 border text-center">{row.geoid}</td>
                    <td className="px-3 py-2 border">{row.name}</td>
                    <td className="px-3 py-2 border text-right">
                      {row.value.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}

