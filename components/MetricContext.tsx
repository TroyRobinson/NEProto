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
  numerator?: string;
  denominator?: string;
}

interface MetricsContextValue {
  metrics: Metric[];
  selectedMetric: string | null;
  zctaFeatures: ZctaFeature[] | undefined;
  addMetric: (metric: Metric) => Promise<void>;
  loadStatMetric: (stat: Stat) => Promise<void>;
  selectMetric: (id: string, metric?: Metric) => Promise<void>;
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
  const { data: statData } = db.useQuery({ stats: {} });

  useEffect(() => {
    prefetchZctaBoundaries();
  }, []);

  const addMetric = async (m: Metric) => {
    setMetrics(prev => (prev.find(p => p.id === m.id) ? prev : [...prev, m]));

    // Prefer existing stat from InstantDB if available
    const allStats = (statData?.stats || []) as Stat[];
    const matching = allStats.filter(s => s.code === m.id);
    const preferred =
      matching.find(
        s => s.dataset === config.dataset && String(s.year) === String(config.year)
      ) || matching[0];
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

    if (m.numerator && m.denominator) {
      const [numFeatures, denFeatures] = await Promise.all([
        fetchZctaMetric(m.numerator, { year: config.year, dataset: config.dataset }),
        fetchZctaMetric(m.denominator, { year: config.year, dataset: config.dataset }),
      ]);
      const denMap = new Map<string, number | null>();
      denFeatures.forEach(df => {
        denMap.set(df.properties.ZCTA5CE10, df.properties.value ?? null);
      });
      const features: ZctaFeature[] = numFeatures.map(nf => {
        const den = denMap.get(nf.properties.ZCTA5CE10);
        const num = nf.properties.value;
        const val =
          num != null && den && den !== 0 ? (num / den) * 100 : null;
        return { ...nf, properties: { ...nf.properties, value: val } };
      });
      const key = `${config.dataset}-${config.year}-${m.id}`;
      setSelectedMetric(m.id);
      setMetricFeatures(prev => ({ ...prev, [key]: features }));
      setZctaFeatures(features);

      const statId = id();
      const zctaMap: Record<string, number | null> = {};
      features.forEach(f => {
        zctaMap[f.properties.ZCTA5CE10] = f.properties.value ?? null;
      });
      try {
        await db.transact([
          db.tx.stats[statId].update({
            code: m.id,
            description: m.label,
            category: 'Derived',
            dataset: config.dataset,
            source: 'US Census',
            year: Number(config.year),
            data: JSON.stringify(zctaMap),
            formula: `${m.numerator}/${m.denominator}`,
          }),
        ]);
      } catch {
        // Ignore unique constraint errors if another tab created it
      }
      return;
    }

    // Otherwise fetch from US Census and persist
    const varId = m.id.includes('_') ? m.id : m.id + '_001E';
    const features = await fetchZctaMetric(varId, {
      year: config.year,
      dataset: config.dataset,
    });
    if (features) {
      // Update local selection immediately
      const key = `${config.dataset}-${config.year}-${m.id}`;
      setSelectedMetric(m.id);
      setMetricFeatures(prev => ({ ...prev, [key]: features }));
      setZctaFeatures(features);

      const statId = id();
      const zctaMap: Record<string, number | null> = {};
      features.forEach(f => {
        zctaMap[f.properties.ZCTA5CE10] = f.properties.value ?? null;
      });
      try {
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
      } catch {
        // Ignore unique constraint errors if another tab created it
      }
    }
  };

  const loadStatMetric = async (stat: Stat) => {
    const [num, den] = stat.formula ? stat.formula.split('/') : [];
    const m: Metric = num && den
      ? { id: stat.code, label: stat.description, numerator: num, denominator: den }
      : { id: stat.code, label: stat.description };
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

  const selectMetric = async (id: string, metricArg?: Metric) => {
    setSelectedMetric(id);
    const key = `${config.dataset}-${config.year}-${id}`;
    let features = metricFeatures[key];
    const m = metricArg || metrics.find(p => p.id === id);
    if (!features) {
      if (m?.numerator && m?.denominator) {
        const [numFeatures, denFeatures] = await Promise.all([
          fetchZctaMetric(m.numerator, { year: config.year, dataset: config.dataset }),
          fetchZctaMetric(m.denominator, { year: config.year, dataset: config.dataset }),
        ]);
        const denMap = new Map<string, number | null>();
        denFeatures.forEach(df => {
          denMap.set(df.properties.ZCTA5CE10, df.properties.value ?? null);
        });
        features = numFeatures.map(nf => {
          const den = denMap.get(nf.properties.ZCTA5CE10);
          const num = nf.properties.value;
          const val =
            num != null && den && den !== 0 ? (num / den) * 100 : null;
          return { ...nf, properties: { ...nf.properties, value: val } };
        });
      } else {
        const varId = id.includes('_') ? id : id + '_001E';
        features = await fetchZctaMetric(varId, {
          year: config.year,
          dataset: config.dataset,
        });
      }
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
            const meta = parsed.metrics.find(m => m.id === parsed.selected);
            selectMetric(parsed.selected, meta);
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
