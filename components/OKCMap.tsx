'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useMemo, useEffect } from 'react';
import Map from 'react-map-gl/maplibre';
import { ScatterplotLayer, GeoJsonLayer } from '@deck.gl/layers';
import DeckGL from '@deck.gl/react';
import type { Organization } from '../types/organization';
import type { FeatureCollection } from 'geojson';
import { fetchChoroplethData, type Geography } from '../lib/census';

interface OKCMapProps {
  organizations: Organization[];
  onOrganizationClick?: (org: Organization) => void;
}

const OKC_CENTER = {
  longitude: -97.5164,
  latitude: 35.4676
};

export default function OKCMap({ organizations, onOrganizationClick }: OKCMapProps) {
  const [viewState, setViewState] = useState({
    longitude: OKC_CENTER.longitude,
    latitude: OKC_CENTER.latitude,
    zoom: 11,
    pitch: 0,
    bearing: 0
  });
  const [geoType, setGeoType] = useState<Geography>('county');
  const [choropleth, setChoropleth] = useState<FeatureCollection | null>(null);

  useEffect(() => {
    fetchChoroplethData(geoType).then(setChoropleth).catch(() => setChoropleth(null));
  }, [geoType]);

  const colorDomain = useMemo(() => {
    if (!choropleth) return [0, 0];
    const values = choropleth.features
      .map((f: any) => f.properties?.value)
      .filter((v: any) => typeof v === 'number');
    return [Math.min(...values), Math.max(...values)];
  }, [choropleth]);

  const colorScale = React.useCallback((value?: number) => {
    if (value === undefined) return [0, 0, 0, 0];
    const [min, max] = colorDomain;
    const t = max === min ? 0 : (value - min) / (max - min);
    const r = Math.round(255 * t);
    const b = Math.round(255 * (1 - t));
    return [r, 0, b, 120];
  }, [colorDomain]);

  const layers = useMemo(() => {
    const data = organizations.flatMap(org =>
      org.locations.map(location => ({
        coordinates: [location.longitude, location.latitude] as [number, number],
        organization: org,
        color: getCategoryColor(org.category)
      }))
    );

    const result = [] as any[];

    if (choropleth) {
      result.push(new GeoJsonLayer({
        id: 'census-choropleth',
        data: choropleth,
        stroked: false,
        pickable: true,
        getFillColor: (f: any) => colorScale(f.properties?.value),
        getLineColor: [255, 255, 255, 80],
        lineWidthMinPixels: 0.5
      }));
    }

    result.push(new ScatterplotLayer({
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
    }));

    return result;
  }, [organizations, onOrganizationClick, choropleth, colorScale]);

  return (
    <div className="w-full h-full relative">
      <div className="absolute top-2 left-2 z-10">
        <select
          className="bg-white border border-gray-300 rounded p-2 text-sm"
          value={geoType}
          onChange={(e) => setGeoType(e.target.value as Geography)}
        >
          <option value="state">States</option>
          <option value="county">Counties (OK)</option>
          <option value="zip">ZIP Codes (OK)</option>
        </select>
      </div>

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