'use client';

import { id } from '@instantdb/react';
import TopNav from '../../components/TopNav';
import db from '../../lib/db';
import { fetchZctaMetric } from '../../lib/census';

interface StatValue { id: string; zcta: string; value: number | null | undefined }
interface Stat { id: string; title: string; description: string; variable: string; dataset: string; year: number; values: StatValue[] }

export default function StatsPage() {
  const { data, isLoading, error } = db.useQuery({ stats: { values: {} } });
  const stats: Stat[] = data?.stats || [];

  const handleSave = async (statId: string, description: string) => {
    await db.transact([db.tx.stats[statId].update({ description })]);
  };

  const handleDelete = async (statId: string, valueIds: string[]) => {
    await db.transact([
      ...valueIds.map(v => db.tx.statValues[v].delete()),
      db.tx.stats[statId].delete(),
    ]);
  };

  const handleRefresh = async (stat: Stat) => {
    const variable = stat.variable.includes('_') ? stat.variable : stat.variable + '_001E';
    const features = await fetchZctaMetric(variable, { year: String(stat.year), dataset: stat.dataset });
    const valueTx = features.map(f => {
      const vid = id();
      return db.tx.statValues[vid]
        .update({ zcta: f.properties.ZCTA5CE10, value: f.properties.value ?? undefined })
        .link({ stat: stat.id });
    });
    const deleteTx = stat.values.map(v => db.tx.statValues[v.id].delete());
    await db.transact([...deleteTx, ...valueTx]);
  };

  if (isLoading) {
    return <div className="min-h-screen bg-gray-100 flex items-center justify-center">Loading...</div>;
  }

  if (error) {
    return <div className="min-h-screen bg-gray-100 flex items-center justify-center text-red-500">Error loading stats: {error.message}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <TopNav linkHref="/" linkText="Map" />
      <main className="flex-1 max-w-4xl mx-auto p-4 w-full">
        <h2 className="text-xl font-semibold mb-4">Stats</h2>
        <table className="min-w-full text-sm border">
          <thead>
            <tr>
              <th className="border px-2 py-1 text-left">Title</th>
              <th className="border px-2 py-1 text-left">Description</th>
              <th className="border px-2 py-1">Actions</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((s) => (
              <tr key={s.id}>
                <td className="border px-2 py-1">{s.title}</td>
                <td className="border px-2 py-1">
                  <input
                    className="w-full border px-1 py-0.5"
                    defaultValue={s.description}
                    onBlur={e => handleSave(s.id, e.target.value)}
                  />
                </td>
                <td className="border px-2 py-1 space-x-2">
                  <button className="text-blue-600 underline" onClick={() => handleRefresh(s)}>Refresh</button>
                  <button className="text-red-600 underline" onClick={() => handleDelete(s.id, s.values.map(v => v.id))}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </main>
    </div>
  );
}
