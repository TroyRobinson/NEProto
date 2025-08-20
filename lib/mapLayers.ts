import { ScatterplotLayer, GeoJsonLayer } from '@deck.gl/layers';
import type { PickingInfo } from '@deck.gl/core';
import type { Organization } from '../types/organization';
import type { ZctaFeature } from './census';

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
    Other: [134, 142, 150, 200],
  };

  return colors[category] || colors['Other'];
}

interface OrgPoint {
  coordinates: [number, number];
  organization: Organization;
  color: [number, number, number, number];
}

export function createOrganizationLayer(
  organizations: Organization[],
  onOrganizationClick?: (org: Organization) => void,
  highlightedOrgId?: string
) {
  const orgData: OrgPoint[] = organizations.flatMap((org) =>
    org.locations.map((location) => ({
      coordinates: [location.longitude, location.latitude],
      organization: org,
      color: getCategoryColor(org.category),
    }))
  );

  return new ScatterplotLayer<OrgPoint>({
    id: 'organizations',
    data: orgData,
    getPosition: (d) => d.coordinates,
    getRadius: (d) => (d.organization.id === highlightedOrgId ? 300 : 200),
    getFillColor: (d) => d.color,
    getLineColor: (d) =>
      d.organization.id === highlightedOrgId ? [0, 0, 0, 200] : [0, 0, 0, 100],
    getLineWidth: (d) => (d.organization.id === highlightedOrgId ? 4 : 2),
    radiusScale: 1,
    radiusMinPixels: 8,
    radiusMaxPixels: 20,
    pickable: true,
    // Deck.gl's onClick handler includes an event argument that's unused here.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    onClick: ((info: PickingInfo<OrgPoint>, _event: unknown) => {
      if (info.object && onOrganizationClick) {
        onOrganizationClick(info.object.organization);
      }
    }) as (info: PickingInfo<OrgPoint>, event: unknown) => void,
  });
}

export function createZctaMetricLayer(zctaFeatures?: ZctaFeature[]) {
  if (!zctaFeatures || zctaFeatures.length === 0) return null;

  const vals = zctaFeatures
    .map((f) => f.properties.value)
    .filter((v): v is number => v != null && v >= 0);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min || 1;

  // Tailwind indigo palette (100 -> 900)
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

  return new GeoJsonLayer<ZctaFeature>({
    id: 'zcta-metric',
    data: zctaFeatures,
    stroked: true,
    filled: true,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getFillColor: (f: any) => getMetricColor(f.properties.value),
    getLineColor: [0, 0, 0, 80],
    lineWidthMinPixels: 1,
    pickable: true,
  });
}
