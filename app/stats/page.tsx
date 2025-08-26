'use client';

import NavBar from '../../components/NavBar';
import db from '../../lib/db';
import { fetchZctaMetric, type ZctaFeature } from '../../lib/census';
import type { Stat } from '../../types/stat';

export default function StatsPage() {
  const { data, isLoading, error } = db.useQuery({ stats: {} });

  const handleEdit = async (stat: Stat) => {
    const desc = prompt('Edit description', stat.description);
    if (desc !== null) {
      await db.transact([db.tx.stats[stat.id].update({ description: desc })]);
    }
  };

  const handleDelete = async (id: string) => {
    await db.transact([db.tx.stats[id].delete()]);
  };

  const handleRefresh = async (stat: Stat) => {
    if (stat.code.includes('/')) {
      const [numRaw, denRaw] = stat.code.split('/');
      const numId = numRaw.includes('_') ? numRaw : numRaw + '_001E';
      const denId = denRaw.includes('_') ? denRaw : denRaw + '_001E';
      const [numFeatures, denFeatures] = await Promise.all([
        fetchZctaMetric(numId, { year: String(stat.year), dataset: stat.dataset }),
        fetchZctaMetric(denId, { year: String(stat.year), dataset: stat.dataset }),
      ]);
      const numMap: Record<string, number | null> = {};
      numFeatures?.forEach((f: ZctaFeature) => {
        numMap[f.properties.ZCTA5CE10] = f.properties.value ?? null;
      });
      const denMap: Record<string, number | null> = {};
      denFeatures?.forEach((f: ZctaFeature) => {
        denMap[f.properties.ZCTA5CE10] = f.properties.value ?? null;
      });
      const zctaMap: Record<string, number | null> = {};
      const allZctas = new Set([
        ...Object.keys(numMap),
        ...Object.keys(denMap),
      ]);
      allZctas.forEach(z => {
        const n = numMap[z];
        const d = denMap[z];
        zctaMap[z] = n == null || d == null || d === 0 ? null : (n / d) * 100;
      });
      await db.transact([db.tx.stats[stat.id].update({ data: JSON.stringify(zctaMap) })]);
      return;
    }
    const varId = stat.code.includes('_') ? stat.code : stat.code + '_001E';
    const features = await fetchZctaMetric(varId, { year: String(stat.year), dataset: stat.dataset });
    const zctaMap: Record<string, number | null> = {};
    features?.forEach((f: ZctaFeature) => {
      zctaMap[f.properties.ZCTA5CE10] = f.properties.value ?? null;
    });
    await db.transact([db.tx.stats[stat.id].update({ data: JSON.stringify(zctaMap) })]);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <NavBar />
      <main className="flex-1 max-w-4xl mx-auto p-4 w-full overflow-x-auto">
        <h2 className="text-xl mb-4">Stat Management</h2>
        {isLoading && <div>Loading stats...</div>}
        {error && <div className="text-red-500">Error loading stats: {error.message}</div>}
        {data && (
          <table className="min-w-full text-sm border">
            <thead>
              <tr>
                <th className="border px-2 py-1 text-left">Code</th>
                <th className="border px-2 py-1 text-left">Description</th>
                <th className="border px-2 py-1 text-left">Details</th>
                <th className="border px-2 py-1 text-left">Category</th>
                <th className="border px-2 py-1 text-left">Dataset</th>
                <th className="border px-2 py-1 text-left">Source</th>
                <th className="border px-2 py-1 text-left">Year</th>
                <th className="border px-2 py-1 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.stats?.map((stat: Stat) => (
                <tr key={stat.id}>
                  <td className="border px-2 py-1">{stat.code}</td>
                  <td className="border px-2 py-1">{stat.description}</td>
                  <td className="border px-2 py-1">
                    {stat.code.includes('/') ? `100 * ${stat.code}` : ''}
                  </td>
                  <td className="border px-2 py-1">{stat.category}</td>
                  <td className="border px-2 py-1">{stat.dataset}</td>
                  <td className="border px-2 py-1">{stat.source}</td>
                  <td className="border px-2 py-1">{stat.year}</td>
                  <td className="border px-2 py-1 space-x-2">
                    <button
                      className="underline"
                      style={{ color: 'var(--color-info)' }}
                      onClick={() => handleEdit(stat)}
                    >
                      Edit
                    </button>
                    <button
                      className="underline"
                      style={{ color: 'var(--color-error)' }}
                      onClick={() => handleDelete(stat.id)}
                    >
                      Delete
                    </button>
                    <button
                      className="underline"
                      style={{ color: 'var(--color-success)' }}
                      onClick={() => handleRefresh(stat)}
                    >
                      Refresh
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </main>
    </div>
  );
}
