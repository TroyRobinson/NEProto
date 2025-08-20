'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import db from '../lib/db';
import AddOrganizationForm from '../components/AddOrganizationForm';
import CensusChat from '../components/CensusChat';
import TopNav from '../components/TopNav';
import { useMetrics } from '../components/MetricContext';
import OrganizationDetails from '../components/OrganizationDetails';
import SearchBar from '../components/SearchBar';
import SearchResults from '../components/SearchResults';
import type { Organization } from '../types/organization';

const OKCMap = dynamic(() => import('../components/OKCMap'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-gray-100 flex items-center justify-center">Loading map...</div>
});

export default function Home() {
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
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
  const displayedOrganizations = searchResults ?? organizations;

  const handleSearch = () => {
    const term = searchQuery.trim().toLowerCase();
    if (!term) {
      setSearchResults(null);
      setSelectedOrg(null);
      return;
    }
    const results = organizations.filter((org) =>
      org.name.toLowerCase().includes(term) ||
      org.description.toLowerCase().includes(term) ||
      org.category.toLowerCase().includes(term)
    );
    setSearchResults(results);
    setSelectedOrg(null);
  };

  return (
    <div className="h-screen bg-gray-100 flex flex-col overflow-hidden">
      <TopNav
        linkHref="/data"
        linkText="Data"
        onAddOrganization={() => setShowAddForm(true)}
      />

      <div className="flex flex-1 overflow-hidden relative">
        {selectedOrg ? (
          <OrganizationDetails
            organization={selectedOrg}
            onClose={() => {
              setSelectedOrg(null);
              setHoveredOrgId(null);
            }}
          />
        ) : (
          searchResults && (
            <SearchResults
              results={searchResults}
              onSelect={(org) => {
                setSelectedOrg(org);
                setHoveredOrgId(null);
              }}
              onHover={(org) => setHoveredOrgId(org ? org.id : null)}
            />
          )
        )}

        <div className="flex-1 relative">
          <OKCMap
            organizations={displayedOrganizations}
            onOrganizationClick={setSelectedOrg}
            zctaFeatures={zctaFeatures}
            highlightedOrgId={hoveredOrgId ?? undefined}
          />
        </div>

        <div className="absolute top-4 left-4 z-10">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            onSubmit={handleSearch}
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
