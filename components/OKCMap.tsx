'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import Map from 'react-map-gl/maplibre';
import DeckGL from '@deck.gl/react';
import { WebMercatorViewport, FlyToInterpolator } from '@deck.gl/core';
import type { Organization } from '../types/organization';

import type { ZctaFeature } from '../lib/census';
import { createOrganizationLayer, createZctaMetricLayer, createZctaHighlightLayer } from '../lib/mapLayers';

interface OKCMapProps {
  organizations: Organization[];
  onOrganizationClick?: (org: Organization) => void;
  zctaFeatures?: ZctaFeature[];
  highlightFeatures?: ZctaFeature[];
}

const OKC_CENTER = {
  longitude: -97.5164,
  latitude: 35.4676
};

export default function OKCMap({ organizations, onOrganizationClick, zctaFeatures, highlightFeatures }: OKCMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const [viewState, setViewState] = useState({
    longitude: OKC_CENTER.longitude,
    latitude: OKC_CENTER.latitude,
    zoom: 11,
    pitch: 0,
    bearing: 0,
  });

  useEffect(() => {
    if (!highlightFeatures || highlightFeatures.length === 0) return;
    const bounds = { minLon: Infinity, minLat: Infinity, maxLon: -Infinity, maxLat: -Infinity };
    const expand = (coords: number[][]) => {
      coords.forEach(([lon, lat]) => {
        bounds.minLon = Math.min(bounds.minLon, lon);
        bounds.minLat = Math.min(bounds.minLat, lat);
        bounds.maxLon = Math.max(bounds.maxLon, lon);
        bounds.maxLat = Math.max(bounds.maxLat, lat);
      });
    };
    highlightFeatures.forEach((f) => {
      if (f.geometry.type === 'Polygon') {
        (f.geometry.coordinates as number[][][]).forEach((ring) => expand(ring));
      } else if (f.geometry.type === 'MultiPolygon') {
        (f.geometry.coordinates as number[][][][]).forEach((poly) => poly.forEach((ring) => expand(ring)));
      }
    });
    const width = mapContainerRef.current?.clientWidth || window.innerWidth;
    const height = mapContainerRef.current?.clientHeight || window.innerHeight;
    const viewport = new WebMercatorViewport({ width, height });
    const { longitude, latitude, zoom } = viewport.fitBounds(
      [
        [bounds.minLon, bounds.minLat],
        [bounds.maxLon, bounds.maxLat],
      ],
      { padding: 40 }
    );
    setViewState((vs) => ({
      ...vs,
      longitude,
      latitude,
      zoom,
      transitionDuration: 500,
      transitionInterpolator: new FlyToInterpolator(),
    }));
  }, [highlightFeatures]);

  const layers = useMemo(() => {
    const layers: any[] = [createOrganizationLayer(organizations, onOrganizationClick)];
    const zctaLayer = createZctaMetricLayer(zctaFeatures);
    if (zctaLayer) {
      layers.unshift(zctaLayer);
    }
    const highlightLayer = createZctaHighlightLayer(highlightFeatures);
    if (highlightLayer) {
      layers.unshift(highlightLayer);
    }
    return layers;
  }, [organizations, onOrganizationClick, zctaFeatures, highlightFeatures]);

  return (
    <div ref={mapContainerRef} className="w-full h-full relative">
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
