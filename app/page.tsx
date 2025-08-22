'use client';

import React, { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import db from '../lib/db';
import AddOrganizationForm from '../components/AddOrganizationForm';
import CensusChat from '../components/CensusChat';
import NavBar from '../components/NavBar';
import MetricDropdown from '../components/MetricDropdown';
import { useMetrics } from '../components/MetricContext';
import OrganizationDetails from '../components/OrganizationDetails';
import OrgSearchSidebar from '../components/OrgSearchSidebar';
import { addOrgFromProPublica } from '../lib/propublica';
import type { Organization } from '../types/organization';

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
  const [isChatCollapsed, setIsChatCollapsed] = useState(false);
  const { metrics, selectedMetric, selectMetric, clearMetrics, zctaFeatures, addMetric, loadStatMetric } = useMetrics();

  // Close Add Organization modal on Escape key
  useEffect(() => {
    if (!showAddForm) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowAddForm(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showAddForm]);

  const { data, isLoading, error } = db.useQuery({
    organizations: {
      locations: {},
      logo: {},
      photos: {},
    },
  });

  const dbOrgs = useMemo(() => data?.organizations || [], [data]);

  const organizations = useMemo(() => {
    const ids = new Set(dbOrgs.map((o) => o.id));
    return [...dbOrgs, ...addedOrgs.filter((o) => !ids.has(o.id))];
  }, [dbOrgs, addedOrgs]);

  const allOrganizations = useMemo(() => {
    const existingNames = new Set(organizations.map((o) => o.name.toLowerCase()));
    const existingEins = new Set(organizations.map((o) => o.ein).filter(Boolean) as number[]);
    return [
      ...organizations,
      ...searchResults.filter(
        (o) => (!o.ein || !existingEins.has(o.ein)) && !existingNames.has(o.name.toLowerCase())
      ),
    ];
  }, [organizations, searchResults]);

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

  const handleOrganizationClick = async (org: Organization) => {
    if (org.id.startsWith('search-')) {
      const ein = org.ein || parseInt(org.id.replace('search-', ''), 10);
      const saved = await addOrgFromProPublica(ein);
      if (saved) {
        setAddedOrgs((prev) => [...prev, saved]);
        setSelectedOrg(saved);
        setSearchResults((prev) => prev.filter((o) => o.id !== org.id));
        return;
      }
    } else if (!organizations.find((o) => o.id === org.id) && !addedOrgs.find((o) => o.id === org.id)) {
      setAddedOrgs((prev) => [...prev, org]);
    }
    setSelectedOrg(org);
  };

  return (
    <div className="h-screen bg-gray-100 flex flex-col overflow-hidden">
      <NavBar onAddOrganization={() => setShowAddForm(true)} />

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
            onOrganizationClick={handleOrganizationClick}
            zctaFeatures={zctaFeatures}
            selectedOrgId={selectedOrg?.id || null}
            hoveredOrgId={hoveredOrgId}
            onOrganizationHover={setHoveredOrgId}
          />

          {/* Overlay metrics glass bar over the map */}
          {metrics.length > 0 && (
            <div className="absolute inset-x-0 top-2 z-30 flex justify-start">
              <div
                className="border shadow-sm flex items-center gap-2 mx-10"
                style={{
                  paddingLeft: 'var(--spacing-3)',
                  paddingRight: 'var(--spacing-3)',
                  paddingTop: 'var(--spacing-2)',
                  paddingBottom: 'var(--spacing-2)',
                  borderRadius: 'var(--radius-box)',
                  borderColor: 'rgba(255, 255, 255, 0.25)',
                  backgroundColor: 'rgba(255, 255, 255, 0.10)',
                  backdropFilter: 'blur(16px) saturate(1.25)',
                  WebkitBackdropFilter: 'blur(16px) saturate(1.25)',
                }}
              >
                <MetricDropdown metrics={metrics} selected={selectedMetric} onSelect={selectMetric} />
                <button
                  onClick={clearMetrics}
                  className="border transition-colors"
                  style={{
                    paddingLeft: 'var(--spacing-3)',
                    paddingRight: 'var(--spacing-3)',
                    paddingTop: 'var(--spacing-1)',
                    paddingBottom: 'var(--spacing-1)',
                    borderRadius: 'var(--radius-field)',
                    fontSize: 'var(--font-size-l)',
                    color: 'var(--color-error)',
                    borderColor: 'var(--color-error)',
                    backgroundColor: 'var(--color-base-100)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--color-error-50)';
                    e.currentTarget.style.color = 'var(--color-error)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--color-base-100)';
                    e.currentTarget.style.color = 'var(--color-error)';
                  }}
                  aria-label="Clear active stats"
                >
                  ×
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showAddForm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4 overflow-hidden" onClick={() => setShowAddForm(false)}>
          <div className="max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
            <AddOrganizationForm
              onSuccess={() => setShowAddForm(false)}
              onCancel={() => setShowAddForm(false)}
            />
          </div>
        </div>
      )}

      {!isChatCollapsed ? (
        <div className="fixed bottom-4 right-4 w-[30rem] h-[32rem] bg-white text-gray-900 shadow-lg p-2 border rounded-lg">
          <CensusChat onAddMetric={addMetric} onLoadStat={loadStatMetric} onClose={() => setIsChatCollapsed(true)} />
        </div>
      ) : (
        <button
          onClick={() => setIsChatCollapsed(false)}
          className="fixed bottom-4 right-4 w-14 h-14 bg-white shadow-lg rounded-full flex items-center justify-center border hover:bg-gray-50 transition-colors"
          aria-label="Open chat"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </button>
      )}
    </div>
  );
}
