'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useMemo, useEffect } from 'react';
import MapGL from 'react-map-gl/maplibre';
import { ScatterplotLayer, GeoJsonLayer } from '@deck.gl/layers';
import DeckGL from '@deck.gl/react';
import type { Layer } from '@deck.gl/core';
import type { Organization } from '../types/organization';
import { fetchZipStats } from '../lib/zipStats';

interface OKCMapProps {
  organizations: Organization[];
  onOrganizationClick?: (org: Organization) => void;
  metric: 'population' | 'applications';
}

const OKC_CENTER = {
  longitude: -97.5164,
  latitude: 35.4676
};

export default function OKCMap({ organizations, onOrganizationClick, metric }: OKCMapProps) {
  const [viewState, setViewState] = useState({
    longitude: OKC_CENTER.longitude,
    latitude: OKC_CENTER.latitude,
    zoom: 11,
    pitch: 0,
    bearing: 0
  });

  const [zipData, setZipData] = useState<any>(null);
  const [maxPopulation, setMaxPopulation] = useState(0);
  const [maxApplications, setMaxApplications] = useState(0);

  useEffect(() => {
    async function load() {
      try {
        const { featureCollection, stats } = await fetchZipStats();
        setZipData(featureCollection);
        setMaxPopulation(Math.max(...stats.map((s) => s.population)));
        setMaxApplications(Math.max(...stats.map((s) => s.applications)));
      } catch {
        setZipData(null);
      }
    }
    load();
  }, []);

  const layers = useMemo(() => {
    const data = organizations.flatMap((org) =>
      org.locations.map((location) => ({
        coordinates: [location.longitude, location.latitude] as [number, number],
        organization: org,
        color: getCategoryColor(org.category)
      }))
    );

    const baseLayers: Layer[] = [
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

    if (zipData) {
      baseLayers.push(
        new GeoJsonLayer({
          id: 'okc-zips',
          data: zipData,
          filled: true,
          stroked: true,
          getFillColor: (f: any) => {
            const value =
              metric === 'population'
                ? f.properties.population
                : f.properties.applications;
            const max = metric === 'population' ? maxPopulation : maxApplications;
            return getChoroplethColor(value, max, metric);
          },
          getLineColor: [0, 123, 255, 200],
          lineWidthMinPixels: 1,
          pickable: true
        })
      );
    }

    return baseLayers;
  }, [organizations, onOrganizationClick, zipData, metric, maxPopulation, maxApplications]);

  return (
    <div className="w-full h-full relative">
      <DeckGL
        viewState={viewState}
        onViewStateChange={(e: any) => setViewState(e.viewState)}
        controller={true}
        layers={layers}
        getTooltip={({ object }) =>
          object?.properties?.ZCTA5CE10
            ? `ZIP: ${object.properties.ZCTA5CE10}\n${
                metric === 'population' ? 'Population' : 'Business Applications'
              }: ${Math.round(
                metric === 'population'
                  ? object.properties.population
                  : object.properties.applications
              ).toLocaleString()}`
            : null
        }
        style={{ width: '100%', height: '100%' }}
      >
        <MapGL
          mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
          style={{ width: '100%', height: '100%' }}
        />
      </DeckGL>
    </div>
  );
}

function getCategoryColor(category: string): [number, number, number, number] {
  const colors: Record<string, [number, number, number, number]> = {
    'Food Security': [220, 53, 69, 200],
    'Housing & Shelter': [13, 110, 253, 200],
    Education: [25, 135, 84, 200],
    Healthcare: [220, 53, 133, 200],
    'Youth Development': [255, 193, 7, 200],
    'Senior Services': [108, 117, 125, 200],
    Environmental: [32, 201, 151, 200],
    'Arts & Culture': [111, 66, 193, 200],
    'Community Development': [253, 126, 20, 200],
    Other: [134, 142, 150, 200]
  };

  return colors[category] || colors['Other'];
}

function getChoroplethColor(
  value: number,
  max: number,
  metric: 'population' | 'applications'
): [number, number, number, number] {
  if (!max) {
    return metric === 'population'
      ? [198, 219, 239, 180]
      : [254, 224, 144, 180];
  }
  const t = value / max;
  const start =
    metric === 'population' ? [198, 219, 239] : [254, 224, 144];
  const end = metric === 'population' ? [8, 81, 156] : [217, 72, 1];
  const r = Math.round(start[0] + (end[0] - start[0]) * t);
  const g = Math.round(start[1] + (end[1] - start[1]) * t);
  const b = Math.round(start[2] + (end[2] - start[2]) * t);
  return [r, g, b, 200];
}
