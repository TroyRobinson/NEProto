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
  refreshData: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

async function loadVariables(year: string) {
  const key = `census_vars_${year}`;
  if (typeof window !== 'undefined') {
    const cached = window.localStorage.getItem(key);
    if (cached) return JSON.parse(cached);
  }
  const res = await fetch(`https://api.census.gov/data/${year}/acs/acs5/variables.json`);
  const json = await res.json();
  const entries = Object.entries(json.variables as Record<string, unknown>);
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(key, JSON.stringify(entries));
  }
  return entries;
}

async function loadPolygons() {
  const key = 'okc_zcta_polygons';
  if (typeof window !== 'undefined') {
    const cached = window.localStorage.getItem(key);
    if (cached) return JSON.parse(cached);
  }
  const res = await fetch('/okc_zcta.geojson');
  const json = await res.json();
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(key, JSON.stringify(json));
  }
  return json;
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>({ year: '2021', county: 'Oklahoma County' });
  const [dataStatus, setDataStatus] = useState<DataStatus>({ variablesLoaded: null, polygonsLoaded: null });

  const updateSettings = (updates: Partial<Settings>) =>
    setSettings((prev) => ({ ...prev, ...updates }));

  const refreshData = async () => {
    const [vars, polys] = await Promise.all([
      loadVariables(settings.year),
      loadPolygons(),
    ]);
    setDataStatus({ variablesLoaded: vars.length, polygonsLoaded: polys.features?.length ?? 0 });
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

