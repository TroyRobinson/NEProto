'use client';

import React, { useEffect, useState } from 'react';

interface CensusRow {
  time: string;
  cell_value: string;
  seasonally_adj: string;
  category_code: string;
}

const STATISTICS = [
  { code: 'BA_BA', label: 'Business Applications' },
  { code: 'BA_HBA', label: 'High-Propensity Business Applications' },
  { code: 'BA_CBA', label: 'Corporations Business Applications' },
];

export default function DataPage() {
  const [selected, setSelected] = useState(STATISTICS[0].code);
  const [rows, setRows] = useState<CensusRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `https://api.census.gov/data/timeseries/eits/bfs?get=data_type_code,time_slot_id,seasonally_adj,category_code,cell_value,error_data&for=us:*&time=2023&data_type_code=${selected}`
        );
        const json = await res.json();
        const [header, ...data] = json as string[][];
        const objs = data.map((row) => {
          const obj: Record<string, string> = {};
          header.forEach((key, i) => {
            obj[key] = row[i];
          });
          return {
            time: obj.time,
            cell_value: obj.cell_value,
            seasonally_adj: obj.seasonally_adj,
            category_code: obj.category_code,
          } as CensusRow;
        });
        setRows(objs);
      } catch {
        setError('Failed to load data');
      }
      setLoading(false);
    }
    fetchData();
  }, [selected]);

  return (
    <div className="min-h-screen p-4 bg-gray-100">
      <h1 className="text-2xl font-bold mb-4">US Census Business Formation Statistics</h1>
      <div className="mb-4">
        <label className="mr-2 font-medium">Statistic:</label>
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="border px-2 py-1 rounded"
        >
          {STATISTICS.map((s) => (
            <option key={s.code} value={s.code}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
      {loading && <div>Loading...</div>}
      {error && <div className="text-red-500">{error}</div>}
      {!loading && !error && (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-300 bg-white">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-sm font-semibold text-gray-900">Time</th>
                <th className="px-4 py-2 text-left text-sm font-semibold text-gray-900">Value</th>
                <th className="px-4 py-2 text-left text-sm font-semibold text-gray-900">Seasonally Adjusted</th>
                <th className="px-4 py-2 text-left text-sm font-semibold text-gray-900">Category Code</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {rows.map((row, idx) => (
                <tr key={idx}>
                  <td className="px-4 py-2 text-sm text-gray-700">{row.time}</td>
                  <td className="px-4 py-2 text-sm text-gray-700">{row.cell_value}</td>
                  <td className="px-4 py-2 text-sm text-gray-700">{row.seasonally_adj}</td>
                  <td className="px-4 py-2 text-sm text-gray-700">{row.category_code}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
