'use client';

import TopNav from '../../components/TopNav';
import db from '../../lib/db';
import { id } from '@instantdb/react';
import { fetchZctaMetric } from '../../lib/census';
import { Stat, StatValue } from '../../types/stat';

export default function StatsPage() {
  const { data, isLoading, error } = db.useQuery<{ stats: Stat[] }>({
    stats: { values: {} },
  });

  const handleDescChange = async (statId: string, desc: string) => {
    await db.transact([db.tx.stats[statId].update({ description: desc })]);
  };

  const handleDelete = async (stat: Stat) => {
    await db.transact([
      db.tx.stats[stat.id].delete(),
      ...(stat.values || []).map((v: StatValue) => db.tx.statValues[v.id].delete()),
    ]);
  };

  const handleRefresh = async (stat: Stat) => {
    const features = await fetchZctaMetric(stat.variable, { dataset: stat.dataset, year: stat.year });
    await db.transact([
      ...(stat.values || []).map((v: StatValue) => db.tx.statValues[v.id].delete()),
      ...features.map((f) =>
        db.tx.statValues[id()]
          .update({ zcta: f.properties.ZCTA5CE10, value: f.properties.value ?? undefined })
          .link({ stat: stat.id })
      ),
      db.tx.stats[stat.id].update({ updatedAt: Date.now() }),
    ]);
  };

  if (isLoading) return <div className="p-4">Loading stats...</div>;
  if (error) return <div className="p-4 text-red-500">Error loading stats: {error.message}</div>;

  const stats = data?.stats || [];

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <TopNav linkHref="/" linkText="Map" />
      <main className="flex-1 max-w-5xl mx-auto p-4 w-full overflow-x-auto">
        <h2 className="text-xl mb-4">Stat Management</h2>
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
                    value={s.description || ''}
                    onChange={(e) => handleDescChange(s.id, e.target.value)}
                    className="w-full border px-1 py-0.5"
                  />
                </td>
                <td className="border px-2 py-1">{s.category}</td>
                <td className="border px-2 py-1">{s.dataset}</td>
                <td className="border px-2 py-1">{s.year}</td>
                <td className="border px-2 py-1 space-x-2">
                  <button className="text-blue-600 underline" onClick={() => handleRefresh(s)}>
                    Refresh
                  </button>
                  <button className="text-red-600 underline" onClick={() => handleDelete(s)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </main>
    </div>
  );
}
