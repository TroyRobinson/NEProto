'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchZipStats, type ZipStats } from '../../lib/zipStats';

interface CustomMetric {
  key: string;
  label: string;
  dataset: string;
  variable: string;
}

export default function DataPage() {
  const [rows, setRows] = useState<ZipStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metric, setMetric] = useState<string>('population');
  const [customMetrics, setCustomMetrics] = useState<CustomMetric[]>([]);
  const [customData, setCustomData] = useState<Record<string, Map<string, number>>>({});

  useEffect(() => {
    async function load() {
      try {
        const { stats } = await fetchZipStats();
        setRows(stats);
      } catch {
        setError('Failed to load data');
      } finally {
        setLoading(false);
      }
    }
    load();
    async function loadStored() {
      const stored = JSON.parse(
        typeof window !== 'undefined'
          ? localStorage.getItem('customMetrics') || '[]'
          : '[]'
      ) as CustomMetric[];
      const valid: CustomMetric[] = [];
      for (const m of stored) {
        try {
          const res = await fetch(`${m.dataset}/geography.json`);
          const geo = await res.json();
          if (JSON.stringify(geo).toLowerCase().includes('zip code tabulation area')) {
            valid.push(m);
          }
        } catch {
          /* ignore */
        }
      }
      setCustomMetrics(valid);
      localStorage.setItem('customMetrics', JSON.stringify(valid));
    }
    loadStored();
  }, []);

  useEffect(() => {
    if (metric === 'population' || metric === 'applications') return;
    if (rows.length === 0) return;
    if (customData[metric]) return;
    const m = customMetrics.find((cm) => cm.key === metric);
    if (!m) return;
    async function loadCustom(metricInfo: CustomMetric) {
      try {
        const zipCodes = rows.map((r) => r.zip);
        const res = await fetch(
          `${metricInfo.dataset}?get=${metricInfo.variable}&for=zip%20code%20tabulation%20area:${zipCodes.join(',')}`
        );
        const json = await res.json();
        const map = new Map<string, number>(
          json.slice(1).map((row: string[]) => [row[row.length - 1], Number(row[0])])
        );
        setCustomData((prev) => ({ ...prev, [metricInfo.key]: map }));
      } catch (err) {
        console.error('Failed to fetch custom metric', err);
      }
    }
    loadCustom(m);
  }, [metric, rows, customMetrics, customData]);

  return (
    <div className="min-h-screen p-4 bg-gray-100 text-black">
      <h1 className="text-2xl font-bold mb-4 text-black">Oklahoma City ZIP Data</h1>
      <div className="mb-4 flex items-center gap-4">
        <div>
          <label className="mr-2">Metric:</label>
          <select
            value={metric}
            onChange={(e) => setMetric(e.target.value)}
            className="border px-1 py-0.5"
          >
            <option value="population">Population</option>
            <option value="applications">Business Applications</option>
            {customMetrics.map((m) => (
              <option key={m.key} value={m.key}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
        <Link href="/stats" className="text-blue-600 hover:underline text-sm">
          Search Census stats
        </Link>
      </div>
      {loading && <div>Loading...</div>}
      {error && <div className="text-red-500">{error}</div>}
      {!loading && !error && (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-300 bg-white">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-sm font-semibold text-black">ZIP</th>
                <th className="px-4 py-2 text-left text-sm font-semibold text-black">
                  {metric === 'population'
                    ? 'Population'
                    : metric === 'applications'
                      ? 'Business Applications'
                      : customMetrics.find((m) => m.key === metric)?.label || 'Value'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {rows.map((row) => (
                <tr key={row.zip}>
                  <td className="px-4 py-2 text-sm text-black">{row.zip}</td>
                  <td className="px-4 py-2 text-sm text-black">
                    {metric === 'population'
                      ? row.population.toLocaleString()
                      : metric === 'applications'
                        ? Math.round(row.applications).toLocaleString()
                        : customData[metric]?.get(row.zip)?.toLocaleString() ?? 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
