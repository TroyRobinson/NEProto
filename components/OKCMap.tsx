'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useMemo } from 'react';
import Map from 'react-map-gl/maplibre';
import DeckGL from '@deck.gl/react';
import type { Organization } from '../types/organization';

import type { ZctaFeature } from '../lib/census';
import { createOrganizationLayer, createZctaMetricLayer } from '../lib/mapLayers';

interface OKCMapProps {
  organizations: Organization[];
  onOrganizationClick?: (org: Organization) => void;
  zctaFeatures?: ZctaFeature[];
  highlightedOrgId?: string;
}

const OKC_CENTER = {
  longitude: -97.5164,
  latitude: 35.4676
};

export default function OKCMap({ organizations, onOrganizationClick, zctaFeatures, highlightedOrgId }: OKCMapProps) {
  const [viewState, setViewState] = useState({
    longitude: OKC_CENTER.longitude,
    latitude: OKC_CENTER.latitude,
    zoom: 11,
    pitch: 0,
    bearing: 0
  });

  const layers = useMemo(() => {
    const layers: any[] = [
      createOrganizationLayer(organizations, onOrganizationClick, highlightedOrgId)
    ];
    const zctaLayer = createZctaMetricLayer(zctaFeatures);
    if (zctaLayer) {
      layers.unshift(zctaLayer);
    }
    return layers;
  }, [organizations, onOrganizationClick, zctaFeatures, highlightedOrgId]);

  return (
    <div className="w-full h-full relative">
      <DeckGL
        viewState={viewState}
        onViewStateChange={(e: any) => setViewState(e.viewState)}
        controller={true}
        layers={layers}
        style={{width: '100%', height: '100%'}}
        getTooltip={({ object }) => {
          if (
            object &&
            'properties' in object &&
            object.properties &&
            'value' in object.properties &&
            object.properties.value != null &&
            object.properties.value >= 0
          ) {
            const zcta = (object as any).properties.ZCTA5CE10;
            const val = (object as any).properties.value as number;
            return { text: `ZIP ${zcta}: ${val.toLocaleString()}` };
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
