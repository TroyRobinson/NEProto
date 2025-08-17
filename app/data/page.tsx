'use client';

import React, { useEffect, useState } from 'react';

const DATA_TYPES = [
  { code: 'BA_BA', label: 'Business Applications' },
  { code: 'BA_CBA', label: 'Business Applications from Corporations' },
  { code: 'BA_HBA', label: 'High-Propensity Business Applications' },
  { code: 'BA_WBA', label: 'Business Applications with Planned Wages' },
  { code: 'BF_BF4Q', label: 'Business Formations within 4 Quarters' },
  { code: 'BF_BF8Q', label: 'Business Formations within 8 Quarters' },
  { code: 'BF_PBF4Q', label: 'Projected Business Formations within 4 Quarters' },
  { code: 'BF_PBF8Q', label: 'Projected Business Formations within 8 Quarters' },
  { code: 'BF_SBF4Q', label: 'Spliced Business Formations within 4 Quarters' },
  { code: 'BF_SBF8Q', label: 'Spliced Business Formations within 8 Quarters' },
];

type DataRow = {
  time: string;
  value: string;
};

export default function DataPage() {
  const [selected, setSelected] = useState(DATA_TYPES[0].code);
  const [rows, setRows] = useState<DataRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const url = `https://api.census.gov/data/timeseries/eits/bfs?get=data_type_code,time_slot_id,seasonally_adj,category_code,cell_value,error_data&for=us:*&time=2023-01&seasonally_adj=yes&time_slot_id=0&category_code=TOTAL&data_type_code=${selected}`;
        const res = await fetch(url);
        const json: string[][] = await res.json();
        const headers = json[0];
        const timeIdx = headers.indexOf('time');
        const valueIdx = headers.indexOf('cell_value');
        const data = json.slice(1).map((r: string[]) => ({
          time: r[timeIdx],
          value: r[valueIdx],
        }));
        setRows(data);
        } catch (e) {
          setError(e instanceof Error ? e.message : String(e));
        } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [selected]);

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-2xl font-bold mb-4">US Census Business Formation Statistics</h1>
      <div className="mb-4">
        <label htmlFor="stat" className="mr-2 font-medium">Statistic:</label>
        <select
          id="stat"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="border px-2 py-1 rounded"
        >
          {DATA_TYPES.map((t) => (
            <option key={t.code} value={t.code}>{t.label}</option>
          ))}
        </select>
      </div>

      {loading && <div>Loading...</div>}
      {error && <div className="text-red-500">{error}</div>}

      {!loading && !error && (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border">
            <thead>
              <tr>
                <th className="px-4 py-2 border-b">Month</th>
                <th className="px-4 py-2 border-b">Value</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.time} className="odd:bg-gray-50">
                  <td className="px-4 py-2 border-b">{row.time}</td>
                  <td className="px-4 py-2 border-b text-right">{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

