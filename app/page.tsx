'use client';

import React, { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import db from '../lib/db';
import AddOrganizationForm from '../components/AddOrganizationForm';
import CensusChat from '../components/CensusChat';
import TopNav from '../components/TopNav';
import { useMetrics } from '../components/MetricContext';
import OrganizationDetails from '../components/OrganizationDetails';
import type { Organization } from '../types/organization';
import OrgSearchSidebar from '../components/OrgSearchSidebar';
import { addOrgFromProPublica } from '../lib/propublica';

const OKCMap = dynamic(() => import('../components/OKCMap'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-gray-100 flex items-center justify-center">Loading map...</div>
});

export default function Home() {
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [searchResults, setSearchResults] = useState<Organization[]>([]);
  const [addedOrgs, setAddedOrgs] = useState<Organization[]>([]);
  const [hoveredOrgId, setHoveredOrgId] = useState<string | null>(null);
  const { zctaFeatures, addMetric, loadStatMetric } = useMetrics();

  const { data, isLoading, error } = db.useQuery({
    organizations: {
      locations: {},
      logo: {},
      photos: {}
    }
  });

  const dbOrgs = useMemo(() => data?.organizations || [], [data]);

  const organizations = useMemo(() => {
    const ids = new Set(dbOrgs.map(o => o.id));
    return [...dbOrgs, ...addedOrgs.filter(o => !ids.has(o.id))];
  }, [dbOrgs, addedOrgs]);

  const allOrganizations = useMemo(() => {
    const existing = new Set(organizations.map(o => o.name.toLowerCase()));
    return [...organizations, ...searchResults.filter(o => !existing.has(o.name.toLowerCase()))];
  }, [organizations, searchResults]);

  const handleOrganizationClick = async (org: Organization) => {
    if (org.id.startsWith('search-')) {
      const ein = parseInt(org.id.replace('search-', ''), 10);
      const saved = await addOrgFromProPublica(ein);
      if (saved) {
        setAddedOrgs(prev => [...prev, saved]);
        setSelectedOrg(saved);
        setSearchResults(prev => prev.filter(o => o.id !== org.id));
        return;
      }
    } else if (!organizations.find(o => o.id === org.id) && !addedOrgs.find(o => o.id === org.id)) {
      setAddedOrgs(prev => [...prev, org]);
    }
    setSelectedOrg(org);
  };

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

  return (
    <div className="h-screen bg-gray-100 flex flex-col overflow-hidden">
      <TopNav
        linkHref="/data"
        linkText="Data"
        onAddOrganization={() => setShowAddForm(true)}
      />

      <div className="flex flex-1 overflow-hidden">
        <OrgSearchSidebar
          existingOrgs={organizations}
          onResults={setSearchResults}
          onSelect={handleOrganizationClick}
          onHover={setHoveredOrgId}
        />

        {selectedOrg && (
          <OrganizationDetails
            organization={selectedOrg}
            onClose={() => setSelectedOrg(null)}
          />
        )}

        <div className="flex-1 relative">
          <OKCMap
            organizations={allOrganizations}
            selectedOrgId={selectedOrg?.id || null}
            hoveredOrgId={hoveredOrgId}
            onOrganizationClick={handleOrganizationClick}
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

      <div className="fixed bottom-4 right-4 w-[30rem] h-[32rem] bg-white text-gray-900 shadow-lg p-2 border">
        <CensusChat onAddMetric={addMetric} onLoadStat={loadStatMetric} />
      </div>
    </div>
  );
}
