'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useMemo, useEffect } from 'react';
import Map from 'react-map-gl/maplibre';
import { ScatterplotLayer, GeoJsonLayer } from '@deck.gl/layers';
import DeckGL from '@deck.gl/react';
import type { FeatureCollection } from 'geojson';
import type { Organization } from '../types/organization';
import type { GeoType } from '../lib/census';
import { fetchCensusChoropleth } from '../lib/census';

interface ChoroplethConfig {
  variable: string;
  geoType: GeoType;
  year?: number;
}

interface OKCMapProps {
  organizations: Organization[];
  onOrganizationClick?: (org: Organization) => void;
  choropleth?: ChoroplethConfig;
}

const OKC_CENTER = {
  longitude: -97.5164,
  latitude: 35.4676
};

export default function OKCMap({ organizations, onOrganizationClick, choropleth }: OKCMapProps) {
  const [viewState, setViewState] = useState({
    longitude: OKC_CENTER.longitude,
    latitude: OKC_CENTER.latitude,
    zoom: 11,
    pitch: 0,
    bearing: 0
  });
  const [choroplethData, setChoroplethData] = useState<FeatureCollection | null>(null);

  useEffect(() => {
    if (!choropleth) {
      setChoroplethData(null);
      return;
    }
    fetchCensusChoropleth(choropleth)
      .then(setChoroplethData)
      .catch((e) => console.error(e));
  }, [choropleth]);

  const layers = useMemo(() => {
    const layersArr: any[] = [];

    if (choroplethData) {
      const values = choroplethData.features
        .map((f: any) => f.properties?.value)
        .filter((v: any) => typeof v === 'number');
      const min = Math.min(...values);
      const max = Math.max(...values);
      layersArr.push(
        new GeoJsonLayer({
          id: 'census-choropleth',
          data: choroplethData,
          filled: true,
          stroked: true,
          pickable: true,
          getFillColor: (f: any) => getChoroplethColor(f.properties.value, min, max),
          getLineColor: [255, 255, 255],
          lineWidthMinPixels: 0.5,
          opacity: 0.6
        })
      );
    }

    const data = organizations.flatMap((org) =>
      org.locations.map((location) => ({
        coordinates: [location.longitude, location.latitude] as [number, number],
        organization: org,
        color: getCategoryColor(org.category)
      }))
    );

    layersArr.push(
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
    );

    return layersArr;
  }, [organizations, onOrganizationClick, choroplethData]);

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

function getChoroplethColor(
  value: number,
  min: number,
  max: number
): [number, number, number, number] {
  if (!Number.isFinite(value) || min === max) {
    return [200, 200, 200, 80];
  }
  const t = (value - min) / (max - min);
  const r = Math.round(255 * t);
  const g = Math.round(255 * (1 - t));
  return [r, g, 0, 180];
}