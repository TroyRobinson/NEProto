import { ScatterplotLayer, GeoJsonLayer, IconLayer } from '@deck.gl/layers';
import type { PickingInfo } from '@deck.gl/core';
import type { Organization } from '../types/organization';
import type { ZctaFeature } from './census';

// Faded accent and vivid accent colors from design system
const FADED_ACCENT: [number, number, number, number] = [129, 132, 227, 160]; // --color-blue-accent-faded (#8184E3)
const VIVID_ACCENT: [number, number, number, number] = [23, 30, 199, 255]; // --color-accent (#171EC7)

interface OrgPoint {
  coordinates: [number, number];
  organization: Organization;
}

export function createOrganizationLayers(
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
  const baseLayer = new ScatterplotLayer<OrgPoint>({
    id: 'organizations',
    data: orgData,
    getPosition: (d) => d.coordinates,
    getRadius: 400,
    getFillColor: FADED_ACCENT,
    getLineColor: [0, 0, 0, 80],
    getLineWidth: 2,
    radiusScale: 1,
    radiusMinPixels: 8,
    radiusMaxPixels: 20,
    pickable: true,
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

  const highlighted = orgData.filter(
    (d) => d.organization.id === selectedOrgId || d.organization.id === hoveredOrgId
  );

  const pinLayer =
    highlighted.length > 0
      ? new IconLayer<OrgPoint>({
          id: 'organization-pins',
          data: highlighted,
          iconAtlas:
            'https://raw.githubusercontent.com/visgl/deck.gl-data/master/website/icon-atlas.png',
          iconMapping: {
            marker: { x: 0, y: 0, width: 128, height: 128, anchorY: 128, mask: true },
          },
          getIcon: () => 'marker',
          sizeScale: 1,
          getSize: 40,
          getPosition: (d) => d.coordinates,
          getColor: VIVID_ACCENT,
          pickable: false,
        })
      : null;

  return pinLayer ? [baseLayer, pinLayer] : [baseLayer];
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
