'use client';

import NavBar from '../../components/NavBar';
import db from '../../lib/db';
import { fetchZctaMetric, type ZctaFeature } from '../../lib/census';
import { getZctasForRegion, normalizeRegion, regionForCity } from '../../lib/regions';
import type { Stat } from '../../types/stat';

export default function StatsPage() {
  const { data, isLoading, error } = db.useQuery({ stats: {} });

  const datasetLabel = (d: string) => {
    if (d === 'acs/acs5') return 'ACS 5-year';
    if (d === 'acs/acs1') return 'ACS 1-year';
    if (d === 'dec/pl') return 'Decennial 2020 PL';
    return d;
    };

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
    const raw = stat.codeRaw || stat.code;
    const varId = raw.includes('_') ? raw : raw + '_001E';
    const regionKey = stat.city ? regionForCity(stat.city) : normalizeRegion(stat.region || 'Oklahoma County');
    const features = await fetchZctaMetric(varId, {
      year: String(stat.year),
      dataset: stat.dataset,
      zctas: getZctasForRegion(regionKey),
    });
    const zctaMap: Record<string, number | null> = {};
    features?.forEach((f: ZctaFeature) => {
      zctaMap[f.properties.ZCTA5CE10] = f.properties.value ?? null;
    });
    await db.transact([
      db.tx.stats[stat.id].update({ data: JSON.stringify(zctaMap) }),
    ]);
  };

  const cityLabel = (region?: string) => {
    switch (region) {
      case 'Tulsa County':
        return 'Tulsa';
      case 'Wichita':
      case 'Sedgwick County':
        return 'Wichita';
      case 'Oklahoma County':
      default:
        return 'OKC';
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <NavBar />
      <main className="flex-1 mx-auto p-4 w-full overflow-x-auto">
        <h2 className="text-xl mb-4">Stat Management</h2>
        {isLoading && <div>Loading stats...</div>}
        {error && <div className="text-red-500">Error loading stats: {error.message}</div>}
        {data && (
          <table className="min-w-full text-sm border">
            <thead>
              <tr>
                <th className="border px-2 py-1 text-left">Code</th>
                <th className="border px-2 py-1 text-left">City</th>
                <th className="border px-2 py-1 text-left">Description</th>
                <th className="border px-2 py-1 text-left">Category</th>
                <th className="border px-2 py-1 text-left">Dataset</th>
                <th className="border px-2 py-1 text-left">Source</th>
                <th className="border px-2 py-1 text-left">Geo</th>
                <th className="border px-2 py-1 text-left">Year</th>
                <th className="border px-2 py-1 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {[...(data.stats as Stat[])]
                .sort((a, b) => {
                  const ac = (a.codeRaw || a.code).localeCompare(b.codeRaw || b.code);
                  if (ac !== 0) return ac;
                  const cityA = (a.city || '').localeCompare(b.city || '');
                  if (cityA !== 0) return cityA;
                  return String(a.year).localeCompare(String(b.year));
                })
                .map((stat: Stat) => (
                <tr key={stat.id}>
                  <td className="border px-2 py-1">{stat.codeRaw || stat.code}</td>
                  <td className="border px-2 py-1">{stat.city || (stat.region === 'Tulsa County' ? 'Tulsa' : stat.region === 'Wichita' || stat.region === 'Sedgwick County' ? 'Wichita' : 'OKC')}</td>
                  <td className="border px-2 py-1">{stat.description}</td>
                  <td className="border px-2 py-1">{stat.category}</td>
                  <td className="border px-2 py-1">{datasetLabel(stat.dataset)}</td>
                  <td className="border px-2 py-1">{stat.source}</td>
                  <td className="border px-2 py-1">{stat.geography || 'ZIP'}</td>
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
