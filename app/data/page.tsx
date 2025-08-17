'use client';

import React, { useEffect, useState } from 'react';
import TopNav from '../../components/TopNav';
import type { CensusVariable } from '../../types/census';

interface CensusRow {
  geoid: string;
  name: string;
  value: number;
  year: string;
}

export default function DataPage() {
  const [variables, setVariables] = useState<CensusVariable[]>([]);
  const [censusVar, setCensusVar] = useState('');
  const [rows, setRows] = useState<CensusRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadVars() {
      try {
        const res = await fetch('/api/selected-variables');
        if (!res.ok) throw new Error('Request failed');
        const vars: CensusVariable[] = await res.json();
        setVariables(vars);
        setCensusVar(vars[0]?.name || '');
      } catch {
        const fallback: CensusVariable[] = [
          { name: 'B01003_001E', label: 'Population', datasetPath: '2022/acs/acs5' },
          { name: 'B19013_001E', label: 'Median Income', datasetPath: '2022/acs/acs5' },
        ];
        setVariables(fallback);
        setCensusVar(fallback[0].name);
      }
    }
    loadVars();
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const selected = variables.find((v) => v.name === censusVar);
        if (!selected) throw new Error('Unknown variable');
        const res = await fetch(
          `https://api.census.gov/data/${selected.datasetPath}?get=NAME,${censusVar}&for=tract:*&in=state:40+county:109`
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
    if (censusVar) load();
  }, [censusVar, variables]);

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
            {variables.map((v) => (
              <option key={v.name} value={v.name}>
                {v.label}
              </option>
            ))}
          </select>
        </div>
        {loading && <div>Loading...</div>}
        {error && <div className="text-red-500">{error}</div>}
        {!loading && !error && rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 border">Year</th>
                  <th className="px-3 py-2 border">GEOID</th>
                  <th className="px-3 py-2 border text-left">Location</th>
                  <th className="px-3 py-2 border text-right">
                    {variables.find((v) => v.name === censusVar)?.label}
                  </th>
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
        {!loading && !error && rows.length === 0 && (
          <div>No data available.</div>
        )}
      </main>
    </div>
  );
}

