'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { id } from '@instantdb/react';
import db from '../lib/db';
import {
  fetchMetric,
  type GeoFeature,
  prefetchZctaBoundaries,
  prefetchCountyBoundaries,
  featuresFromMap,
} from '../lib/census';
import { useConfig } from './ConfigContext';
import type { Stat } from '../types/stat';

interface Metric {
  id: string;
  label: string;
}

interface MetricsContextValue {
  metrics: Metric[];
  selectedMetric: string | null;
  features: GeoFeature[] | undefined;
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
  const [features, setFeatures] = useState<GeoFeature[] | undefined>();
  const [metricFeatures, setMetricFeatures] = useState<Record<string, GeoFeature[]>>({});
  const { config } = useConfig();
  const { data: statData } = db.useQuery({ stats: {} });

  useEffect(() => {
    if (config.geography === 'county') {
      prefetchCountyBoundaries();
    } else {
      prefetchZctaBoundaries();
    }
  }, [config.geography]);

  const addMetric = async (m: Metric) => {
    setMetrics(prev => (prev.find(p => p.id === m.id) ? prev : [...prev, m]));

    // Prefer existing stat from InstantDB if available
    const allStats = (statData?.stats || []) as Stat[];
    const matching = allStats.filter(s => s.code === m.id);
    const preferred = matching.find(s => s.dataset === config.dataset && String(s.year) === String(config.year)) || matching[0];
    if (preferred) {
      // Log that InstantDB fulfilled this request
      try {
        await fetch('/api/logs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            service: 'InstantDB',
            direction: 'response',
            message: {
              type: 'stat_hit',
              code: preferred.code,
              dataset: preferred.dataset,
              year: preferred.year,
            },
          }),
        });
      } catch {
        // ignore log errors
      }
      await loadStatMetric(preferred);
      return;
    }

    // Otherwise fetch from US Census and persist
    const varId = m.id.includes('_') ? m.id : m.id + '_001E';
    const feats = await fetchMetric(varId, {
      year: config.year,
      dataset: config.dataset,
      geography: config.geography,
    });
    if (feats) {
      // Update local selection immediately
      const key = `${config.dataset}-${config.year}-${config.geography}-${m.id}`;
      setSelectedMetric(m.id);
      setMetricFeatures(prev => ({ ...prev, [key]: feats }));
      setFeatures(feats);

      const statId = id();
      const geoMap: Record<string, number | null> = {};
      feats.forEach(f => {
        geoMap[f.properties.id] = f.properties.value ?? null;
      });
      try {
        await db.transact([
          db.tx.stats[statId].update({
            code: m.id,
            description: m.label,
            category: 'General',
            dataset: config.dataset,
            geography: config.geography,
            source: 'US Census',
            year: Number(config.year),
            data: JSON.stringify(geoMap),
          }),
        ]);
      } catch {
        // Ignore unique constraint errors if another tab created it
      }
    }
  };

  const loadStatMetric = async (stat: Stat) => {
    const m = { id: stat.code, label: stat.description };
    setMetrics(prev => (prev.find(p => p.id === m.id) ? prev : [...prev, m]));
    const geography = (stat.geography || 'zip code tabulation area') as 'zip code tabulation area' | 'county';
    const key = `${stat.dataset}-${stat.year}-${geography}-${m.id}`;
    let feats = metricFeatures[key];
    if (!feats) {
      const geoMap: Record<string, number | null> = JSON.parse(stat.data);
      feats = await featuresFromMap(geoMap, geography);
      setMetricFeatures(prev => ({ ...prev, [key]: feats }));
    }
    setSelectedMetric(m.id);
    setFeatures(feats);
  };

  const selectMetric = async (id: string) => {
      setSelectedMetric(id);
      const key = `${config.dataset}-${config.year}-${config.geography}-${id}`;
      let feats = metricFeatures[key];
      if (!feats) {
        const varId = id.includes('_') ? id : id + '_001E';
        feats = await fetchMetric(varId, {
          year: config.year,
          dataset: config.dataset,
          geography: config.geography,
        });
        setMetricFeatures(prev => ({ ...prev, [key]: feats! }));
      }
      setFeatures(feats);
    };

  const clearMetrics = () => {
    setMetrics([]);
    setSelectedMetric(null);
    setFeatures(undefined);
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
    features,
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
