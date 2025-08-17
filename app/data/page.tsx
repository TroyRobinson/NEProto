"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState } from "react";
import Link from "next/link";

interface ZipRow {
  zip: string;
  polygon: string;
}

interface StatOption {
  key: string;
  label: string;
}

const STAT_OPTIONS: StatOption[] = [
  { key: "stat1", label: "Sample Stat A" },
  { key: "stat2", label: "Sample Stat B" },
];

interface ZipFeature {
  properties: { ZCTA5CE10: string };
  geometry: { coordinates: any };
}

export default function DataPage() {
  const [rows, setRows] = useState<ZipRow[]>([]);
  const [values, setValues] = useState<Record<string, Record<string, number>>>({});
  const [selected, setSelected] = useState<string>(STAT_OPTIONS[0].key);

  useEffect(() => {
    fetch(
      "https://raw.githubusercontent.com/OpenDataDE/State-zip-code-GeoJSON/master/ok_oklahoma_zip_codes_geo.min.json"
    )
      .then((res) => res.json())
      .then((json) => {
        const features = (json.features as ZipFeature[])
          .filter((f) => f.properties.ZCTA5CE10.startsWith("731"))
          .sort((a, b) =>
            a.properties.ZCTA5CE10.localeCompare(b.properties.ZCTA5CE10)
          );

        const list: ZipRow[] = features.map((f) => {
          const coords = f.geometry.coordinates;
          const ring = Array.isArray(coords[0][0][0]) ? coords[0][0] : coords[0];
          return {
            zip: f.properties.ZCTA5CE10,
            polygon: JSON.stringify((ring as number[][]).slice(0, 2)),
          };
        });

        const stat1: Record<string, number> = {};
        const stat2: Record<string, number> = {};
        list.forEach((r) => {
          const base = parseInt(r.zip, 10);
          stat1[r.zip] = base % 100;
          stat2[r.zip] = (base * 3) % 100;
        });

        setRows(list);
        setValues({ stat1, stat2 });
      })
      .catch(() => {
        setRows([]);
        setValues({});
      });
  }, []);

  const current = values[selected] || {};

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Census Data</h1>
            <p className="text-gray-600">Sample ZIP Statistics</p>
          </div>
          <nav>
            <Link href="/" className="text-blue-600 hover:underline">
              Home
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Statistic
          </label>
          <select
            className="border rounded px-3 py-2 w-64"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            {STAT_OPTIONS.map((opt) => (
              <option key={opt.key} value={opt.key}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto bg-white rounded shadow">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="p-2 border">ZIP Code</th>
                <th className="p-2 border">Polygon (sample)</th>
                <th className="p-2 border">Value</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.zip} className="odd:bg-white even:bg-gray-50">
                  <td className="p-2 border">{row.zip}</td>
                  <td className="p-2 border font-mono truncate max-w-xs">
                    {row.polygon}
                  </td>
                  <td className="p-2 border text-right">
                    {current[row.zip] ?? ""}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td className="p-2 border text-center" colSpan={3}>
                    No data
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

