'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useMemo, useEffect } from 'react';
import Map from 'react-map-gl/maplibre';
import { ScatterplotLayer, GeoJsonLayer } from '@deck.gl/layers';
import DeckGL from '@deck.gl/react';
import { feature } from 'topojson-client';
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

  const [geoType, setGeoType] = useState<'zip' | 'tract'>('zip');
  const [statVar, setStatVar] = useState('B01003_001E');
  const [censusGeo, setCensusGeo] = useState<any>(null);
  const [statRange, setStatRange] = useState<{ min: number; max: number }>({ min: 0, max: 0 });

  useEffect(() => {
    async function loadCensus() {
      try {
        let geoUrl = '';
        let objectName = '';
        let idProp = '';
        let dataUrl = '';
        const state = '40';
        if (geoType === 'zip') {
          geoUrl = 'https://cdn.jsdelivr.net/npm/us-atlas@3/zips-10m.json';
          objectName = 'zipcodes';
          idProp = 'ZCTA5CE10';
          dataUrl = `https://api.census.gov/data/2022/acs/acs5?get=NAME,${statVar}&for=zip%20code%20tabulation%20area:*&in=state:${state}`;
        } else {
          geoUrl = 'https://cdn.jsdelivr.net/npm/us-atlas@3/tracts-10m.json';
          objectName = 'tracts';
          idProp = 'GEOID';
          dataUrl = `https://api.census.gov/data/2022/acs/acs5?get=NAME,${statVar}&for=tract:*&in=state:${state}&in=county:*`;
        }

        const [topology, data] = await Promise.all([
          fetch(geoUrl).then(r => r.json()),
          fetch(dataUrl).then(r => r.json())
        ]);

        const geojson: any = feature(topology, topology.objects[objectName]);
        geojson.features = geojson.features.filter((f: any) => f.properties.STATEFP === state);

        const values = new Map<string, number>();
        const rows: string[][] = data.slice(1);
        rows.forEach(row => {
          const geoid = row[row.length - 1];
          values.set(geoid, Number(row[1]));
        });

        const nums: number[] = [];
        geojson.features.forEach((f: any) => {
          const geoid = f.properties[idProp];
          const val = values.get(geoid);
          f.properties.value = val;
          if (val !== undefined) nums.push(val);
        });

        const min = Math.min(...nums);
        const max = Math.max(...nums);
        setStatRange({ min, max });
        setCensusGeo(geojson);
      } catch (err) {
        console.error('Failed to load census data', err);
        setCensusGeo(null);
      }
    }
    loadCensus();
  }, [geoType, statVar]);

  const layers = useMemo(() => {
    const orgData = organizations.flatMap(org =>
      org.locations.map(location => ({
        coordinates: [location.longitude, location.latitude] as [number, number],
        organization: org,
        color: getCategoryColor(org.category)
      }))
    );

    const layersArr: any[] = [];

    if (censusGeo) {
      layersArr.push(
        new GeoJsonLayer({
          id: 'census-choropleth',
          data: censusGeo,
          stroked: false,
          filled: true,
          pickable: true,
          getFillColor: (d: any) => getChoroplethColor(d.properties.value, statRange),
          getLineColor: [0, 0, 0, 80],
          getLineWidth: 1,
          updateTriggers: {
            getFillColor: [statRange.min, statRange.max]
          }
        })
      );
    }

    layersArr.push(
      new ScatterplotLayer({
        id: 'organizations',
        data: orgData,
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
  }, [organizations, onOrganizationClick, censusGeo, statRange]);

  return (
    <div className="w-full h-full relative">
      <DeckGL
        viewState={viewState}
        onViewStateChange={(e: any) => setViewState(e.viewState)}
        controller={true}
        layers={layers}
        getTooltip={(info) =>
          info.object && info.object.properties &&
          `${info.object.properties.NAME || ''} ${info.object.properties.value ?? ''}`
        }
        style={{width: '100%', height: '100%'}}
      >
        <Map
          mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
          style={{width: '100%', height: '100%'}}
        />
      </DeckGL>
      <div className="absolute top-2 right-2 bg-white p-2 rounded shadow space-y-2 z-10">
        <select
          className="border rounded p-1 w-full"
          value={geoType}
          onChange={(e) => setGeoType(e.target.value as 'zip' | 'tract')}
        >
          <option value="zip">ZIP Code</option>
          <option value="tract">Census Tract</option>
        </select>
        <select
          className="border rounded p-1 w-full"
          value={statVar}
          onChange={(e) => setStatVar(e.target.value)}
        >
          <option value="B01003_001E">Total Population</option>
          <option value="B19013_001E">Median Household Income</option>
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

function getChoroplethColor(value: number | undefined, range: { min: number; max: number }): [number, number, number, number] {
  if (value === undefined || Number.isNaN(value)) {
    return [0, 0, 0, 0];
  }
  const t = (value - range.min) / (range.max - range.min || 1);
  const r = Math.floor(255 * t);
  const g = Math.floor(255 * (1 - t));
  return [r, g, 150, 180];
}