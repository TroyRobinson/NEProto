import { ScatterplotLayer, GeoJsonLayer } from '@deck.gl/layers';
import type { PickingInfo } from '@deck.gl/core';
import type { Organization } from '../types/organization';
import type { ZctaFeature } from './census';

function getCategoryColor(category: string): [number, number, number, number] {
  // Using design system colors for organization categories
  const colors: Record<string, [number, number, number, number]> = {
    'Food Security': [184, 0, 107, 200], // var(--color-error) - #B8006B
    'Housing & Shelter': [23, 30, 199, 200], // var(--color-primary) - #171EC7
    Education: [0, 169, 157, 200], // var(--color-success) - #00A99D
    Healthcare: [184, 0, 107, 200], // var(--color-error) - #B8006B
    'Youth Development': [215, 168, 0, 200], // var(--color-warning) - #D7A800
    'Senior Services': [75, 85, 99, 200], // var(--color-gray-600)
    Environmental: [0, 169, 157, 200], // var(--color-success) - #00A99D
    'Arts & Culture': [129, 132, 227, 200], // var(--color-secondary) - #8184E3
    'Community Development': [23, 30, 199, 200], // var(--color-accent) - #171EC7
    Other: [107, 114, 128, 200], // var(--color-gray-500)
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
  selectedOrgId?: string | null,
  hoveredOrgId?: string | null,
  onOrganizationHover?: (org: Organization | null) => void
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
    getRadius: (d) => {
      if (d.organization.id === selectedOrgId) return 800;
      if (d.organization.id === hoveredOrgId) return 600;
      return 400;
    },
    getFillColor: (d) =>
      d.organization.id === selectedOrgId || d.organization.id === hoveredOrgId
        ? [255, 255, 255, 255]
        : d.color,
    getLineColor: (d) => {
      if (d.organization.id === selectedOrgId) return [0, 0, 0, 255];
      if (d.organization.id === hoveredOrgId) return [0, 0, 0, 200];
      return [0, 0, 0, 100];
    },
    getLineWidth: (d) => {
      if (d.organization.id === selectedOrgId) return 6;
      if (d.organization.id === hoveredOrgId) return 4;
      return 2;
    },
    radiusScale: 1,
    radiusMinPixels: 8,
    radiusMaxPixels: 40,
    pickable: true,
    // Deck.gl's onClick handler includes an event argument that's unused here.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    onClick: ((info: PickingInfo<OrgPoint>, _event: unknown) => {
      if (info.object && onOrganizationClick) {
        onOrganizationClick(info.object.organization);
      }
    }) as (info: PickingInfo<OrgPoint>, event: unknown) => void,
    onHover: ((info: PickingInfo<OrgPoint>) => {
      if (onOrganizationHover) {
        onOrganizationHover(info.object ? info.object.organization : null);
      }
    }) as (info: PickingInfo<OrgPoint>) => void,
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
