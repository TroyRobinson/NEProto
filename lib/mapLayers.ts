/* eslint-disable @typescript-eslint/no-explicit-any */
import { ScatterplotLayer, GeoJsonLayer } from '@deck.gl/layers';
import type { Organization } from '../types/organization';
import type { ZctaFeature } from './census';

export function getCategoryColor(category: string): [number, number, number, number] {
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
    Other: [134, 142, 150, 200],
  };

  return colors[category] || colors.Other;
}

export function createOrganizationLayer(
  organizations: Organization[],
  onOrganizationClick?: (org: Organization) => void,
) {
  const orgData = organizations.flatMap((org) =>
    org.locations.map((location) => ({
      coordinates: [location.longitude, location.latitude] as [number, number],
      organization: org,
      color: getCategoryColor(org.category),
    })),
  );

  return new ScatterplotLayer({
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
    },
  });
}

export function createZctaMetricLayer(zctaFeatures: ZctaFeature[]) {
  const vals = zctaFeatures
    .map((f) => f.properties.value)
    .filter((v): v is number => v != null && v >= 0);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min || 1;

  const indigo: [number, number, number][] = [
    [224, 231, 255], // 100
    [199, 210, 254], // 200
    [165, 180, 252], // 300
    [129, 140, 248], // 400
    [99, 102, 241], // 500
    [79, 70, 229], // 600
    [67, 56, 202], // 700
    [55, 48, 163], // 800
    [49, 46, 129], // 900
  ];

  const getMetricColor = (value: number | null): [number, number, number, number] => {
    if (value == null || !isFinite(value) || value < 0) return [0, 0, 0, 0];
    const t = (value - min) / range;
    const idx = Math.max(0, Math.min(indigo.length - 1, Math.floor(t * (indigo.length - 1))));
    const [r, g, b] = indigo[idx];
    return [r, g, b, 200];
  };

  return new GeoJsonLayer({
    id: 'zcta-metric',
    data: zctaFeatures,
    stroked: true,
    filled: true,
    getFillColor: (f: any) => getMetricColor(f.properties.value),
    getLineColor: [0, 0, 0, 80],
    lineWidthMinPixels: 1,
    pickable: true,
  }) as any;
}

