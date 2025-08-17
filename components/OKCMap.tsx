'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useMemo, useEffect } from 'react';
import Map from 'react-map-gl/maplibre';
import { ScatterplotLayer } from '@deck.gl/layers';
import { GeoJsonLayer } from '@deck.gl/geo-layers';
import DeckGL from '@deck.gl/react';
import type { Organization } from '../types/organization';
import { fetchChoropleth, colorScale, type Geography } from '../lib/census';

interface OKCMapProps {
  organizations: Organization[];
  onOrganizationClick?: (org: Organization) => void;
}

const OKC_CENTER = {
  longitude: -97.5164,
  latitude: 35.4676
};

export default function OKCMap({ organizations, onOrganizationClick }: OKCMapProps) {
  const [viewState, setViewState] = useState({
    longitude: OKC_CENTER.longitude,
    latitude: OKC_CENTER.latitude,
    zoom: 11,
    pitch: 0,
    bearing: 0
  });
  const [geography, setGeography] = useState<Geography>('zcta');
  const [variable, setVariable] = useState('B01003_001E');
  const [censusData, setCensusData] = useState<any>(null);

  useEffect(() => {
    fetchChoropleth({ variable, geography })
      .then(setCensusData)
      .catch((err) => console.error('Census fetch failed', err));
  }, [variable, geography]);

  const [min, max] = useMemo(() => {
    if (!censusData) return [0, 1];
    const values = censusData.features
      .map((f: any) => f.properties?.value)
      .filter((v: any) => typeof v === 'number');
    return [Math.min(...values), Math.max(...values)];
  }, [censusData]);

  const layers = useMemo(() => {
    const data = organizations.flatMap(org =>
      org.locations.map(location => ({
        coordinates: [location.longitude, location.latitude] as [number, number],
        organization: org,
        color: getCategoryColor(org.category)
      }))
    );

    const choropleth = censusData
      ? new GeoJsonLayer({
          id: 'census-choropleth',
          data: censusData,
          pickable: true,
          stroked: true,
          filled: true,
          getFillColor: (f: any) => colorScale(f.properties?.value ?? null, min, max),
          getLineColor: [255, 255, 255],
          lineWidthMinPixels: 1
        })
      : null;

    const scatter = new ScatterplotLayer({
      id: 'organizations',
      data: data,
      getPosition: (d: any) => d.coordinates,
      getRadius: 200,
      getFillColor: (d: any) => d.color,
      getLineColor: [0, 0, 0, 100],
      getLineWidth: 2,
      radiusScale: 1,
      radiusMinPixels: 8,
      radiusMaxPixels: 20,
      pickable: true,
      onClick: (info: any) => {
        if (info.object && onOrganizationClick) {
          onOrganizationClick(info.object.organization);
        }
      }
    });

    return choropleth ? [choropleth, scatter] : [scatter];
  }, [organizations, onOrganizationClick, censusData, min, max]);

  return (
    <div className="w-full h-full relative">
      <div className="absolute top-2 left-2 z-10 bg-white p-2 rounded shadow space-y-2 text-sm">
        <select
          className="border rounded p-1 w-full"
          value={variable}
          onChange={(e) => setVariable(e.target.value)}
        >
          <option value="B01003_001E">Population (ACS 2021)</option>
          <option value="B19013_001E">Median Income (ACS 2021)</option>
        </select>
        <select
          className="border rounded p-1 w-full"
          value={geography}
          onChange={(e) => setGeography(e.target.value as Geography)}
        >
          <option value="zcta">ZIP Code</option>
          <option value="tract">Census Tract</option>
          <option value="county">County</option>
        </select>
      </div>
      <DeckGL
        viewState={viewState}
        onViewStateChange={(e: any) => setViewState(e.viewState)}
        controller={true}
        layers={layers}
        style={{ width: '100%', height: '100%' }}
      >
        <Map
          mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
          style={{ width: '100%', height: '100%' }}
        />
      </DeckGL>
    </div>
  );
}

function getCategoryColor(category: string): [number, number, number, number] {
  const colors: Record<string, [number, number, number, number]> = {
    'Food Security': [220, 53, 69, 200],
    'Housing & Shelter': [13, 110, 253, 200],
    'Education': [25, 135, 84, 200],
    'Healthcare': [220, 53, 133, 200],
    'Youth Development': [255, 193, 7, 200],
    'Senior Services': [108, 117, 125, 200],
    'Environmental': [32, 201, 151, 200],
    'Arts & Culture': [111, 66, 193, 200],
    'Community Development': [253, 126, 20, 200],
    'Other': [134, 142, 150, 200]
  };
  
  return colors[category] || colors['Other'];
}