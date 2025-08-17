'use client';

import React, { useEffect, useState } from 'react';

interface DataRow {
  time_slot_date: string;
  cell_value: string;
}

const API_URL = 'https://api.census.gov/data/timeseries/eits/bfs';

export default function DataPage() {
  const [stats, setStats] = useState<string[]>([]);
  const [selectedStat, setSelectedStat] = useState<string>('');
  const [rows, setRows] = useState<DataRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}?get=data_type_code,cell_value&for=us&time=2024-01&seasonally_adj=yes&time_slot_id=0&category_code=TOTAL`)
      .then(res => res.json())
      .then(data => {
        const [, ...rest] = data;
        const codes = rest.map((row: string[]) => row[0]);
        setStats(codes);
        if (codes.length > 0) {
          setSelectedStat(codes[0]);
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!selectedStat) return;
    setLoading(true);
    fetch(`${API_URL}?get=time_slot_date,cell_value&for=us&seasonally_adj=yes&time_slot_id=0&category_code=TOTAL&data_type_code=${selectedStat}&time=from+2023-01`)
      .then(res => res.json())
      .then(data => {
        const [, ...rest] = data;
        const rows = rest.map((row: string[]) => ({
          time_slot_date: row[0],
          cell_value: row[1],
        }));
        setRows(rows);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedStat]);

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-2xl font-bold mb-4">US Census Business Formation Statistics</h1>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Statistic</label>
        <select
          value={selectedStat}
          onChange={(e) => setSelectedStat(e.target.value)}
          className="p-2 border rounded"
        >
          {stats.map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : (
        <table className="min-w-full bg-white">
          <thead>
            <tr>
              <th className="px-4 py-2 border">Date</th>
              <th className="px-4 py-2 border">Value</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={idx} className="odd:bg-gray-50">
                <td className="px-4 py-2 border">{row.time_slot_date}</td>
                <td className="px-4 py-2 border">{row.cell_value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

