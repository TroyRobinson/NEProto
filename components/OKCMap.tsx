'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useMemo, useEffect } from 'react';
import MapComponent from 'react-map-gl/maplibre';
import { ScatterplotLayer, GeoJsonLayer } from '@deck.gl/layers';
import DeckGL from '@deck.gl/react';
import type { FeatureCollection } from 'geojson';
import type { Organization } from '../types/organization';
import type { CensusVariable, CensusRecord } from '../types/census';

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

  const [variables, setVariables] = useState<CensusVariable[]>([]);
  const [censusVar, setCensusVar] = useState('');
  const [censusLayer, setCensusLayer] = useState<GeoJsonLayer | null>(null);

  useEffect(() => {
    async function loadVars() {
      try {
        const res = await fetch('/api/selected-variables');
        if (!res.ok) throw new Error('Request failed');
        const vars: CensusVariable[] = await res.json();
        setVariables(vars);
        setCensusVar(vars[0]?.name || '');
      } catch (e) {
        console.error('Failed to load variables', e);
      }
    }
    loadVars();
  }, []);

  useEffect(() => {
    async function loadCensus() {
      const selected = variables.find((v) => v.name === censusVar);
      if (!selected) return;
      const geoRes = await fetch(
        "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Tracts_Blocks/MapServer/0/query?where=STATE='40'%20and%20COUNTY='109'&outFields=GEOID&outSR=4326&f=geojson"
      );
      const geo: FeatureCollection = await geoRes.json();
      const res = await fetch(
        `/api/census-variable?dataset=${selected.datasetPath}&variable=${censusVar}`
      );
      if (!res.ok) return;
      const data: CensusRecord[] = await res.json();
      const values = new Map<string, number>(
        data.map((row) => [row.geoid, row.value])
      );
      const feats = geo.features.map((f: any) => ({
        ...f,
        properties: { ...f.properties, value: values.get(f.properties.GEOID) }
      }));
      const max = Math.max(...feats.map((f: any) => f.properties.value ?? 0));
      const layer = new GeoJsonLayer({
        id: 'census-choropleth',
        data: feats,
        pickable: true,
        stroked: true,
        filled: true,
        getFillColor: (d: any) => {
          const v = d.properties.value;
          if (!Number.isFinite(v) || max === 0) return [0, 0, 0, 0];
          const t = v / max;
          return [3, 78, 162, 50 + t * 205];
        },
        getLineColor: [255, 255, 255],
        lineWidthMinPixels: 1
      });
      setCensusLayer(layer);
    }
    if (censusVar) loadCensus();
  }, [censusVar, variables]);

  const orgLayer = useMemo(() => {
    const data = organizations.flatMap(org =>
      org.locations.map(location => ({
        coordinates: [location.longitude, location.latitude] as [number, number],
        organization: org,
        color: getCategoryColor(org.category)
      }))
    );

    return new ScatterplotLayer({
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
    });
  }, [organizations, onOrganizationClick]);

  return (
    <div className="w-full h-full relative">
      <DeckGL
        viewState={viewState}
        onViewStateChange={(e: any) => setViewState(e.viewState)}
        controller={true}
        layers={[censusLayer, orgLayer].filter(Boolean)}
        style={{width: '100%', height: '100%'}}
      >
        <MapComponent
          mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
          style={{width: '100%', height: '100%'}}
        />
      </DeckGL>
      <div className="absolute top-2 left-2 z-10 bg-background/90 p-2 rounded shadow text-sm">
        <label className="mr-2">Statistic</label>
        <select
          value={censusVar}
          onChange={e => setCensusVar(e.target.value)}
          className="border border-foreground/20 rounded p-1"
        >
          {variables.map((v) => (
            <option key={v.name} value={v.name}>
              {v.label}
            </option>
          ))}
        </select>
      </div>
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