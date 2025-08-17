'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import TopNav from '../../../components/TopNav';

type Variable = { name: string; label: string; concept: string };

export default function DatasetDetailPage() {
  const params = useParams();
  const segments = (params?.path as string[]) || [];
  const datasetPath = Array.isArray(segments) ? segments.join('/') : '';
  const [term, setTerm] = useState('');
  const [variables, setVariables] = useState<Variable[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!datasetPath) return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `https://api.census.gov/data/${datasetPath}/variables.json`
        );
        if (!res.ok) throw new Error(`Request failed with ${res.status}`);
        const json = await res.json();
        const vars: Variable[] = Object.entries(json.variables || {}).map(
          ([name, meta]: any) => ({
            name,
            label: meta.label,
            concept: meta.concept,
          })
        );
        setVariables(vars);
      } catch (e) {
        console.error('Failed to load variables', e);
        setError('Failed to load variables.');
      }
      setLoading(false);
    }
    load();
  }, [datasetPath]);

  const filtered = term
    ? variables.filter((v) => {
        const t = term.toLowerCase();
        return (
          v.name.toLowerCase().includes(t) ||
          v.label.toLowerCase().includes(t) ||
          v.concept.toLowerCase().includes(t)
        );
      })
    : variables;

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Variables</h1>
          <TopNav />
        </div>
      </header>
      <main className="max-w-5xl mx-auto p-4 space-y-4">
        <div className="text-sm text-gray-600">Dataset: {datasetPath}</div>
        <input
          type="text"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Search variables..."
          className="w-full border px-3 py-2 rounded"
        />
        <ul className="space-y-1">
          {filtered.map((v) => (
            <li key={v.name} className="border-b py-1">
              <div className="font-medium">{v.name}</div>
              <div className="text-sm">{v.label}</div>
              <div className="text-xs text-gray-600">{v.concept}</div>
            </li>
          ))}
          {filtered.length === 0 && (
            <li className="text-sm text-gray-500">
              {error
                ? error
                : loading
                ? 'Loading variables...'
                : 'No variables found.'}
            </li>
          )}
        </ul>
      </main>
    </div>
  );
}

