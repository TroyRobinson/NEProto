'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import {
  fetchZctaMetric,
  type ZctaFeature,
  prefetchZctaBoundaries,
  getZctaBoundaries,
} from '../lib/census';
import { useConfig } from './ConfigContext';
import db from '../lib/db';
import { id as genId } from '@instantdb/react';
import { loadVariables } from '../lib/censusTools';

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

  useEffect(() => {
    prefetchZctaBoundaries();
  }, []);

  const addMetric = async (m: Metric) => {
    setMetrics((prev) => (prev.find((p) => p.id === m.id) ? prev : [...prev, m]));
    await selectMetric(m.id, m.label);
  };

  async function fetchFromDb(variable: string): Promise<ZctaFeature[] | null> {
    try {
      const res = await fetch(`/api/stats?variable=${variable}`);
      if (!res.ok) return null;
      const data = await res.json();
      const boundaries = await getZctaBoundaries();
      const valueMap = new Map(
        (data.values as Array<{ zcta: string; value: number | null }>).map((v) => [v.zcta, v.value])
      );
      return boundaries
        .filter((b) => valueMap.has(b.properties.ZCTA5CE10))
        .map((b) => ({
          type: 'Feature',
          geometry: b.geometry,
          properties: {
            ...b.properties,
            value: valueMap.get(b.properties.ZCTA5CE10) ?? null,
          },
        }));
    } catch {
      return null;
    }
  }

  async function saveMetricToDb(variable: string, label: string, features: ZctaFeature[]) {
    try {
      const vars = await loadVariables(config.year, config.dataset);
      const info = vars.find(([vid]) => vid === variable);
      const concept = info ? info[1].concept : '';
      const statId = genId();
      await db.transact([
        db.tx.stats[statId].update({
          variable,
          title: label,
          description: label,
          category: concept,
          dataset: config.dataset,
          year: config.year,
          source: 'US Census',
          updatedAt: Date.now(),
        }),
        ...features.map((f) =>
          db.tx.statValues[genId()]
            .update({
              zcta: f.properties.ZCTA5CE10,
              value: f.properties.value ?? undefined,
            })
            .link({ stat: statId })
        ),
      ]);
    } catch (err) {
      console.error('Failed to save metric', err);
    }
  }

  const selectMetric = async (id: string, label?: string) => {
    setSelectedMetric(id);
    const key = `${id}`;
    let features = metricFeatures[key];
    if (!features) {
      features = await fetchFromDb(id);
      if (!features) {
        const varId = id.includes('_') ? id : id + '_001E';
        features = await fetchZctaMetric(varId, { year: config.year, dataset: config.dataset });
        if (label) {
          await saveMetricToDb(varId, label, features);
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

