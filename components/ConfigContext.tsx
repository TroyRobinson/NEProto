'use client';

import { createContext, useContext, useState } from 'react';

export interface CensusConfig {
  region: string; // e.g., "Oklahoma County ZCTAs"
  year: string; // e.g., "2023"
  dataset: string; // e.g., "acs/acs5"
  geography: string; // e.g., "zip code tabulation area"
}

interface ConfigContextValue {
  config: CensusConfig;
  updateConfig: (cfg: Partial<CensusConfig>) => void;
}

const defaultConfig: CensusConfig = {
  region: 'Oklahoma County ZCTAs',
  year: '2023',
  dataset: 'acs/acs5',
  geography: 'zip code tabulation area',
};

const ConfigContext = createContext<ConfigContextValue | undefined>(undefined);

export function ConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<CensusConfig>(defaultConfig);
  const updateConfig = (cfg: Partial<CensusConfig>) =>
    setConfig((prev) => ({ ...prev, ...cfg }));
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
