'use client';

import { createContext, useContext, useState } from 'react';
import { fetchZctaMetric, type ZctaFeature } from '../lib/census';

interface Metric {
  id: string;
  label: string;
}

interface MetricsContextValue {
  metrics: Metric[];
  selectedMetric: string | null;
  zctaFeatures?: ZctaFeature[];
  addMetric: (metric: Metric) => Promise<void>;
  selectMetric: (id: string) => Promise<void>;
}

const MetricsContext = createContext<MetricsContextValue | undefined>(undefined);

export function MetricsProvider({ children }: { children: React.ReactNode }) {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
  const [zctaFeatures, setZctaFeatures] = useState<ZctaFeature[] | undefined>();
  const [metricFeatures, setMetricFeatures] = useState<Record<string, ZctaFeature[]>>({});

  const selectMetric = async (id: string) => {
    setSelectedMetric(id);
    let features = metricFeatures[id];
    if (!features) {
      const varId = id.includes('_') ? id : id + '_001E';
      features = await fetchZctaMetric(varId);
      setMetricFeatures(prev => ({ ...prev, [id]: features }));
    }
    setZctaFeatures(features);
  };

  const addMetric = async (metric: Metric) => {
    setMetrics(prev => (prev.find(m => m.id === metric.id) ? prev : [...prev, metric]));
    await selectMetric(metric.id);
  };

  return (
    <MetricsContext.Provider value={{ metrics, selectedMetric, zctaFeatures, addMetric, selectMetric }}>
      {children}
    </MetricsContext.Provider>
  );
}

export function useMetrics() {
  const ctx = useContext(MetricsContext);
  if (!ctx) throw new Error('useMetrics must be used within MetricsProvider');
  return ctx;
}

export default MetricsProvider;

