'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import Map from 'react-map-gl/maplibre';
import DeckGL from '@deck.gl/react';
import { WebMercatorViewport } from '@deck.gl/core';
import type { Organization } from '../types/organization';

import type { ZctaFeature } from '../lib/census';
import { createOrganizationLayer, createZctaMetricLayer } from '../lib/mapLayers';

interface OKCMapProps {
  organizations: Organization[];
  onOrganizationClick?: (org: Organization) => void;
  zctaFeatures?: ZctaFeature[];
  selectedOrgId?: string | null;
  hoveredOrgId?: string | null;
}

const OKC_CENTER = {
  longitude: -97.5164,
  latitude: 35.4676
};

export default function OKCMap({ organizations, onOrganizationClick, zctaFeatures, selectedOrgId, hoveredOrgId }: OKCMapProps) {
  const [viewState, setViewState] = useState({
    longitude: OKC_CENTER.longitude,
    latitude: OKC_CENTER.latitude,
    zoom: 11,
    pitch: 0,
    bearing: 0
  });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || organizations.length === 0) return;

    const lats = organizations.flatMap((o) => o.locations.map((l) => l.latitude));
    const lons = organizations.flatMap((o) => o.locations.map((l) => l.longitude));
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);

    if (!isFinite(minLat) || !isFinite(minLon) || !isFinite(maxLat) || !isFinite(maxLon)) {
      return;
    }

    // If all points are the same, just center there with a close zoom
    if (minLat === maxLat && minLon === maxLon) {
      setViewState((vs) => ({ ...vs, latitude: minLat, longitude: minLon, zoom: 12 }));
      return;
    }

    const width = containerRef.current.clientWidth || window.innerWidth;
    const height = containerRef.current.clientHeight || window.innerHeight;
    const { longitude, latitude, zoom } = new WebMercatorViewport({ width, height }).fitBounds(
      [
        [minLon, minLat],
        [maxLon, maxLat],
      ],
      { padding: 40 }
    );
    setViewState((vs) => ({ ...vs, longitude, latitude, zoom }));
  }, [organizations]);

  const layers = useMemo(() => {
    const layers: any[] = [createOrganizationLayer(organizations, onOrganizationClick, selectedOrgId, hoveredOrgId)];
    const zctaLayer = createZctaMetricLayer(zctaFeatures);
    if (zctaLayer) {
      layers.unshift(zctaLayer);
    }
    return layers;
  }, [organizations, onOrganizationClick, zctaFeatures, selectedOrgId, hoveredOrgId]);

  return (
    <div className="w-full h-full relative" ref={containerRef}>
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
