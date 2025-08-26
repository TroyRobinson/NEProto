'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useMemo, useEffect } from 'react';
import Map from 'react-map-gl/maplibre';
import DeckGL from '@deck.gl/react';
import type { Organization } from '../types/organization';

import type { ZctaFeature } from '../lib/census';
import { createOrganizationLayer, createZctaMetricLayer, createZctaHighlightLayer } from '../lib/mapLayers';
import { featuresFromZctaMap, type ZctaFeature } from '../lib/census';
import { WebMercatorViewport } from '@deck.gl/core';

interface OKCMapProps {
  organizations: Organization[];
  onOrganizationClick?: (org: Organization) => void;
  zctaFeatures?: ZctaFeature[];
  highlightedZips?: string[];
}

const OKC_CENTER = {
  longitude: -97.5164,
  latitude: 35.4676
};

export default function OKCMap({ organizations, onOrganizationClick, zctaFeatures, highlightedZips }: OKCMapProps) {
  const [viewState, setViewState] = useState({
    longitude: OKC_CENTER.longitude,
    latitude: OKC_CENTER.latitude,
    zoom: 11,
    pitch: 0,
    bearing: 0
  });
  const [highlightFeatures, setHighlightFeatures] = useState<ZctaFeature[] | undefined>();

  useEffect(() => {
    const load = async () => {
      if (!highlightedZips || highlightedZips.length === 0) {
        setHighlightFeatures(undefined);
        return;
      }
      const map: Record<string, null> = {};
      highlightedZips.forEach((z) => {
        map[z] = null;
      });
      const feats = await featuresFromZctaMap(map);
      setHighlightFeatures(feats);

      const bounds = feats.reduce(
        (acc, f) => {
          const coords = (f.geometry as any).coordinates;
          const flat = (function flatten(c: any): number[][] {
            if (typeof c[0] === 'number') return [c as number[]];
            return c.flatMap(flatten);
          })(coords);
          flat.forEach(([lng, lat]) => {
            acc[0] = Math.min(acc[0], lng);
            acc[1] = Math.min(acc[1], lat);
            acc[2] = Math.max(acc[2], lng);
            acc[3] = Math.max(acc[3], lat);
          });
          return acc;
        },
        [Infinity, Infinity, -Infinity, -Infinity] as [number, number, number, number]
      );

      if (bounds[0] !== Infinity) {
        const viewport = new WebMercatorViewport({
          width: window.innerWidth,
          height: window.innerHeight,
          longitude: viewState.longitude,
          latitude: viewState.latitude,
          zoom: viewState.zoom,
        });
        const { longitude, latitude, zoom } = viewport.fitBounds(
          [ [bounds[0], bounds[1]], [bounds[2], bounds[3]] ],
          { padding: 40, maxZoom: viewState.zoom }
        );
        setViewState((v) => ({ ...v, longitude, latitude, zoom }));
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightedZips]);

  const layers = useMemo(() => {
    const layers: any[] = [createOrganizationLayer(organizations, onOrganizationClick)];
    const zctaLayer = createZctaMetricLayer(zctaFeatures);
    if (zctaLayer) {
      layers.unshift(zctaLayer);
    }
    const highlightLayer = createZctaHighlightLayer(highlightFeatures);
    if (highlightLayer) {
      layers.push(highlightLayer);
    }
    return layers;
  }, [organizations, onOrganizationClick, zctaFeatures, highlightFeatures]);

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
