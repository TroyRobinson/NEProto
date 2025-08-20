'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import db from '../lib/db';
import AddOrganizationForm from '../components/AddOrganizationForm';
import CensusChat from '../components/CensusChat';
import TopNav from '../components/TopNav';
import { useMetrics } from '../components/MetricContext';
import OrganizationDetails from '../components/OrganizationDetails';
import type { Organization } from '../types/organization';

const OKCMap = dynamic(() => import('../components/OKCMap'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-gray-100 flex items-center justify-center">Loading map...</div>
});

export default function Home() {
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Organization[] | null>(null);
  const [hoveredOrgId, setHoveredOrgId] = useState<string | null>(null);
  const { zctaFeatures, addMetric, loadStatMetric } = useMetrics();

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
  const handleSearch = () => {
    const term = searchTerm.trim().toLowerCase();
    setSelectedOrg(null);
    if (!term) {
      setSearchResults(null);
      return;
    }
    const results = organizations.filter(
      (org) =>
        org.name.toLowerCase().includes(term) ||
        org.category.toLowerCase().includes(term) ||
        org.description?.toLowerCase().includes(term)
    );
    setSearchResults(results);
  };
  const mapOrganizations = searchResults ?? organizations;

  return (
    <div className="h-screen bg-gray-100 flex flex-col overflow-hidden">
      <TopNav
        linkHref="/data"
        linkText="Data"
        onAddOrganization={() => setShowAddForm(true)}
      />

      <input
        type="text"
        placeholder="Search organizations..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSearch();
        }}
        className="fixed top-24 left-4 z-50 bg-white border rounded px-3 py-2 shadow w-64 text-gray-900"
      />

      <div className="flex flex-1 overflow-hidden">
        {selectedOrg ? (
          <OrganizationDetails
            organization={selectedOrg}
            onClose={() => setSelectedOrg(null)}
          />
        ) : (
          searchResults && (
            <div className="w-96 bg-white overflow-y-auto border-r">
              {searchResults.map((org) => (
                <div
                  key={org.id}
                  className="p-4 border-b hover:bg-gray-50 cursor-pointer"
                  onMouseEnter={() => setHoveredOrgId(org.id)}
                  onMouseLeave={() => setHoveredOrgId(null)}
                  onClick={() => {
                    setSelectedOrg(org);
                    setHoveredOrgId(null);
                  }}
                >
                  <div className="font-semibold">{org.name}</div>
                  <div className="text-sm text-gray-600">{org.category}</div>
                  {org.description && (
                    <div className="text-xs text-gray-500 line-clamp-2">
                      {org.description}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        )}

        <div className="flex-1 relative">
          <OKCMap
            organizations={mapOrganizations}
            onOrganizationClick={(org) => {
              setSelectedOrg(org);
              setHoveredOrgId(null);
            }}
            zctaFeatures={zctaFeatures}
            highlightedOrgId={hoveredOrgId}
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

      <div className="fixed bottom-4 right-4 w-[30rem] h-[32rem] bg-white text-gray-900 shadow-lg p-2 border">
        <CensusChat onAddMetric={addMetric} onLoadStat={loadStatMetric} />
      </div>
    </div>
  );
}
