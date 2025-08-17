'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useMemo, useEffect } from 'react';
import Map from 'react-map-gl/maplibre';
import { ScatterplotLayer, GeoJsonLayer } from '@deck.gl/layers';
import DeckGL from '@deck.gl/react';
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

  const [geoType, setGeoType] = useState<'none' | 'zip' | 'tract'>('none');
  const [censusData, setCensusData] = useState<null | {
    geojson: any;
    valueMap: Record<string, number>;
    geoidProp: string;
    min: number;
    max: number;
  }>(null);

  useEffect(() => {
    async function fetchCensus() {
      if (geoType === 'none') {
        setCensusData(null);
        return;
      }

      try {
        let geoURL = '';
        let dataURL = '';
        let geoidProp = '';

        if (geoType === 'zip') {
          geoURL =
            'https://raw.githubusercontent.com/blackmad/census-geojson/master/census/2020/zip/40.json';
          dataURL =
            'https://api.census.gov/data/2022/acs/acs5?get=B19013_001E&for=zip%20code%20tabulation%20area:*&in=state:40';
          geoidProp = 'ZCTA5CE20';
        } else if (geoType === 'tract') {
          geoURL =
            'https://raw.githubusercontent.com/blackmad/census-geojson/master/census/2020/tract/40.json';
          dataURL =
            'https://api.census.gov/data/2022/acs/acs5?get=B19013_001E&for=tract:*&in=state:40&in=county:*';
          geoidProp = 'GEOID';
        }

        const geoResp = await fetch(geoURL);
        const geojson = await geoResp.json();
        const dataResp = await fetch(dataURL);
        const rows = await dataResp.json();
        const valueMap: Record<string, number> = {};
        for (const row of rows.slice(1)) {
          let geoid = '';
          if (geoType === 'zip') {
            geoid = row[3];
          } else if (geoType === 'tract') {
            geoid = `${row[2]}${row[3]}${row[4]}`;
          }
          const val = Number(row[1]);
          if (!Number.isNaN(val)) {
            valueMap[geoid] = val;
          }
        }
        const values = Object.values(valueMap);
        const min = Math.min(...values);
        const max = Math.max(...values);
        setCensusData({ geojson, valueMap, geoidProp, min, max });
      } catch (err) {
        console.error('Error loading census data', err);
        setCensusData(null);
      }
    }

    fetchCensus();
  }, [geoType]);

  const layers = useMemo(() => {
    const data = organizations.flatMap(org =>
      org.locations.map(location => ({
        coordinates: [location.longitude, location.latitude] as [number, number],
        organization: org,
        color: getCategoryColor(org.category)
      }))
    );

    const baseLayers = [
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

    if (censusData) {
      baseLayers.unshift(
        new GeoJsonLayer({
          id: 'census-choropleth',
          data: censusData.geojson,
          pickable: true,
          filled: true,
          getFillColor: (f: any) => {
            const geoid = f.properties[censusData.geoidProp];
            const val = censusData.valueMap[geoid];
            if (val == null) return [0, 0, 0, 0];
            const t = (val - censusData.min) / (censusData.max - censusData.min);
            const r = Math.round(255 * t);
            const g = Math.round(255 * (1 - t));
            return [r, g, 0, 180];
          },
          getLineColor: [200, 200, 200, 200],
          lineWidthMinPixels: 1
        })
      );
    }

    return baseLayers;
  }, [organizations, onOrganizationClick, censusData]);

  return (
    <div className="w-full h-full relative">
      <div className="absolute z-10 m-2 p-2 bg-white rounded shadow">
        <select
          value={geoType}
          onChange={(e) => setGeoType(e.target.value as 'none' | 'zip' | 'tract')}
          className="border rounded px-2 py-1 text-sm"
        >
          <option value="none">No Census Layer</option>
          <option value="zip">Median Income by ZIP</option>
          <option value="tract">Median Income by Tract</option>
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
