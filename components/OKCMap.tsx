'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useMemo, useEffect } from 'react';
import Map from 'react-map-gl/maplibre';
import { ScatterplotLayer, GeoJsonLayer } from '@deck.gl/layers';
import DeckGL from '@deck.gl/react';
import { feature } from 'topojson-client';
import countiesTopo from 'us-atlas/counties-10m.json' assert { type: 'json' };
import type { Organization } from '../types/organization';

interface ChoroplethConfig {
  geography: 'zip' | 'county';
  variable: string;
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

  const [choroplethLayer, setChoroplethLayer] = useState<GeoJsonLayer | null>(null);

  useEffect(() => {
    if (!choropleth) {
      setChoroplethLayer(null);
      return;
    }

    async function loadChoropleth() {
      let features: any[] = [];

      if (choropleth.geography === 'zip') {
        const [geoRes, dataRes] = await Promise.all([
          fetch('https://raw.githubusercontent.com/OpenDataDE/State-zip-code-GeoJSON/master/ok_oklahoma_zip_codes_geo.min.json'),
          fetch(`https://api.census.gov/data/2022/acs/acs5?get=NAME,${choropleth.variable}&for=zip%20code%20tabulation%20area:*`)
        ]);
        const geojson = await geoRes.json();
        const rows: any[] = await dataRes.json();
        const dataMap = new Map(rows.slice(1).map(r => [r[2], parseFloat(r[1])]));
        features = geojson.features.map((f: any) => ({
          ...f,
          properties: { ...f.properties, value: dataMap.get(f.properties.ZCTA5CE10) }
        }));
      } else if (choropleth.geography === 'county') {
        const geo = feature(countiesTopo as any, (countiesTopo as any).objects.counties) as any;
        const okFeatures = geo.features.filter((f: any) => String(f.id).startsWith('40'));
        const dataRes = await fetch(`https://api.census.gov/data/2022/acs/acs5?get=NAME,${choropleth.variable}&for=county:*&in=state:40`);
        const rows: any[] = await dataRes.json();
        const dataMap = new Map(rows.slice(1).map(r => [`${r[2]}${r[3]}`, parseFloat(r[1])]));
        features = okFeatures.map((f: any) => ({
          ...f,
          properties: { ...f.properties, value: dataMap.get(String(f.id)) }
        }));
      }

      const values = features.map(f => f.properties.value).filter((v: number) => !isNaN(v));
      const min = Math.min(...values);
      const max = Math.max(...values);

      setChoroplethLayer(new GeoJsonLayer({
        id: 'census-choropleth',
        data: features,
        stroked: false,
        filled: true,
        pickable: true,
        getFillColor: (d: any) => {
          const v = d.properties.value;
          if (v == null || isNaN(v)) return [0, 0, 0, 0];
          const t = (v - min) / (max - min || 1);
          const r = 255 * (1 - t);
          const b = 255 * t;
          return [r, 0, b, 150];
        }
      }));
    }

    loadChoropleth();
  }, [choropleth]);

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

    if (choroplethLayer) {
      baseLayers.unshift(choroplethLayer);
    }

    return baseLayers;
  }, [organizations, onOrganizationClick, choroplethLayer]);

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