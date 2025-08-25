'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useMemo, useEffect } from 'react';
import Map from 'react-map-gl/maplibre';
import DeckGL from '@deck.gl/react';
import { GeoJsonLayer } from '@deck.gl/layers';
import { FlyToInterpolator, WebMercatorViewport } from '@deck.gl/core';
import type { Organization } from '../types/organization';

import { featuresFromZctaMap, type ZctaFeature } from '../lib/census';
import { createOrganizationLayer, createZctaMetricLayer } from '../lib/mapLayers';

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

  const [highlightFeatures, setHighlightFeatures] = useState<ZctaFeature[]>([]);

  useEffect(() => {
    async function load() {
      if (!highlightedZips || highlightedZips.length === 0) {
        setHighlightFeatures([]);
        return;
      }
      const zctaMap: Record<string, null> = {};
      highlightedZips.forEach((z) => { zctaMap[z] = null; });
      const feats = await featuresFromZctaMap(zctaMap);
      setHighlightFeatures(feats);

      // Compute bounds to focus view
      let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
      feats.forEach((f) => {
        const geom: any = f.geometry;
        const coords = geom.type === 'Polygon'
          ? [geom.coordinates]
          : geom.coordinates;
        coords.forEach((poly: any) => {
          poly.forEach((ring: any) => {
            ring.forEach(([x, y]: [number, number]) => {
              if (x < minLng) minLng = x;
              if (x > maxLng) maxLng = x;
              if (y < minLat) minLat = y;
              if (y > maxLat) maxLat = y;
            });
          });
        });
      });
      if (isFinite(minLng) && isFinite(minLat) && isFinite(maxLng) && isFinite(maxLat)) {
        const viewport = new WebMercatorViewport({
          width: window.innerWidth,
          height: window.innerHeight,
        });
        const padding = feats.length === 1 ? 200 : 40;
        const { longitude, latitude, zoom } = viewport.fitBounds(
          [ [minLng, minLat], [maxLng, maxLat] ],
          { padding }
        );
        const targetZoom = feats.length === 1 ? Math.min(12, Math.max(11, zoom)) : zoom;
        setViewState((vs) => ({
          ...vs,
          longitude,
          latitude,
          zoom: targetZoom,
          transitionDuration: 1000,
          transitionInterpolator: new FlyToInterpolator(),
        }));
      }
    }
    load();
  }, [highlightedZips]);

  const layers = useMemo(() => {
    const layers: any[] = [];
    const zctaLayer = createZctaMetricLayer(zctaFeatures);
    if (zctaLayer) layers.push(zctaLayer);
    layers.push(createOrganizationLayer(organizations, onOrganizationClick));
    if (highlightFeatures.length > 0) {
      layers.push(new GeoJsonLayer({
        id: 'highlight-zips',
        data: highlightFeatures,
        stroked: true,
        filled: false,
        getLineColor: [255, 215, 0, 255],
        lineWidthUnits: 'meters',
        getLineWidth: () => 200,
        lineWidthMinPixels: 2,
        pickable: false,
        parameters: { depthTest: false },
      }));
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
