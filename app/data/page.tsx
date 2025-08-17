'use client';

import React, { useEffect, useState } from 'react';

export default function DataPage() {
  const [variables, setVariables] = useState<string[]>([]);
  const [selected, setSelected] = useState('');
  const [rows, setRows] = useState<string[][]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadVariables() {
      try {
        const res = await fetch('https://api.census.gov/data/timeseries/eits/bfs/variables.json');
        const json = await res.json();
        setVariables(Object.keys(json.variables));
      } catch (err) {
        console.error(err);
      }
    }
    loadVariables();
  }, []);

  async function handleSelect(value: string) {
    setSelected(value);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`https://api.census.gov/data/timeseries/eits/bfs?get=${value}&for=us:*&time=2023-01`);
      const data = await res.json();
      setRows(data);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6 space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">US Census Data</h1>

      <div>
        <label className="block mb-2 text-sm font-medium text-gray-700">Select statistic</label>
        <select
          className="w-full max-w-sm p-2 border border-gray-300 rounded"
          value={selected}
          onChange={(e) => handleSelect(e.target.value)}
        >
          <option value="">-- Choose a variable --</option>
          {variables.map((v) => (
            <option key={v} value={v}>{v}</option>
          ))}
        </select>
      </div>

      {loading && <div>Loading...</div>}
      {error && <div className="text-red-500">{error}</div>}

      {rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200">
            <thead>
              <tr>
                {rows[0].map((header, idx) => (
                  <th key={idx} className="px-4 py-2 border-b bg-gray-50 text-left text-sm font-semibold text-gray-700">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(1).map((row, rowIdx) => (
                <tr key={rowIdx} className="odd:bg-white even:bg-gray-50">
                  {row.map((cell, cellIdx) => (
                    <td key={cellIdx} className="px-4 py-2 border-b text-sm text-gray-900">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

