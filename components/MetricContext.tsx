'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { id } from '@instantdb/react';
import db from '../lib/db';
import { fetchZctaMetric, type ZctaFeature, prefetchZctaBoundaries } from '../lib/census';
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

  useEffect(() => {
    prefetchZctaBoundaries();
  }, []);

    const addMetric = async (m: Metric) => {
      setMetrics(prev => (prev.find(p => p.id === m.id) ? prev : [...prev, m]));
      await selectMetric(m.id);
      const varId = m.id.includes('_') ? m.id : m.id + '_001E';
      const features = await fetchZctaMetric(varId, { year: config.year, dataset: config.dataset });
      if (features) {
        const statId = id();
        const zctaMap: Record<string, number | null> = {};
        features.forEach(f => {
          zctaMap[f.properties.ZCTA5CE10] = f.properties.value ?? null;
        });
        await db.transact([
          db.tx.stats[statId].update({
            variableId: m.id,
            title: m.label,
            description: m.label,
            category: 'General',
            dataset: config.dataset,
            source: 'US Census',
            year: Number(config.year),
            data: JSON.stringify(zctaMap),
          }),
        ]);
      }
    };

    const selectMetric = async (id: string) => {
      setSelectedMetric(id);
      const key = `${config.dataset}-${config.year}-${id}`;
      let features = metricFeatures[key];
      if (!features) {
        const varId = id.includes('_') ? id : id + '_001E';
        features = await fetchZctaMetric(varId, { year: config.year, dataset: config.dataset });
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

