'use client';

import React, { useEffect, useState } from 'react';

interface BFSRow {
  time: string;
  geo: string;
  dataLabel: string;
  cell_value: string;
  category_code: string;
  seasonally_adj: string;
}

interface StateRow {
  state: string;
  name: string;
  firstCoord: string;
}

type Row = BFSRow | StateRow;

const DATASETS = [
  { code: 'BA_BA', label: 'Business Applications', type: 'bfs' },
  { code: 'BA_HBA', label: 'High-Propensity Business Applications', type: 'bfs' },
  { code: 'BA_CBA', label: 'Corporations Business Applications', type: 'bfs' },
  { code: 'STATE_POLY', label: 'State Boundaries', type: 'geo' },
];

export default function DataPage() {
  const [selectedCode, setSelectedCode] = useState(DATASETS[0].code);
  const selected = DATASETS.find((d) => d.code === selectedCode)!;
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        if (selected.type === 'bfs') {
          const res = await fetch(
            `https://api.census.gov/data/timeseries/eits/bfs?get=data_type_code,time_slot_id,seasonally_adj,category_code,cell_value,error_data&for=us:*&time=2023&data_type_code=${selected.code}&category_code=TOTAL&seasonally_adj=no`
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
              geo: obj.us === '1' ? 'US' : obj.us,
              dataLabel: selected.label,
              cell_value: obj.cell_value,
              category_code: obj.category_code,
              seasonally_adj: obj.seasonally_adj,
            } as BFSRow;
          });
          setRows(objs);
        } else if (selected.type === 'geo') {
          const res = await fetch(
            'https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json'
          );
          const json = await res.json();
          const objs = (json.features || []).map((f: {
            id: string;
            properties?: { name?: string };
            geometry?: { coordinates?: number[][][] };
          }) => ({
            state: f.id,
            name: f.properties?.name,
            firstCoord: f.geometry?.coordinates?.[0]?.[0]?.slice(0, 2).join(', ') || '',
          }));
          setRows(objs);
        }
      } catch {
        setError('Failed to load data');
        setRows([]);
      }
      setLoading(false);
    }
    fetchData();
  }, [selected]);

  return (
    <div className="min-h-screen p-4 bg-gray-100">
      <h1 className="text-2xl font-bold mb-4">US Census Data</h1>
      <div className="mb-4">
        <label className="mr-2 font-medium">Dataset:</label>
        <select
          value={selectedCode}
          onChange={(e) => setSelectedCode(e.target.value)}
          className="border px-2 py-1 rounded"
        >
          {DATASETS.map((s) => (
            <option key={s.code} value={s.code}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
      {loading && <div>Loading...</div>}
      {error && <div className="text-red-500">{error}</div>}
      {!loading && !error && selected.type === 'bfs' && (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-300 bg-white">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-sm font-semibold text-gray-900">Date</th>
                <th className="px-4 py-2 text-left text-sm font-semibold text-gray-900">Geography</th>
                <th className="px-4 py-2 text-left text-sm font-semibold text-gray-900">Data Type</th>
                <th className="px-4 py-2 text-left text-sm font-semibold text-gray-900">Category Code</th>
                <th className="px-4 py-2 text-left text-sm font-semibold text-gray-900">Value</th>
                <th className="px-4 py-2 text-left text-sm font-semibold text-gray-900">Seasonally Adjusted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {(rows as BFSRow[]).map((row, idx) => (
                <tr key={idx}>
                  <td className="px-4 py-2 text-sm text-gray-700">{row.time}</td>
                  <td className="px-4 py-2 text-sm text-gray-700">{row.geo}</td>
                  <td className="px-4 py-2 text-sm text-gray-700">{row.dataLabel}</td>
                  <td className="px-4 py-2 text-sm text-gray-700">{row.category_code}</td>
                  <td className="px-4 py-2 text-sm text-gray-700">{row.cell_value}</td>
                  <td className="px-4 py-2 text-sm text-gray-700">{row.seasonally_adj}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!loading && !error && selected.type === 'geo' && (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-300 bg-white">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-sm font-semibold text-gray-900">State</th>
                <th className="px-4 py-2 text-left text-sm font-semibold text-gray-900">Name</th>
                <th className="px-4 py-2 text-left text-sm font-semibold text-gray-900">First Coordinate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {(rows as StateRow[]).map((row, idx) => (
                <tr key={idx}>
                  <td className="px-4 py-2 text-sm text-gray-700">{row.state}</td>
                  <td className="px-4 py-2 text-sm text-gray-700">{row.name}</td>
                  <td className="px-4 py-2 text-sm text-gray-700">{row.firstCoord}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
