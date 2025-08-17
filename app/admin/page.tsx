'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import db from '@/lib/db';

export default function AdminPage() {
  const { data } = db.useQuery({
    settings: {
      $: { limit: 1 },
      id: true,
      datasetRefreshHours: true,
    },
  });
  const current = data?.settings?.[0];
  const [hours, setHours] = useState('24');

  useEffect(() => {
    if (current?.datasetRefreshHours !== undefined) {
      setHours(String(current.datasetRefreshHours));
    }
  }, [current?.datasetRefreshHours]);

  async function save(val: string) {
    setHours(val);
    const id = current?.id || 'global';
    await db.transact([
      db.tx.settings[id].update({ datasetRefreshHours: Number(val) }),
    ]);
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Admin Settings</h1>
          <Link href="/" className="text-blue-600 hover:underline">
            Map
          </Link>
        </div>
      </header>
      <main className="max-w-2xl mx-auto p-4">
        <div className="mb-4">
          <label className="block mb-1">Dataset refresh frequency (hours)</label>
          <select
            value={hours}
            onChange={(e) => save(e.target.value)}
            className="border rounded p-2"
          >
            <option value="1">1</option>
            <option value="6">6</option>
            <option value="12">12</option>
            <option value="24">24</option>
            <option value="168">168</option>
          </select>
        </div>
      </main>
    </div>
  );
}
