'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { id as generateId } from '@instantdb/react';
import db from '../lib/db';
import {
  fetchZctaMetric,
  featuresFromZctaMap,
  type ZctaFeature,
  prefetchZctaBoundaries,
} from '../lib/census';
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
  selectMetric: (id: string, label?: string) => Promise<void>;
}

const MetricsContext = createContext<MetricsContextValue | undefined>(undefined);

export function MetricsProvider({ children }: { children: React.ReactNode }) {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
  const [zctaFeatures, setZctaFeatures] = useState<ZctaFeature[] | undefined>();
  const [metricFeatures, setMetricFeatures] = useState<Record<string, ZctaFeature[]>>({});
  const { config } = useConfig();
  const { data: statData } = db.useQuery({ stats: {} });

  useEffect(() => {
    prefetchZctaBoundaries();
  }, []);

  const addMetric = async (m: Metric) => {
    setMetrics((prev) => (prev.find((p) => p.id === m.id) ? prev : [...prev, m]));
    await selectMetric(m.id, m.label);
  };

  const selectMetric = async (metricId: string, label?: string) => {
    setSelectedMetric(metricId);
    const key = `${config.dataset}-${config.year}-${metricId}`;
    let features = metricFeatures[key];
    if (!features) {
      const stat = statData?.stats?.find(
        (s) =>
          s.variableId === metricId &&
          s.dataset === config.dataset &&
          s.year === Number(config.year),
      );
      if (stat) {
        const zctaMap: Record<string, number | null> = JSON.parse(stat.data);
        features = await featuresFromZctaMap(zctaMap);
      } else {
        const varId = metricId.includes('_') ? metricId : metricId + '_001E';
        features = await fetchZctaMetric(varId, {
          year: config.year,
          dataset: config.dataset,
        });
        if (label) {
          const statId = generateId();
          const zctaMap: Record<string, number | null> = {};
          features.forEach((f) => {
            zctaMap[f.properties.ZCTA5CE10] = f.properties.value ?? null;
          });
          await db.transact([
            db.tx.stats[statId].update({
              variableId: metricId,
              title: metricId,
              description: label,
              category: 'General',
              dataset: config.dataset,
              source: 'US Census',
              year: Number(config.year),
              data: JSON.stringify(zctaMap),
            }),
          ]);
        }
      }
      setMetricFeatures((prev) => ({ ...prev, [key]: features! }));
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

