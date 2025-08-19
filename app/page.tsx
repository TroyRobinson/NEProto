'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import db from '../lib/db';
import AddOrganizationForm from '../components/AddOrganizationForm';
import CensusChat from '../components/CensusChat';
import TopNav from '../components/TopNav';
import { useMetrics } from '../components/MetricContext';
import type { Organization } from '../types/organization';

const OKCMap = dynamic(() => import('../components/OKCMap'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-gray-100 flex items-center justify-center">Loading map...</div>
});

export default function Home() {
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const { zctaFeatures, addMetric } = useMetrics();

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
    <div className="h-screen bg-gray-100 flex flex-col overflow-hidden">
      <TopNav
        linkHref="/data"
        linkText="Data"
        onAddOrganization={() => setShowAddForm(true)}
      />

      <div className="flex flex-1 overflow-hidden">
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
                      <span className="font-medium text-gray-900">Website: </span>
                      <a href={selectedOrg.website} target="_blank" rel="noopener noreferrer" 
                         className="text-blue-600 hover:underline">
                        {selectedOrg.website}
                      </a>
                    </div>
                  )}
                  
                  {selectedOrg.phone && (
                    <div>
                      <span className="font-medium text-gray-900">Phone: </span>
                      <a href={`tel:${selectedOrg.phone}`} className="text-blue-600">
                        {selectedOrg.phone}
                      </a>
                    </div>
                  )}
                  
                  {selectedOrg.email && (
                    <div>
                      <span className="font-medium text-gray-900">Email: </span>
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

        <div className="flex-1 relative">
          <OKCMap
            organizations={organizations}
            onOrganizationClick={setSelectedOrg}
            zctaFeatures={zctaFeatures}
          />
        </div>
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

      <div className="fixed bottom-4 right-4 w-80 h-[32rem] bg-white text-gray-900 shadow-lg p-2 border">
        <CensusChat onAddMetric={addMetric} />
      </div>
    </div>
  );
}
