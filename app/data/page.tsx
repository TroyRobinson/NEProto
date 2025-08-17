"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState } from "react";
import Link from "next/link";

const API_BASE = "https://api.census.gov/data/timeseries/eits/bfs";

interface Row {
  time: string;
  category: string;
  seasonally: string;
  value: string;
}

interface GeoRow {
  name: string;
  polygon: string;
}

interface ZipFeature {
  properties: { ZCTA5CE10: string };
  geometry: { coordinates: any };
}

export default function DataPage() {
  const [codes, setCodes] = useState<string[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [geoRows, setGeoRows] = useState<GeoRow[]>([]);

  useEffect(() => {
    fetch(
      `${API_BASE}?get=data_type_code,time_slot_id,seasonally_adj,category_code,cell_value,error_data&for=us:*&time=2023`
    )
      .then((res) => res.json())
      .then((json) => {
        const [, ...data] = json as string[][];
        const unique = Array.from(new Set(data.map((r) => r[0])));
        setCodes(unique);
        if (unique.length) setSelected(unique[0]);
      })
      .catch(() => setCodes([]));
  }, []);

  useEffect(() => {
    fetch(
      "https://raw.githubusercontent.com/OpenDataDE/State-zip-code-GeoJSON/master/ok_oklahoma_zip_codes_geo.min.json"
    )
      .then((res) => res.json())
      .then((json) => {
        const features = (json.features as ZipFeature[])
          .filter((f) => f.properties.ZCTA5CE10.startsWith("731"))
          .slice(0, 5);
        setGeoRows(
          features.map((f) => {
            const coords = f.geometry.coordinates;
            const ring = Array.isArray(coords[0][0][0]) ? coords[0][0] : coords[0];
            return {
              name: f.properties.ZCTA5CE10,
              polygon: JSON.stringify((ring as number[][]).slice(0, 2)),
            };
          })
        );
      })
      .catch(() => setGeoRows([]));
  }, []);

  useEffect(() => {
    if (!selected) return;
    setLoading(true);
    fetch(
      `${API_BASE}?get=time_slot_id,seasonally_adj,category_code,cell_value,error_data&for=us:*&time=2023&data_type_code=${selected}`
    )
      .then((res) => res.json())
      .then((json) => {
        const [, ...data] = json as string[][];
        setRows(
          data.map((r) => ({
            time: r[5],
            category: r[2],
            seasonally: r[1],
            value: r[3],
          }))
        );
      })
      .finally(() => setLoading(false));
  }, [selected]);

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Census Data</h1>
            <p className="text-gray-600">Business Formation Statistics (2023)</p>
          </div>
          <nav>
            <Link href="/" className="text-blue-600 hover:underline">
              Home
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Data Type
          </label>
          <select
            className="border rounded px-3 py-2 w-64"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            {codes.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto bg-white rounded shadow">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="p-2 border">Time</th>
                <th className="p-2 border">Category</th>
                <th className="p-2 border">Seasonally Adj</th>
                <th className="p-2 border">Value</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={idx} className="odd:bg-white even:bg-gray-50">
                  <td className="p-2 border">{row.time}</td>
                  <td className="p-2 border">{row.category}</td>
                  <td className="p-2 border">{row.seasonally}</td>
                  <td className="p-2 border text-right">{row.value}</td>
                </tr>
              ))}
              {rows.length === 0 && !loading && (
                <tr>
                  <td className="p-2 border text-center" colSpan={4}>
                    No data
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td className="p-2 border text-center" colSpan={4}>
                    Loading...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {geoRows.length > 0 && (
          <div className="overflow-x-auto bg-white rounded shadow">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="p-2 border">ZIP Code</th>
                  <th className="p-2 border">Polygon (sample)</th>
                </tr>
              </thead>
              <tbody>
                {geoRows.map((row, idx) => (
                  <tr key={idx} className="odd:bg-white even:bg-gray-50">
                    <td className="p-2 border">{row.name}</td>
                    <td className="p-2 border font-mono truncate max-w-xs">
                      {row.polygon}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}

