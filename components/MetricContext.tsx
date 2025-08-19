'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { id } from '@instantdb/react';
import db from '../lib/db';
import { fetchZctaMetric, type ZctaFeature, prefetchZctaBoundaries, featuresFromZctaMap } from '../lib/census';
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
  loadStatMetric: (stat: Stat) => Promise<void>;
  selectMetric: (id: string) => Promise<void>;
  clearMetrics: () => void;
}

const MetricsContext = createContext<MetricsContextValue | undefined>(undefined);

const STORAGE_KEY = 'activeMetrics';

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
          code: m.id,
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

  const loadStatMetric = async (stat: Stat) => {
    const m = { id: stat.code, label: stat.description };
    setMetrics(prev => (prev.find(p => p.id === m.id) ? prev : [...prev, m]));
    const key = `${stat.dataset}-${stat.year}-${m.id}`;
    let features = metricFeatures[key];
    if (!features) {
      const zctaMap: Record<string, number | null> = JSON.parse(stat.data);
      features = await featuresFromZctaMap(zctaMap);
      setMetricFeatures(prev => ({ ...prev, [key]: features }));
    }
    setSelectedMetric(m.id);
    setZctaFeatures(features);
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

  const clearMetrics = () => {
    setMetrics([]);
    setSelectedMetric(null);
    setZctaFeatures(undefined);
    localStorage.removeItem(STORAGE_KEY);
  };

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as { metrics: Metric[]; selected: string | null };
        if (parsed.metrics) {
          setMetrics(parsed.metrics);
          if (parsed.selected) {
            selectMetric(parsed.selected);
          }
        }
      } catch {
        /* ignore */
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ metrics, selected: selectedMetric })
    );
  }, [metrics, selectedMetric]);

  const value: MetricsContextValue = {
    metrics,
    selectedMetric,
    zctaFeatures,
    addMetric,
    loadStatMetric,
    selectMetric,
    clearMetrics,
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

