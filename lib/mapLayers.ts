import { ScatterplotLayer, GeoJsonLayer } from '@deck.gl/layers';
import type { PickingInfo } from '@deck.gl/core';
import type { Organization } from '../types/organization';
import type { ZctaFeature } from './census';

const BASE_COLOR: [number, number, number, number] = [129, 132, 227, 160]; // var(--color-blue-accent-faded)
const ACCENT_COLOR: [number, number, number, number] = [23, 30, 199, 255]; // var(--color-accent)

interface OrgPoint {
  coordinates: [number, number];
  organization: Organization;
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
    }))
  );

  return new ScatterplotLayer<OrgPoint>({
    id: 'organizations',
    data: orgData,
    getPosition: (d) => d.coordinates,
    getRadius: (d) => {
      if (d.organization.id === selectedOrgId) return 900;
      if (d.organization.id === hoveredOrgId) return 700;
      return 400;
    },
    getElevation: (d) => {
      if (d.organization.id === selectedOrgId) return 100;
      if (d.organization.id === hoveredOrgId) return 50;
      return 0;
    },
    getFillColor: (d) =>
      d.organization.id === selectedOrgId || d.organization.id === hoveredOrgId
        ? ACCENT_COLOR
        : BASE_COLOR,
    getLineColor: [0, 0, 0, 80],
    getLineWidth: 1,
    radiusScale: 1,
    elevationScale: 1,
    radiusMinPixels: 6,
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
