'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface VariableMeta {
  name: string;
  label: string;
}

interface DataRow {
  time: string;
  value: string;
}

export default function DataPage() {
  const [variables, setVariables] = useState<VariableMeta[]>([]);
  const [selectedVar, setSelectedVar] = useState('');
  const [rows, setRows] = useState<DataRow[]>([]);
  const [loadingVars, setLoadingVars] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchVariables() {
      try {
        const res = await fetch('https://api.census.gov/data/timeseries/eits/bfs/variables.json');
        const json: {
          variables: Record<string, { label: string; predicateOnly?: boolean }>;
        } = await res.json();
        const list: VariableMeta[] = Object.entries(json.variables)
          .filter(([, meta]) => !meta.predicateOnly)
          .map(([name, meta]) => ({ name, label: meta.label }))
          .sort((a, b) => a.label.localeCompare(b.label));
        setVariables(list);
      } catch {
        setError('Failed to load variables');
      } finally {
        setLoadingVars(false);
      }
    }
    fetchVariables();
  }, []);

  useEffect(() => {
    if (!selectedVar) return;
    async function fetchData() {
      setLoadingData(true);
      try {
        const res = await fetch(`https://api.census.gov/data/timeseries/eits/bfs?get=${selectedVar},time&for=us:*`);
        const json: string[][] = await res.json();
        const [header, ...data] = json;
        const vIndex = header.indexOf(selectedVar);
        const tIndex = header.indexOf('time');
        const parsed: DataRow[] = data.map((row) => ({
          time: row[tIndex],
          value: row[vIndex],
        }));
        setRows(parsed);
      } catch {
        setError('Failed to load data');
      } finally {
        setLoadingData(false);
      }
    }
    fetchData();
  }, [selectedVar]);

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Data Explorer</h1>
          <Link href="/" className="text-blue-600 hover:underline">Map</Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4">
        {loadingVars ? (
          <div>Loading variables...</div>
        ) : error ? (
          <div className="text-red-500">{error}</div>
        ) : (
          <div className="mb-4">
            <label className="block mb-2 font-medium">Select Statistic</label>
            <select
              className="p-2 border rounded w-full max-w-md"
              value={selectedVar}
              onChange={(e) => setSelectedVar(e.target.value)}
            >
              <option value="" disabled>
                Choose a variable
              </option>
              {variables.map((v) => (
                <option key={v.name} value={v.name}>
                  {v.label} ({v.name})
                </option>
              ))}
            </select>
          </div>
        )}

        {loadingData ? (
          <div>Loading data...</div>
        ) : rows.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead>
                <tr>
                  <th className="px-4 py-2 border-b text-left">Time</th>
                  <th className="px-4 py-2 border-b text-left">Value</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.time}>
                    <td className="px-4 py-2 border-b">{row.time}</td>
                    <td className="px-4 py-2 border-b">{row.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </main>
    </div>
  );
}

