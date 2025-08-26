'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useMemo, useEffect } from 'react';
import Map from 'react-map-gl/maplibre';
import DeckGL from '@deck.gl/react';
import { WebMercatorViewport } from '@deck.gl/core';
import type { Organization } from '../types/organization';

import type { ZctaFeature } from '../lib/census';
import { createOrganizationLayer, createZctaMetricLayer, createZctaHighlightLayer } from '../lib/mapLayers';

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
    let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
    const expand = (coords: any) => {
      for (const c of coords) {
        if (typeof c[0] === 'number') {
          const [lng, lat] = c;
          if (lng < minLng) minLng = lng;
          if (lat < minLat) minLat = lat;
          if (lng > maxLng) maxLng = lng;
          if (lat > maxLat) maxLat = lat;
        } else {
          expand(c);
        }
      }
    };
    highlightedZctas.forEach(f => {
      if (f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon') {
        // @ts-expect-error - coordinates typing
        expand(f.geometry.coordinates);
      }
    });
    setViewState(vs => {
      const viewport = new WebMercatorViewport({
        width: typeof window !== 'undefined' ? window.innerWidth : 800,
        height: typeof window !== 'undefined' ? window.innerHeight : 600,
        longitude: vs.longitude,
        latitude: vs.latitude,
        zoom: vs.zoom,
      });
      const { longitude, latitude, zoom } = viewport.fitBounds(
        [
          [minLng, minLat],
          [maxLng, maxLat],
        ],
        { padding: 40 }
      );
      return { ...vs, longitude, latitude, zoom: Math.min(vs.zoom, zoom) };
    });
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
