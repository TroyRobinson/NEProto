'use client';

import React from 'react';
import db from '../../lib/db';

export default function DebugPage() {
  if (!db) {
    return <div className="p-8 text-red-500">Database not configured.</div>;
  }
  const { data, isLoading, error } = db.useQuery({
    organizations: {
      locations: {},
      logo: {},
      photos: {}
    }
  });

  if (isLoading) {
    return <div className="p-8">Loading organizations...</div>;
  }

  if (error) {
    return <div className="p-8 text-red-500">Error: {error.message}</div>;
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Debug Page</h1>
      <p>Organizations loaded: {data?.organizations?.length || 0}</p>
      
      {data?.organizations?.map((org) => (
        <div key={org.id} className="border p-4 mb-4">
          <h3 className="font-bold">{org.name}</h3>
          <p>{org.description}</p>
          <p>Category: {org.category}</p>
          <p>Locations: {org.locations?.length || 0}</p>
        </div>
      ))}
    </div>
  );
}