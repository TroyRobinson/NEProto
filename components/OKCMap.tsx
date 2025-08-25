'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useMemo, useEffect } from 'react';
import Map from 'react-map-gl/maplibre';
import DeckGL from '@deck.gl/react';
import type { Organization } from '../types/organization';

import type { ZctaFeature } from '../lib/census';
import { createOrganizationLayer, createZctaMetricLayer, createZctaHighlightLayer } from '../lib/mapLayers';
import { WebMercatorViewport } from '@deck.gl/core';

interface OKCMapProps {
  organizations: Organization[];
  onOrganizationClick?: (org: Organization) => void;
  zctaFeatures?: ZctaFeature[];
  highlightedZctas?: ZctaFeature[];
}

const OKC_CENTER = {
  longitude: -97.5164,
  latitude: 35.4676
};

export default function OKCMap({ organizations, onOrganizationClick, zctaFeatures, highlightedZctas }: OKCMapProps) {
  const [viewState, setViewState] = useState({
    longitude: OKC_CENTER.longitude,
    latitude: OKC_CENTER.latitude,
    zoom: 11,
    pitch: 0,
    bearing: 0
  });

  const layers = useMemo(() => {
    const layers: any[] = [createOrganizationLayer(organizations, onOrganizationClick)];
    const zctaLayer = createZctaMetricLayer(zctaFeatures);
    if (zctaLayer) {
      layers.unshift(zctaLayer);
    }
    const highlightLayer = createZctaHighlightLayer(highlightedZctas);
    if (highlightLayer) {
      layers.push(highlightLayer);
    }
    return layers;
  }, [organizations, onOrganizationClick, zctaFeatures, highlightedZctas]);

  useEffect(() => {
    if (!highlightedZctas || highlightedZctas.length === 0) return;
    let minLat = 90;
    let minLon = 180;
    let maxLat = -90;
    let maxLon = -180;
    highlightedZctas.forEach((f) => {
      const coords = f.geometry;
      const recurse = (c: any) => {
        if (typeof c[0] === 'number') {
          const [lon, lat] = c as [number, number];
          if (lon < minLon) minLon = lon;
          if (lon > maxLon) maxLon = lon;
          if (lat < minLat) minLat = lat;
          if (lat > maxLat) maxLat = lat;
        } else {
          c.forEach(recurse);
        }
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recurse((coords as any).coordinates);
    });
    const viewport = new WebMercatorViewport({
      width: window.innerWidth,
      height: window.innerHeight,
    });
    const { longitude, latitude, zoom } = viewport.fitBounds(
      [
        [minLon, minLat],
        [maxLon, maxLat],
      ],
      { padding: 40, maxZoom: 14 }
    );
    setViewState((vs) => ({ ...vs, longitude, latitude, zoom }));
  }, [highlightedZctas]);

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
