'use client';

import { useState } from 'react';
import TopNav from '../../components/TopNav';
import db from '../../lib/db';
import { fetchZctaMetric } from '../../lib/census';
import type { Stat } from '../../types/stat';

export default function StatsPage() {
  const { data } = db.useQuery({ stats: {} });
  const stats = (data?.stats as Stat[]) || [];
  const [editing, setEditing] = useState<Record<string, string>>({});

  const handleSave = async (id: string) => {
    await db.transact([db.tx.stats[id].update({ description: editing[id] })]);
    setEditing(prev => {
      const newState = { ...prev };
      delete newState[id];
      return newState;
    });
  };

  const handleDelete = async (id: string) => {
    await db.transact([db.tx.stats[id].delete()]);
  };

  const handleRefresh = async (stat: Stat) => {
    const varId = stat.variableId.includes('_') ? stat.variableId : stat.variableId + '_001E';
    const features = await fetchZctaMetric(varId, { year: stat.year, dataset: stat.dataset });
    const values: Record<string, number | null> = {};
    for (const f of features || []) {
      values[f.properties.ZCTA5CE10] = f.properties.value ?? null;
    }
    await db.transact([db.tx.stats[stat.id].update({ values })]);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <TopNav linkHref="/" linkText="Map" />
      <main className="flex-1 max-w-5xl mx-auto p-4 w-full overflow-x-auto">
        <h2 className="text-xl font-semibold mb-4">Stat Management</h2>
        <table className="min-w-full text-sm border">
          <thead>
            <tr>
              <th className="border px-2 py-1 text-left">Title</th>
              <th className="border px-2 py-1 text-left">Description</th>
              <th className="border px-2 py-1 text-left">Category</th>
              <th className="border px-2 py-1 text-left">Dataset</th>
              <th className="border px-2 py-1 text-left">Year</th>
              <th className="border px-2 py-1 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((s: Stat) => (
              <tr key={s.id}>
                <td className="border px-2 py-1">{s.title}</td>
                <td className="border px-2 py-1">
                  <input
                    className="border p-1 w-full"
                    value={editing[s.id] ?? s.description}
                    onChange={e => setEditing(prev => ({ ...prev, [s.id]: e.target.value }))}
                  />
                </td>
                <td className="border px-2 py-1">{s.category || ''}</td>
                <td className="border px-2 py-1">{s.source}</td>
                <td className="border px-2 py-1">{s.year}</td>
                <td className="border px-2 py-1 space-x-2">
                  <button className="text-blue-600" onClick={() => handleSave(s.id)}>Save</button>
                  <button className="text-red-600" onClick={() => handleDelete(s.id)}>Delete</button>
                  <button className="text-green-600" onClick={() => handleRefresh(s)}>Refresh</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </main>
    </div>
  );
}
