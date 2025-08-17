'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useMemo, useEffect } from 'react';
import Map from 'react-map-gl/maplibre';
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
        setZipData({ type: 'FeatureCollection', features: okcFeatures });
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
          getFillColor: [0, 123, 255, 40],
          getLineColor: [0, 123, 255, 200],
          lineWidthMinPixels: 1,
          pickable: true
        })
      );
    }

    return baseLayers;
  }, [organizations, onOrganizationClick, zipData]);

  return (
    <div className="w-full h-full relative">
      <DeckGL
        viewState={viewState}
        onViewStateChange={(e: any) => setViewState(e.viewState)}
        controller={true}
        layers={layers}
        getTooltip={({ object }) =>
          object?.properties?.ZCTA5CE10 && bfsValue !== null
            ? `Business Applications (2023): ${bfsValue}`
            : null
        }
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