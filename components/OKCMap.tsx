'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useMemo, useEffect } from 'react';
import Map from 'react-map-gl/maplibre';
import { ScatterplotLayer, GeoJsonLayer } from '@deck.gl/layers';
import DeckGL from '@deck.gl/react';
import type { Organization } from '../types/organization';

interface CensusConfig {
  geoType: 'zip' | 'tract' | 'county';
  variable: string;
}

interface OKCMapProps {
  organizations: Organization[];
  onOrganizationClick?: (org: Organization) => void;
  censusConfig?: CensusConfig;
}

const OKC_CENTER = {
  longitude: -97.5164,
  latitude: 35.4676
};

export default function OKCMap({ organizations, onOrganizationClick, censusConfig }: OKCMapProps) {
  const [viewState, setViewState] = useState({
    longitude: OKC_CENTER.longitude,
    latitude: OKC_CENTER.latitude,
    zoom: 11,
    pitch: 0,
    bearing: 0
  });

  const [censusFeatures, setCensusFeatures] = useState<any[]>([]);

  useEffect(() => {
    if (!censusConfig) {
      setCensusFeatures([]);
      return;
    }

    const GEO_CONFIG: Record<CensusConfig['geoType'], { for: string; boundary: string; idField: string }> = {
      zip: {
        for: 'zip%20code%20tabulation%20area:*',
        boundary: 'https://cdn.jsdelivr.net/gh/uscensusbureau/census-geojson@2020/500k/zip%20code%20tabulation%20area.json',
        idField: 'GEOID'
      },
      tract: {
        for: 'tract:*&in=state:40',
        boundary: 'https://cdn.jsdelivr.net/gh/uscensusbureau/census-geojson@2020/500k/tract.json',
        idField: 'GEOID'
      },
      county: {
        for: 'county:*&in=state:40',
        boundary: 'https://cdn.jsdelivr.net/gh/uscensusbureau/census-geojson@2020/500k/county.json',
        idField: 'GEOID'
      }
    };

    async function loadCensus() {
      try {
        const cfg = GEO_CONFIG[censusConfig.geoType];
        const dataRes = await fetch(`https://api.census.gov/data/2022/acs/acs5?get=NAME,${censusConfig.variable}&for=${cfg.for}`);
        const dataJson = await dataRes.json();
        const boundaryRes = await fetch(cfg.boundary);
        const boundaryJson = await boundaryRes.json();

        const valueMap = new Map<string, number>();
        for (let i = 1; i < dataJson.length; i++) {
          const row = dataJson[i];
          const geoid = row[row.length - 1];
          const value = Number(row[1]);
          valueMap.set(geoid, value);
        }

        const features = boundaryJson.features.map((f: any) => ({
          ...f,
          properties: {
            ...f.properties,
            value: valueMap.get(f.properties[cfg.idField]) ?? null
          }
        }));

        setCensusFeatures(features);
      } catch (e) {
        console.error('Failed to load census data', e);
        setCensusFeatures([]);
      }
    }

    loadCensus();
  }, [censusConfig]);

  const layers = useMemo(() => {
    const data = organizations.flatMap(org =>
      org.locations.map(location => ({
        coordinates: [location.longitude, location.latitude] as [number, number],
        organization: org,
        color: getCategoryColor(org.category)
      }))
    );
    const layerList: any[] = [
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

    if (censusFeatures.length > 0) {
      const values = censusFeatures
        .map((f: any) => f.properties.value)
        .filter((v: number | null) => v !== null);
      const min = Math.min(...values);
      const max = Math.max(...values);
      layerList.push(
        new GeoJsonLayer({
          id: 'census-choropleth',
          data: { type: 'FeatureCollection', features: censusFeatures },
          stroked: true,
          getFillColor: (f: any) => {
            const v = f.properties.value;
            if (v === null || isNaN(v)) return [0, 0, 0, 0];
            const t = (v - min) / (max - min || 1);
            return [255 * t, 0, 255 * (1 - t), 120];
          },
          getLineColor: [255, 255, 255, 200],
          lineWidthMinPixels: 0.5,
          pickable: false
        })
      );
    }

    return layerList;
  }, [organizations, onOrganizationClick, censusFeatures]);

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