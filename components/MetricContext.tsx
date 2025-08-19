'use client';

import { createContext, useContext, useState } from 'react';
import { fetchZctaMetric, type ZctaFeature } from '../lib/census';
import { useConfig } from './ConfigContext';

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
}

const MetricsContext = createContext<MetricsContextValue | undefined>(undefined);

export function MetricsProvider({ children }: { children: React.ReactNode }) {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
  const [zctaFeatures, setZctaFeatures] = useState<ZctaFeature[] | undefined>();
  const [metricFeatures, setMetricFeatures] = useState<Record<string, ZctaFeature[]>>({});
  const { config } = useConfig();

  const addMetric = async (m: Metric) => {
    setMetrics(prev => (prev.find(p => p.id === m.id) ? prev : [...prev, m]));
    await selectMetric(m.id);
  };

  const selectMetric = async (id: string) => {
    setSelectedMetric(id);
    const key = `${config.dataset}-${config.year}-${id}`;
    let features = metricFeatures[key];
    if (!features) {
      const varId = id.includes('_') ? id : id + '_001E';
      features = await fetchZctaMetric(varId, {
        year: config.year,
        dataset: config.dataset,
        geography: config.geography,
      });
      setMetricFeatures(prev => ({ ...prev, [key]: features! }));
    }
    setZctaFeatures(features);
  };

  const value: MetricsContextValue = {
    metrics,
    selectedMetric,
    zctaFeatures,
    addMetric,
    selectMetric,
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

