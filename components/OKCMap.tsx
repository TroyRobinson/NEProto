'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useMemo, useEffect } from 'react';
import MapGL from 'react-map-gl/maplibre';
import { ScatterplotLayer, GeoJsonLayer } from '@deck.gl/layers';
import DeckGL from '@deck.gl/react';
import type { Layer } from '@deck.gl/core';
import type { Organization } from '../types/organization';

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

  const [zipData, setZipData] = useState<any>(null);
  const [bfsValue, setBfsValue] = useState<number | null>(null);
  const [maxPopulation, setMaxPopulation] = useState(0);

  useEffect(() => {
    async function loadZipData() {
      try {
        const res = await fetch(
          'https://raw.githubusercontent.com/OpenDataDE/State-zip-code-GeoJSON/master/ok_oklahoma_zip_codes_geo.min.json'
        );
        const json = await res.json();
        const okcFeatures = (json.features || []).filter(
          (f: any) => f.properties?.ZCTA5CE10?.startsWith('731')
        );

        const zipCodes = okcFeatures.map(
          (f: any) => f.properties.ZCTA5CE10
        );

        const popRes = await fetch(
          `https://api.census.gov/data/2021/acs/acs5?get=B01003_001E&for=zip%20code%20tabulation%20area:${zipCodes.join(',')}`
        );
        const popJson = await popRes.json();
        const popMap = new Map(
          popJson.slice(1).map((row: any) => [row[1], Number(row[0])])
        );
        const populations = Array.from(popMap.values()) as number[];
        setMaxPopulation(Math.max(...populations));

        const featuresWithPop = okcFeatures.map((f: any) => ({
          ...f,
          properties: {
            ...f.properties,
            population: popMap.get(f.properties.ZCTA5CE10) || 0
          }
        }));

        setZipData({
          type: 'FeatureCollection',
          features: featuresWithPop
        });
      } catch {
        setZipData(null);
      }
    }
    loadZipData();
  }, []);

  useEffect(() => {
    async function loadBFS() {
      try {
        const res = await fetch(
          'https://api.census.gov/data/timeseries/eits/bfs?get=data_type_code,cell_value&for=county:109&in=state:40&time=2023&data_type_code=BA_BA'
        );
        const json = await res.json();
        const [, first] = json;
        setBfsValue(Number(first?.[1]));
      } catch {
        setBfsValue(null);
      }
    }
    loadBFS();
  }, []);

  const layers = useMemo(() => {
    const data = organizations.flatMap(org =>
      org.locations.map(location => ({
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
          getFillColor: (f: any) =>
            getPopulationColor(f.properties.population, maxPopulation),
          getLineColor: [0, 123, 255, 200],
          lineWidthMinPixels: 1,
          pickable: true
        })
      );
    }

    return baseLayers;
  }, [organizations, onOrganizationClick, zipData, maxPopulation]);

  return (
    <div className="w-full h-full relative">
      <DeckGL
        viewState={viewState}
        onViewStateChange={(e: any) => setViewState(e.viewState)}
        controller={true}
        layers={layers}
        getTooltip={({ object }) =>
          object?.properties?.ZCTA5CE10 && bfsValue !== null
            ? `ZIP: ${object.properties.ZCTA5CE10}\nPopulation: ${object.properties.population}\nBusiness Applications (2023): ${bfsValue}`
            : null
        }
        style={{width: '100%', height: '100%'}}
      >
        <MapGL
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

function getPopulationColor(
  population: number,
  max: number
): [number, number, number, number] {
  if (!max) return [198, 219, 239, 180];
  const t = population / max;
  const start = [198, 219, 239];
  const end = [8, 81, 156];
  const r = Math.round(start[0] + (end[0] - start[0]) * t);
  const g = Math.round(start[1] + (end[1] - start[1]) * t);
  const b = Math.round(start[2] + (end[2] - start[2]) * t);
  return [r, g, b, 200];
}