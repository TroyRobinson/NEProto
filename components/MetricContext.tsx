'use client';

import { createContext, useContext, useState } from 'react';
import {
  fetchZctaMetric,
  type ZctaFeature,
  type CensusConfig,
  DEFAULT_CENSUS_CONFIG,
} from '../lib/census';

interface Metric {
  id: string;
  label: string;
}

interface MetricsContextValue {
  metrics: Metric[];
  selectedMetric: string | null;
  zctaFeatures: ZctaFeature[] | undefined;
  addMetric: (metric: Metric) => Promise<void>;
  selectMetric: (id: string) => Promise<void>;
  config: CensusConfig;
  updateConfig: (partial: Partial<CensusConfig>) => void;
}

const MetricsContext = createContext<MetricsContextValue | undefined>(undefined);

export function MetricsProvider({ children }: { children: React.ReactNode }) {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
  const [zctaFeatures, setZctaFeatures] = useState<ZctaFeature[] | undefined>();
  const [metricFeatures, setMetricFeatures] = useState<Record<string, ZctaFeature[]>>({});
  const [config, setConfig] = useState<CensusConfig>(DEFAULT_CENSUS_CONFIG);

  const addMetric = async (m: Metric) => {
    setMetrics(prev => (prev.find(p => p.id === m.id) ? prev : [...prev, m]));
    await selectMetric(m.id);
  };

  const selectMetric = async (id: string) => {
    setSelectedMetric(id);
    let features = metricFeatures[id];
    if (!features) {
      const varId = id.includes('_') ? id : id + '_001E';
      features = await fetchZctaMetric(varId, config);
      setMetricFeatures(prev => ({ ...prev, [id]: features! }));
    }
    setZctaFeatures(features);
  };

  const updateConfig = (partial: Partial<CensusConfig>) => {
    setConfig(prev => {
      const next = { ...prev, ...partial };
      // when configuration changes, refetch current metric
      if (selectedMetric) {
        const varId = selectedMetric.includes('_')
          ? selectedMetric
          : selectedMetric + '_001E';
        fetchZctaMetric(varId, next).then(f => {
          setMetricFeatures({ [selectedMetric]: f });
          setZctaFeatures(f);
        });
      } else {
        setMetricFeatures({});
        setZctaFeatures(undefined);
      }
      return next;
    });
  };

  const value: MetricsContextValue = {
    metrics,
    selectedMetric,
    zctaFeatures,
    addMetric,
    selectMetric,
    config,
    updateConfig,
  };

  return (
    <MetricsContext.Provider value={value}>{children}</MetricsContext.Provider>
  );
}

export function useMetrics() {
  const ctx = useContext(MetricsContext);
  if (!ctx) {
    throw new Error('useMetrics must be used within MetricsProvider');
  }
  return ctx;
}

