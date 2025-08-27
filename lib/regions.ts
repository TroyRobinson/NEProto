import { OKC_ZCTAS } from './okcZctas';
import { TULSA_ZCTAS } from './tulsaZctas';
import { WICHITA_ZCTAS } from './wichitaZctas';

export type RegionKey = 'Oklahoma County' | 'Tulsa County' | 'Wichita' | 'Sedgwick County';

export function getZctasForRegion(region: string): string[] {
  switch (region) {
    case 'Tulsa County':
      return TULSA_ZCTAS;
    case 'Wichita':
    case 'Sedgwick County':
      return WICHITA_ZCTAS;
    case 'Oklahoma County':
    default:
      return OKC_ZCTAS;
  }
}

export function getRegionCenter(region: string): { longitude: number; latitude: number; zoom: number } {
  switch (region) {
    case 'Tulsa County':
      return { longitude: -95.9928, latitude: 36.154, zoom: 11 };
    case 'Wichita':
    case 'Sedgwick County':
      return { longitude: -97.3344, latitude: 37.6872, zoom: 11 };
    case 'Oklahoma County':
    default:
      return { longitude: -97.5164, latitude: 35.4676, zoom: 11 };
  }
}

export function normalizeRegion(region: string | undefined): RegionKey | 'Oklahoma County' {
  switch (region) {
    case 'Wichita':
    case 'Sedgwick County':
      return 'Wichita';
    case 'Tulsa County':
      return 'Tulsa County';
    case 'Oklahoma County':
    default:
      return 'Oklahoma County';
  }
}

export function cityForRegion(region: string | undefined): 'OKC' | 'Tulsa' | 'Wichita' {
  switch (normalizeRegion(region)) {
    case 'Tulsa County':
      return 'Tulsa';
    case 'Wichita':
      return 'Wichita';
    case 'Oklahoma County':
    default:
      return 'OKC';
  }
}

export function regionForCity(city: string | undefined): RegionKey {
  switch ((city || '').toLowerCase()) {
    case 'tulsa':
      return 'Tulsa County';
    case 'wichita':
      return 'Wichita';
    case 'okc':
    default:
      return 'Oklahoma County';
  }
}
