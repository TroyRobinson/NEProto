'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { normalizeRegion } from '../lib/regions';

export interface CensusConfig {
  region: string; // e.g., "Oklahoma County"
  year: string; // e.g., "2023"
  dataset: string; // e.g., "acs/acs5"
  geography: string; // e.g., "zip code tabulation area"
}

interface ConfigContextValue {
  config: CensusConfig;
  updateConfig: (cfg: Partial<CensusConfig>) => void;
}

const defaultConfig: CensusConfig = {
  region: 'Oklahoma County',
  year: '2023',
  dataset: 'acs/acs5',
  geography: 'zip code tabulation area',
};

const ConfigContext = createContext<ConfigContextValue | undefined>(undefined);

export function ConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<CensusConfig>(defaultConfig);
  const updateConfig = (cfg: Partial<CensusConfig>) =>
    setConfig((prev) => ({ ...prev, ...cfg }));

  const CONFIG_STORAGE_KEY = 'censusConfig';

  // Load persisted config on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as Partial<CensusConfig>;
      setConfig((prev) => ({
        ...prev,
        ...saved,
        region: normalizeRegion(saved.region),
      }));
    } catch {
      /* ignore */
    }
  }, []);

  // Persist config on change
  useEffect(() => {
    try {
      localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
    } catch {
      /* ignore */
    }
  }, [config]);
  return (
    <ConfigContext.Provider value={{ config, updateConfig }}>
      {children}
    </ConfigContext.Provider>
  );
}

export function useConfig() {
  const ctx = useContext(ConfigContext);
  if (!ctx) throw new Error('useConfig must be used within ConfigProvider');
  return ctx;
}
