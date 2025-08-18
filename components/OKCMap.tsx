'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useMemo, useEffect } from 'react';
import MapGL from 'react-map-gl/maplibre';
import { ScatterplotLayer, GeoJsonLayer } from '@deck.gl/layers';
import DeckGL from '@deck.gl/react';
import type { Layer } from '@deck.gl/core';
import type { Organization } from '../types/organization';
import { fetchZipStats, type ZipStats } from '../lib/zipStats';

interface CustomMetric {
  key: string;
  label: string;
  dataset: string;
  variable: string;
}

interface OKCMapProps {
  organizations: Organization[];
  onOrganizationClick?: (org: Organization) => void;
  metric: string;
  customMetrics: CustomMetric[];
}

const OKC_CENTER = {
  longitude: -97.5164,
  latitude: 35.4676
};

export default function OKCMap({ organizations, onOrganizationClick, metric, customMetrics }: OKCMapProps) {
  const [viewState, setViewState] = useState({
    longitude: OKC_CENTER.longitude,
    latitude: OKC_CENTER.latitude,
    zoom: 11,
    pitch: 0,
    bearing: 0
  });

  const [zipData, setZipData] = useState<any>(null);
  const [zipStats, setZipStats] = useState<ZipStats[]>([]);
  const [maxPopulation, setMaxPopulation] = useState(0);
  const [maxApplications, setMaxApplications] = useState(0);
  const [customData, setCustomData] = useState<Record<string, Map<string, number>>>({});
  const [customMax, setCustomMax] = useState<Record<string, number>>({});

  useEffect(() => {
    async function load() {
      try {
        const { featureCollection, stats } = await fetchZipStats();
        setZipData(featureCollection);
        setZipStats(stats);
        setMaxPopulation(Math.max(...stats.map((s) => s.population)));
        setMaxApplications(Math.max(...stats.map((s) => s.applications)));
      } catch {
        setZipData(null);
      }
    }
    load();
  }, []);

  useEffect(() => {
    if (metric === 'population' || metric === 'applications') return;
    if (!zipStats.length) return;
    if (customData[metric]) return;
    const m = customMetrics.find((cm) => cm.key === metric);
    if (!m) return;
    async function loadCustom(metricInfo: CustomMetric) {
      const storageKey = `customMetricData_${metricInfo.key}`;
      if (typeof window !== 'undefined') {
        const cached = localStorage.getItem(storageKey);
        if (cached) {
          try {
            const entries: [string, number][] = JSON.parse(cached);
            const map = new Map<string, number>(entries);
            setCustomData((prev) => ({ ...prev, [metricInfo.key]: map }));
            setCustomMax((prev) => ({ ...prev, [metricInfo.key]: Math.max(...entries.map((e) => e[1])) }));
            return;
          } catch {
            /* ignore */
          }
        }
      }
      try {
        const zipCodes = zipStats.map((z) => z.zip);
        const res = await fetch(
          `${metricInfo.dataset}?get=${metricInfo.variable}&for=zip%20code%20tabulation%20area:${zipCodes.join(',')}`
        );
        const json = await res.json();
        const entries: [string, number][] = json
          .slice(1)
          .map((row: string[]) => [row[row.length - 1], Number(row[0])]);
        const map = new Map<string, number>(entries);
        setCustomData((prev) => ({ ...prev, [metricInfo.key]: map }));
        setCustomMax((prev) => ({ ...prev, [metricInfo.key]: Math.max(...entries.map((e) => e[1])) }));
        if (typeof window !== 'undefined') {
          localStorage.setItem(storageKey, JSON.stringify(entries));
        }
      } catch (err) {
        console.error('Failed to load custom metric', err);
      }
    }
    loadCustom(m);
  }, [metric, zipStats, customMetrics, customData]);

  const layers = useMemo(() => {
    const data = organizations.flatMap((org) =>
      org.locations.map((location) => ({
        coordinates: [location.longitude, location.latitude] as [number, number],
        organization: org,
        color: getCategoryColor(org.category)
      }))
    );

    const baseLayers: Layer[] = [];

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
                : metric === 'applications'
                  ? f.properties.applications
                  : customData[metric]?.get(f.properties.ZCTA5CE10) || 0;
            const max =
              metric === 'population'
                ? maxPopulation
                : metric === 'applications'
                  ? maxApplications
                  : customMax[metric] || 0;
            return getChoroplethColor(value, max, metric);
          },
          getLineColor: [0, 123, 255, 200],
          lineWidthMinPixels: 1,
          pickable: true,
          updateTriggers: {
            getFillColor: [metric, maxPopulation, maxApplications, customData, customMax]
          }
        })
      );
    }

    baseLayers.push(
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

    return baseLayers;
  }, [organizations, onOrganizationClick, zipData, metric, maxPopulation, maxApplications, customData, customMax]);

  return (
    <div className="w-full h-full relative">
      <DeckGL
        viewState={viewState}
        onViewStateChange={(e: any) => setViewState(e.viewState)}
        controller={true}
        layers={layers}
        getTooltip={({ object }) => {
          const zip = object?.properties?.ZCTA5CE10;
          if (!zip) return null;
          const value =
            metric === 'population'
              ? object.properties.population
              : metric === 'applications'
                ? object.properties.applications
                : customData[metric]?.get(zip);
          if (value == null) return `ZIP: ${zip}`;
          const label =
            metric === 'population'
              ? 'Population'
              : metric === 'applications'
                ? 'Business Applications'
                : customMetrics.find((m) => m.key === metric)?.label || 'Value';
          return `ZIP: ${zip}\n${label}: ${Math.round(value).toLocaleString()}`;
        }}
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
  metric: string
): [number, number, number, number] {
  if (!max) {
    return metric === 'applications'
      ? [254, 224, 144, 180]
      : [198, 219, 239, 180];
  }
  let start: [number, number, number];
  let end: [number, number, number];
  if (metric === 'applications') {
    start = [254, 224, 144];
    end = [217, 72, 1];
  } else if (metric === 'population') {
    start = [198, 219, 239];
    end = [8, 81, 156];
  } else {
    start = [206, 238, 249];
    end = [11, 105, 151];
  }
  const t = value / max;
  const r = Math.round(start[0] + (end[0] - start[0]) * t);
  const g = Math.round(start[1] + (end[1] - start[1]) * t);
  const b = Math.round(start[2] + (end[2] - start[2]) * t);
  return [r, g, b, 200];
}
