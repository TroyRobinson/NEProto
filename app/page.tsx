'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import db from '../lib/db';
import AddOrganizationForm from '../components/AddOrganizationForm';
import type { Organization } from '../types/organization';
import TopNav from '../components/TopNav';

interface CustomMetric {
  key: string;
  label: string;
  dataset: string;
  variable: string;
}

const OKCMap = dynamic(() => import('../components/OKCMap'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-gray-100 flex items-center justify-center">Loading map...</div>
});

export default function Home() {
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [metric, setMetric] = useState<string>('population');
  const [customMetrics, setCustomMetrics] = useState<CustomMetric[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored: CustomMetric[] = JSON.parse(
        localStorage.getItem('customMetrics') || '[]'
      );
      setCustomMetrics(stored);
    } catch {
      /* ignore */
    }
  }, []);

  const { data, isLoading, error } = db.useQuery({
    organizations: {
      locations: {},
      logo: {},
      photos: {}
    }
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-lg">Loading organizations...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-red-500">Error loading data: {error.message}</div>
      </div>
    );
  }

  const organizations = data?.organizations || [];

  return (
    <div className="min-h-screen bg-gray-100">
      <TopNav onAddClick={() => setShowAddForm(true)} />

      <div className="flex">
        <div className="flex-1 h-screen relative">
          <div className="absolute top-4 left-4 z-10 bg-white p-2 rounded shadow text-sm text-foreground">
            <label className="mr-2">Choropleth:</label>
            <select
              value={metric}
              onChange={(e) => setMetric(e.target.value)}
              className="border px-1 py-0.5"
            >
              <option value="population">Population</option>
              <option value="applications">Business Applications</option>
              {customMetrics.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <OKCMap
            organizations={organizations}
            onOrganizationClick={setSelectedOrg}
            metric={metric}
            customMetrics={customMetrics}
          />
        </div>

        {selectedOrg && (
          <div className="w-96 bg-white shadow-lg overflow-y-auto text-foreground">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-bold">{selectedOrg.name}</h2>
                <button
                  onClick={() => setSelectedOrg(null)}
                  className="text-foreground/60 hover:text-foreground"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                    {selectedOrg.category}
                  </span>
                </div>

                <p className="text-foreground/80">{selectedOrg.description}</p>

                {selectedOrg.statistics && (
                  <div>
                    <h3 className="font-semibold mb-1">Impact & Statistics</h3>
                    <p className="text-sm text-foreground/80">{selectedOrg.statistics}</p>
                  </div>
                )}

                <div className="space-y-2 text-sm">
                  {selectedOrg.website && (
                    <div>
                      <span className="font-medium">Website: </span>
                      <a href={selectedOrg.website} target="_blank" rel="noopener noreferrer"
                         className="text-blue-600 hover:underline">
                        {selectedOrg.website}
                      </a>
                    </div>
                  )}
                  
                  {selectedOrg.phone && (
                    <div>
                      <span className="font-medium">Phone: </span>
                      <a href={`tel:${selectedOrg.phone}`} className="text-blue-600">
                        {selectedOrg.phone}
                      </a>
                    </div>
                  )}
                  
                  {selectedOrg.email && (
                    <div>
                      <span className="font-medium">Email: </span>
                      <a href={`mailto:${selectedOrg.email}`} className="text-blue-600">
                        {selectedOrg.email}
                      </a>
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Locations</h3>
                  {selectedOrg.locations.map((location) => (
                    <div key={location.id} className="text-sm text-foreground/80 mb-1">
                      <div className="flex items-start">
                        {location.isPrimary && (
                          <span className="text-blue-600 text-xs mr-1">●</span>
                        )}
                        {location.address}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <AddOrganizationForm
              onSuccess={() => setShowAddForm(false)}
              onCancel={() => setShowAddForm(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
