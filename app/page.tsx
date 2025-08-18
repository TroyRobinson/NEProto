'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import db from '../lib/db';
import AddOrganizationForm from '../components/AddOrganizationForm';
import CircularAddButton from '../components/CircularAddButton';
import CensusChat from '../components/CensusChat';
import MetricDropdown from '../components/MetricDropdown';
import MetricsTable from '../components/MetricsTable';
import { fetchZctaMetric, type ZctaFeature } from '../lib/census';
import type { Organization } from '../types/organization';

const OKCMap = dynamic(() => import('../components/OKCMap'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-gray-100 flex items-center justify-center">Loading map...</div>
});

export default function Home() {
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [metrics, setMetrics] = useState<{ id: string; label: string }[]>([]);
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
  const [zctaFeatures, setZctaFeatures] = useState<ZctaFeature[] | undefined>();
  const [metricFeatures, setMetricFeatures] = useState<Record<string, ZctaFeature[]>>({});

  const addMetric = async (m: { id: string; label: string }) => {
    setMetrics(prev => (prev.find(p => p.id === m.id) ? prev : [...prev, m]));
    setSelectedMetric(m.id);
    let features = metricFeatures[m.id];
    if (!features) {
      const varId = m.id.includes('_') ? m.id : m.id + '_001E';
      features = await fetchZctaMetric(varId);
      setMetricFeatures(prev => ({ ...prev, [m.id]: features! }));
    }
    setZctaFeatures(features);
  };

  const handleMetricSelect = async (id: string) => {
    setSelectedMetric(id);
    let features = metricFeatures[id];
    if (!features) {
      const varId = id.includes('_') ? id : id + '_001E';
      features = await fetchZctaMetric(varId);
      setMetricFeatures(prev => ({ ...prev, [id]: features! }));
    }
    setZctaFeatures(features);
  };

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
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">OKC Non-Profit Map</h1>
            <p className="text-gray-600">Discover local organizations making a difference</p>
          </div>
          <div className="flex items-center gap-4">
            <a href="/data" className="text-blue-600 underline text-sm">Data</a>
            <MetricDropdown metrics={metrics} selected={selectedMetric} onSelect={handleMetricSelect} />
            <CircularAddButton onClick={() => setShowAddForm(true)} />
          </div>
        </div>
      </header>

      <div className="flex">
        <div className="flex-1 h-screen relative">
          <OKCMap
            organizations={organizations}
            onOrganizationClick={setSelectedOrg}
            zctaFeatures={zctaFeatures}
          />
        </div>

        {selectedOrg && (
          <div className="w-96 bg-white shadow-lg overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-bold text-gray-900">{selectedOrg.name}</h2>
                <button
                  onClick={() => setSelectedOrg(null)}
                  className="text-gray-400 hover:text-gray-600"
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
                
                <p className="text-gray-700">{selectedOrg.description}</p>
                
                {selectedOrg.statistics && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Impact & Statistics</h3>
                    <p className="text-gray-700 text-sm">{selectedOrg.statistics}</p>
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
                  <h3 className="font-semibold text-gray-900 mb-2">Locations</h3>
                  {selectedOrg.locations.map(location => (
                    <div key={location.id} className="text-sm text-gray-700 mb-1">
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

      <div className="max-w-7xl mx-auto px-4">
        <MetricsTable metrics={metrics} />
      </div>

      <div className="fixed bottom-4 right-4 w-80 h-96 bg-gray-900 text-gray-100 shadow-lg p-2">
        <CensusChat onAddMetric={addMetric} />
      </div>
    </div>
  );
}
