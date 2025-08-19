'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { id as genId } from '@instantdb/react';
import { fetchZctaMetric, type ZctaFeature, prefetchZctaBoundaries } from '../lib/census';
import db from '../lib/db';
import { useConfig } from './ConfigContext';
import type { Stat } from '../types/stat';

interface Metric {
  id: string;
  label: string;
}

interface MetricsContextValue {
  metrics: Metric[];
  selectedMetric: string | null;
  zctaFeatures: ZctaFeature[] | undefined;
  addMetric: (metric: Metric) => Promise<void>;
  selectMetric: (id: string, label?: string) => Promise<void>;
}

const MetricsContext = createContext<MetricsContextValue | undefined>(undefined);

export function MetricsProvider({ children }: { children: React.ReactNode }) {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
  const [zctaFeatures, setZctaFeatures] = useState<ZctaFeature[] | undefined>();
  const [metricFeatures, setMetricFeatures] = useState<Record<string, ZctaFeature[]>>({});
  const { config } = useConfig();
  const { data: statsData } = db.useQuery({ stats: {} });
  const stats = (statsData?.stats as Stat[]) ?? [];

  useEffect(() => {
    prefetchZctaBoundaries();
  }, []);

  const addMetric = async (m: Metric) => {
    setMetrics(prev => (prev.find(p => p.id === m.id) ? prev : [...prev, m]));
    await selectMetric(m.id, m.label);
  };

  const selectMetric = async (id: string, label?: string) => {
    setSelectedMetric(id);
    const key = `${config.dataset}-${config.year}-${id}`;
    let features = metricFeatures[key];
    if (!features) {
      const existing = stats.find(
        (s) => s.variableId === id && s.dataset === config.dataset && s.year === config.year
      );
      if (existing) {
        const boundaries = await prefetchZctaBoundaries();
        const values = existing.values || {};
        features = boundaries?.map(f => ({
          ...f,
          properties: { ...f.properties, value: values[f.properties.ZCTA5CE10] ?? null },
        }));
      } else {
        const varId = id.includes('_') ? id : id + '_001E';
        features = await fetchZctaMetric(varId, { year: config.year, dataset: config.dataset });
        if (label && features) {
          const values: Record<string, number | null> = {};
          for (const f of features) {
            values[f.properties.ZCTA5CE10] = f.properties.value ?? null;
          }
          const statId = genId();
          await db.transact([
            db.tx.stats[statId].update({
              variableId: id,
              title: label,
              description: label,
              dataset: config.dataset,
              year: config.year,
              source: 'US Census',
              values,
            }),
          ]);
        }
      }
      if (features) {
        setMetricFeatures(prev => ({ ...prev, [key]: features! }));
      }
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

