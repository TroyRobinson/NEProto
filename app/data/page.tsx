'use client';

import React, { useEffect, useState } from 'react';
import TopNav from '../../components/TopNav';

interface CensusRow {
  geoid: string;
  name: string;
  value: number;
  year: string;
}

const VAR_LABELS: Record<string, string> = {
  B01003_001E: 'Population',
  B19013_001E: 'Median Income',
};

export default function DataPage() {
  const [censusVar, setCensusVar] = useState('B01003_001E');
  const [rows, setRows] = useState<CensusRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `https://api.census.gov/data/2022/acs/acs5?get=NAME,${censusVar}&for=tract:*&in=state:40+county:109`
        );
        const json = await res.json();
        const headers = json[0];
        const nameIdx = headers.indexOf('NAME');
        const varIdx = headers.indexOf(censusVar);
        const stateIdx = headers.indexOf('state');
        const countyIdx = headers.indexOf('county');
        const tractIdx = headers.indexOf('tract');
        const year = '2022';
        const data: CensusRow[] = json.slice(1).map((row: string[]) => ({
          geoid: `${row[stateIdx]}${row[countyIdx]}${row[tractIdx]}`,
          name: row[nameIdx],
          value: Number(row[varIdx]),
          year,
        }));
        setRows(data);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to load census data';
        setError(msg);
      }
      setLoading(false);
    }
    load();
  }, [censusVar]);

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
            <option value="B01003_001E">Population</option>
            <option value="B19013_001E">Median Income</option>
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
                  <th className="px-3 py-2 border text-right">{VAR_LABELS[censusVar]}</th>
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

