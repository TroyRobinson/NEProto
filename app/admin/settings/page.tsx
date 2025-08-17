'use client';

import { useEffect, useState } from 'react';
import { id } from '@instantdb/react';
import TopNav from '../../../components/TopNav';
import db from '../../../lib/db';

export default function AdminSettingsPage() {
  const query = db?.useQuery({ settings: { $: { limit: 1 } } });
  const existing = query?.data?.settings?.[0];
  const [freq, setFreq] = useState<number>(existing?.datasetRefreshHours || 24);

  useEffect(() => {
    if (existing) setFreq(existing.datasetRefreshHours);
  }, [existing]);

  if (!db) {
    return <div className="p-4 text-red-500">Database not configured.</div>;
  }

  async function save() {
    if (!db) return;
    const settingId = existing?.id || id();
    await db.transact([
      db.tx.settings[settingId].update({ datasetRefreshHours: freq })
    ]);
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-background shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-foreground">Admin Settings</h1>
          <TopNav />
        </div>
      </header>
      <main className="max-w-3xl mx-auto p-4 space-y-4">
        <label className="block">
          <span className="text-sm">Dataset title refresh (hours)</span>
          <input
            type="number"
            value={freq}
            onChange={(e) => setFreq(Number(e.target.value))}
            className="mt-1 w-full border px-3 py-2 rounded"
          />
        </label>
        <button
          onClick={save}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          Save
        </button>
      </main>
    </div>
  );
}
