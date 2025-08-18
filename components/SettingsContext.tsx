'use client';

import { createContext, useContext, useEffect, useState } from 'react';

interface Settings {
  year: string;
  county: string;
}

interface DataStatus {
  variablesLoaded: number | null;
  polygonsLoaded: number | null;
}

interface SettingsContextValue {
  settings: Settings;
  updateSettings: (updates: Partial<Settings>) => void;
  dataStatus: DataStatus;
  refreshData: (force?: boolean) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

const DB_NAME = 'neproto-cache';
const STORE_NAME = 'data';

async function openDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') throw new Error('IndexedDB not supported');
  return new Promise((resolve, reject) => {
    let req: IDBOpenDBRequest;
    try {
      req = indexedDB.open(DB_NAME, 1);
    } catch (err) {
      reject(err);
      return;
    }
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet<T>(key: string): Promise<T | undefined> {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result as T);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return undefined;
  }
}

async function idbSet<T>(key: string, value: T): Promise<void> {
  try {
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(value, key);
      req.onsuccess = () => resolve(undefined);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('idbSet failed', err);
  }
}

async function loadVariables(year: string, force = false) {
  const key = `census_vars_${year}`;
  const cached = force ? undefined : await idbGet<[string, unknown][]>(key);
  if (cached) return cached;
  const res = await fetch(`/api/census/variables?year=${year}${force ? '&refresh=1' : ''}`);
  const entries = await res.json();
  await idbSet(key, entries);
  return entries as [string, unknown][];
}

async function loadPolygons(force = false) {
  const key = 'okc_zcta_polygons';
  const cached = force ? undefined : await idbGet<unknown>(key);
  if (cached) return cached;
  const res = await fetch('/okc_zcta.geojson');
  const json = await res.json();
  await idbSet(key, json);
  return json;
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>({ year: '2021', county: 'Oklahoma County' });
  const [dataStatus, setDataStatus] = useState<DataStatus>({ variablesLoaded: null, polygonsLoaded: null });

  const updateSettings = (updates: Partial<Settings>) =>
    setSettings((prev) => ({ ...prev, ...updates }));

  const refreshData = async (force = false) => {
    try {
      const [vars, polys] = await Promise.all([
        loadVariables(settings.year, force),
        loadPolygons(force),
      ]);
      setDataStatus({ variablesLoaded: vars.length, polygonsLoaded: polys.features?.length ?? 0 });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to refresh data', err);
      setDataStatus({ variablesLoaded: null, polygonsLoaded: null });
    }
  };

  useEffect(() => {
    refreshData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.year, settings.county]);

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, dataStatus, refreshData }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}

