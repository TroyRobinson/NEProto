'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useMemo } from 'react';
import Map from 'react-map-gl/maplibre';
import { ScatterplotLayer, GeoJsonLayer } from '@deck.gl/layers';
import DeckGL from '@deck.gl/react';
import type { Organization } from '../types/organization';
import type { Stat } from '../types/stat';

interface OKCMapProps {
  organizations: Organization[];
  stat?: Stat | null;
  onOrganizationClick?: (org: Organization) => void;
}

const OKC_CENTER = {
  longitude: -97.5164,
  latitude: 35.4676
};

export default function OKCMap({ organizations, stat, onOrganizationClick }: OKCMapProps) {
  const [viewState, setViewState] = useState({
    longitude: OKC_CENTER.longitude,
    latitude: OKC_CENTER.latitude,
    zoom: 11,
    pitch: 0,
    bearing: 0
  });

  const layers = useMemo(() => {
    const data = organizations.flatMap(org => 
      org.locations.map(location => ({
        coordinates: [location.longitude, location.latitude] as [number, number],
        organization: org,
        color: getCategoryColor(org.category)
      }))
    );

    const layersArr: any[] = [
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

    if (stat) {
      let statData: Record<string, number> = {};
      try {
        statData = stat.data ? JSON.parse(stat.data) : {};
      } catch {
        statData = {};
      }
      layersArr.push(
        new GeoJsonLayer({
          id: 'stat-layer',
          data: '/okc_tracts.geojson',
          pickable: false,
          stroked: true,
          filled: true,
          getLineColor: [0, 0, 0, 100],
          getFillColor: (f: any) => {
            const geoid = f.properties.GEOID;
            const value = statData[geoid];
            return value !== undefined ? getStatColor(value) : [0, 0, 0, 0];
          }
        })
      );
    }

    return layersArr;
  }, [organizations, stat, onOrganizationClick]);

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

function getStatColor(value: number): [number, number, number, number] {
  const t = Math.max(0, Math.min(1, value / 100));
  const r = Math.floor(255 * t);
  const b = Math.floor(255 * (1 - t));
  return [r, 0, b, 180];
}
