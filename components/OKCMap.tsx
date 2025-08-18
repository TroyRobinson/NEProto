'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useMemo } from 'react';
import Map from 'react-map-gl/maplibre';
import { ScatterplotLayer, GeoJsonLayer } from '@deck.gl/layers';
import DeckGL from '@deck.gl/react';
import type { Organization } from '../types/organization';

import type { ZctaFeature } from '../lib/census';

interface OKCMapProps {
  organizations: Organization[];
  onOrganizationClick?: (org: Organization) => void;
  zctaFeatures?: ZctaFeature[];
}

const OKC_CENTER = {
  longitude: -97.5164,
  latitude: 35.4676
};

export default function OKCMap({ organizations, onOrganizationClick, zctaFeatures }: OKCMapProps) {
  const [viewState, setViewState] = useState({
    longitude: OKC_CENTER.longitude,
    latitude: OKC_CENTER.latitude,
    zoom: 11,
    pitch: 0,
    bearing: 0
  });

  const layers = useMemo(() => {
    const orgData = organizations.flatMap(org =>
      org.locations.map(location => ({
        coordinates: [location.longitude, location.latitude] as [number, number],
        organization: org,
        color: getCategoryColor(org.category)
      }))
    );
    const layers: any[] = [
      new ScatterplotLayer({
        id: 'organizations',
        data: orgData,
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
      })
    ];
    if (zctaFeatures && zctaFeatures.length > 0) {
      const vals = zctaFeatures
        .map((f) => f.properties.value)
        .filter((v): v is number => v != null);
      const min = Math.min(...vals);
      const max = Math.max(...vals);
      const range = max - min || 1;

      // Indigo gradient from light (indigo-100) to dark (indigo-700)
      const start: [number, number, number] = [224, 231, 255];
      const end: [number, number, number] = [67, 56, 202];

      const getMetricColor = (value: number | null): [number, number, number, number] => {
        if (value == null) return [0, 0, 0, 0];
        const t = (value - min) / range;
        const r = Math.round(start[0] + t * (end[0] - start[0]));
        const g = Math.round(start[1] + t * (end[1] - start[1]));
        const b = Math.round(start[2] + t * (end[2] - start[2]));
        return [r, g, b, 160];
      };

      layers.unshift(
        new GeoJsonLayer({
          id: 'zcta-metric',
          data: zctaFeatures,
          stroked: true,
          filled: true,
          getFillColor: (f: any) => getMetricColor(f.properties.value),
          getLineColor: [0, 0, 0, 80],
          lineWidthMinPixels: 1,
          pickable: true,
        }) as any
      );
    }
    return layers;
  }, [organizations, onOrganizationClick, zctaFeatures]);

  return (
    <div className="w-full h-full relative">
      <DeckGL
        viewState={viewState}
        onViewStateChange={(e: any) => setViewState(e.viewState)}
        controller={true}
        layers={layers}
        style={{width: '100%', height: '100%'}}
        getTooltip={({ object }) => {
          if (object && 'properties' in object && object.properties &&
            'value' in object.properties && object.properties.value != null) {
            const zcta = (object as any).properties.ZCTA5CE10;
            const val = (object as any).properties.value as number;
            return { text: `ZIP ${zcta}: $${val.toLocaleString()}` };
          }
          return null;
        }}
      >
        <Map
          mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
          style={{width: '100%', height: '100%'}}
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
