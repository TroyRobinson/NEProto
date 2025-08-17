'use client';

import { useEffect, useState } from 'react';
import { id } from '@instantdb/react';
import db from '../../../lib/db';

export default function AdminSettingsPage() {
  const { data } = db.useQuery({ settings: { $: { limit: 1 } } });
  const existing = data?.settings?.[0];
  const [freq, setFreq] = useState<number>(existing?.datasetRefreshHours || 24);

  useEffect(() => {
    if (existing) setFreq(existing.datasetRefreshHours);
  }, [existing]);

  async function save() {
    const settingId = existing?.id || id();
    await db.transact([
      db.tx.settings[settingId].update({ datasetRefreshHours: freq })
    ]);
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Admin Settings</h1>
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
    </div>
  );
}
