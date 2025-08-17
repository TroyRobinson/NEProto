'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import db from '../lib/db';

interface Props {
  selected: string | null;
  onSelect: (id: string | null) => void;
}

export default function StatsSidebar({ selected, onSelect }: Props) {
  const { data } = db.useQuery({ stats: {} });
  const stats = data?.stats || [];
  return (
    <div className="absolute top-4 left-4 z-10 space-y-2 bg-white/90 p-3 rounded shadow">
      {stats.map((stat: any) => (
        <button
          key={stat.id}
          onClick={() => onSelect(selected === stat.id ? null : stat.id)}
          className={`block w-full text-left px-3 py-1 rounded ${selected === stat.id ? 'bg-blue-600 text-white' : 'bg-white text-gray-800 border'}`}
        >
          {stat.title}
        </button>
      ))}
      {stats.length === 0 && <div className="text-sm text-gray-500">No stats</div>}
    </div>
  );
}
