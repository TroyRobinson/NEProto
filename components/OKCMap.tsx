'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useMemo, useEffect } from 'react';
import Map from 'react-map-gl/maplibre';
import { ScatterplotLayer, GeoJsonLayer } from '@deck.gl/layers';
import DeckGL from '@deck.gl/react';
import type { Organization } from '../types/organization';
import type { StatValue } from '../types/stat';

interface OKCMapProps {
  organizations: Organization[];
  statValues?: StatValue[];
  onOrganizationClick?: (org: Organization) => void;
}

const OKC_CENTER = {
  longitude: -97.5164,
  latitude: 35.4676
};

export default function OKCMap({ organizations, statValues, onOrganizationClick }: OKCMapProps) {
  const [viewState, setViewState] = useState({
    longitude: OKC_CENTER.longitude,
    latitude: OKC_CENTER.latitude,
    zoom: 11,
    pitch: 0,
    bearing: 0
  });
  const [geojson, setGeojson] = useState<any | null>(null);

  useEffect(() => {
    if (statValues) {
      fetch('/okc_tracts.geojson').then(r => r.json()).then(setGeojson).catch(() => {});
    }
  }, [statValues]);

  const layers = useMemo(() => {
    const data = organizations.flatMap(org => 
      org.locations.map(location => ({
        coordinates: [location.longitude, location.latitude] as [number, number],
        organization: org,
        color: getCategoryColor(org.category)
      }))
    );

    const layersList: any[] = [
      new ScatterplotLayer({
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
      })
    ];

    if (geojson && statValues) {
      const valueMap = new Map(statValues.map(v => [v.geoid, v.value]));
      layersList.push(
        new GeoJsonLayer({
          id: 'stat-layer',
          data: geojson,
          filled: true,
          stroked: true,
          getFillColor: (f: any) => {
            const v = valueMap.get(f.properties.GEOID);
            if (v == null) return [0, 0, 0, 0];
            const c = Math.min(255, Math.max(0, (v / 100) * 255));
            return [c, 0, 255 - c, 120];
          },
          getLineColor: [0, 0, 0, 80],
          lineWidthMinPixels: 1,
        })
      );
    }

    return layersList;
  }, [organizations, onOrganizationClick, geojson, statValues]);

  return (
    <div className="w-full h-full relative">
      <DeckGL
        viewState={viewState}
        onViewStateChange={(e: any) => setViewState(e.viewState)}
        controller={true}
        layers={layers}
        style={{width: '100%', height: '100%'}}
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
