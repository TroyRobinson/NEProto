'use client';

import React, { useEffect, useState } from 'react';

interface BfsRecord {
  data_type_code: string;
  time_slot_id: string;
  seasonally_adj: string;
  category_code: string;
  cell_value: string;
  error_data: string;
  time: string;
  us: string;
}

const DATA_TYPE_LABELS: Record<string, string> = {
  BA_BA: 'Business Applications',
  BA_CBA: 'Business Applications (Corporations)',
  BA_HBA: 'High Propensity Business Applications',
  BF_BF4Q: 'Business Formations within 4 Quarters',
  BF_BF8Q: 'Business Formations within 8 Quarters',
  BF_PBF4Q: 'Projected Business Formations within 4 Quarters',
};

export default function DataPage() {
  const [records, setRecords] = useState<BfsRecord[]>([]);
  const [selected, setSelected] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch(
          'https://api.census.gov/data/timeseries/eits/bfs?get=data_type_code,time_slot_id,seasonally_adj,category_code,cell_value,error_data&for=us:*'
        );
        const json = await res.json();
        const [header, ...rows] = json;
        const items = rows.map((row: string[]) => {
          const obj: Record<string, string> = {};
          header.forEach((h: string, i: number) => {
            obj[h] = row[i];
          });
          return obj as BfsRecord;
        });
        setRecords(items);
      } catch (err) {
        console.error('Failed to load BFS data', err);
      }
    }
    loadData();
  }, []);

  const dataTypes = Array.from(new Set(records.map(r => r.data_type_code))).sort();
  const filtered = selected ? records.filter(r => r.data_type_code === selected) : [];

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">US Census Business Formation Statistics</h1>
      <div className="mb-4">
        <label className="mr-2 font-medium" htmlFor="stat-select">Statistic:</label>
        <select
          id="stat-select"
          className="border border-gray-300 rounded p-2"
          value={selected}
          onChange={e => setSelected(e.target.value)}
        >
          <option value="">Select a statistic</option>
          {dataTypes.map(code => (
            <option key={code} value={code}>
              {DATA_TYPE_LABELS[code] || code}
            </option>
          ))}
        </select>
      </div>

      {filtered.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-2 text-left">Time</th>
                <th className="px-4 py-2 text-left">Category</th>
                <th className="px-4 py-2 text-right">Value</th>
                <th className="px-4 py-2 text-left">Seasonally Adj.</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((rec, idx) => (
                <tr key={idx} className="odd:bg-white even:bg-gray-50">
                  <td className="border-t px-4 py-2">{rec.time}</td>
                  <td className="border-t px-4 py-2">{rec.category_code}</td>
                  <td className="border-t px-4 py-2 text-right">{rec.cell_value}</td>
                  <td className="border-t px-4 py-2">{rec.seasonally_adj}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

