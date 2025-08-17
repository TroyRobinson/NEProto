'use client';

import { useState, useEffect } from 'react';

const STAT_OPTIONS = [
  { value: 'BA_BA', label: 'Business Applications' },
  { value: 'BA_HBA', label: 'High-Propensity Business Applications' },
  { value: 'BA_CBA', label: 'Business Applications from Corporations' },
];

interface Row {
  data_type_code: string;
  time_slot_id: string;
  seasonally_adj: string;
  category_code: string;
  cell_value: string;
  error_data: string;
  time: string;
  us: string;
}

export default function DataPage() {
  const [selected, setSelected] = useState(STAT_OPTIONS[0].value);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `https://api.census.gov/data/timeseries/eits/bfs?get=data_type_code,time_slot_id,seasonally_adj,category_code,cell_value,error_data,time,us&for=us:*&time=2022&data_type_code=${selected}`
        );
        const json = await res.json();
        const [headers, ...data] = json;
        const mapped = data.map((row: string[]) =>
          Object.fromEntries(headers.map((h: string, i: number) => [h, row[i]]))
        ) as Row[];
        setRows(mapped);
      } catch {
        setError('Failed to load data');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [selected]);

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-2xl font-bold mb-4">Business Formation Statistics</h1>
      <div className="mb-4">
        <label className="mr-2 font-medium">Statistic:</label>
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="border border-gray-300 rounded p-2"
        >
          {STAT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      {error && <div className="text-red-500 mb-4">{error}</div>}
      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-2 text-left border-b">Time</th>
                <th className="px-4 py-2 text-left border-b">Seasonally Adjusted</th>
                <th className="px-4 py-2 text-left border-b">Category</th>
                <th className="px-4 py-2 text-left border-b">Value</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={idx} className="even:bg-gray-50">
                  <td className="px-4 py-2 border-b">{row.time}</td>
                  <td className="px-4 py-2 border-b">{row.seasonally_adj}</td>
                  <td className="px-4 py-2 border-b">{row.category_code}</td>
                  <td className="px-4 py-2 border-b">{row.cell_value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

