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
  addPercentageMetric: (
    metric: { numerator: string; denominator: string; label: string }
  ) => Promise<void>;
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
  const { data: statData } = db.useQuery({ stats: {} });

  useEffect(() => {
    prefetchZctaBoundaries();
  }, []);

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
    const features = await fetchZctaMetric(varId, { year: config.year, dataset: config.dataset });
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

  const addPercentageMetric = async (m: {
    numerator: string;
    denominator: string;
    label: string;
  }) => {
    const code = `PCT_${m.numerator}_${m.denominator}`;
    const metric = { id: code, label: m.label };
    setMetrics(prev => (prev.find(p => p.id === code) ? prev : [...prev, metric]));

    const allStats = (statData?.stats || []) as Stat[];
    const matching = allStats.filter(s => s.code === code);
    const preferred =
      matching.find(
        s => s.dataset === config.dataset && String(s.year) === String(config.year)
      ) || matching[0];
    if (preferred) {
      await loadStatMetric(preferred);
      return;
    }

    const numVar = m.numerator.includes('_') ? m.numerator : m.numerator + '_001E';
    const denVar = m.denominator.includes('_')
      ? m.denominator
      : m.denominator + '_001E';
    const [numFeat, denFeat] = await Promise.all([
      fetchZctaMetric(numVar, { year: config.year, dataset: config.dataset }),
      fetchZctaMetric(denVar, { year: config.year, dataset: config.dataset }),
    ]);
    if (numFeat && denFeat) {
      const denMap = new Map<string, number | null>();
      denFeat.forEach(f => {
        denMap.set(f.properties.ZCTA5CE10, f.properties.value);
      });
      const outFeatures: ZctaFeature[] = [];
      const zctaMap: Record<string, number | null> = {};
      numFeat.forEach(f => {
        const z = f.properties.ZCTA5CE10;
        const numVal = f.properties.value;
        const denVal = denMap.get(z);
        let value: number | null = null;
        if (numVal !== null && denVal !== null && denVal !== 0) {
          value = (numVal / denVal) * 100;
        }
        zctaMap[z] = value;
        outFeatures.push({ ...f, properties: { ...f.properties, value } });
      });
      const key = `${config.dataset}-${config.year}-${code}`;
      setSelectedMetric(code);
      setMetricFeatures(prev => ({ ...prev, [key]: outFeatures }));
      setZctaFeatures(outFeatures);
      const statId = id();
      try {
        await db.transact([
          db.tx.stats[statId].update({
            code,
            description: m.label,
            category: 'Derived',
            dataset: config.dataset,
            source: 'US Census',
            year: Number(config.year),
            data: JSON.stringify(zctaMap),
            details: `${m.numerator}/${m.denominator}`,
          }),
        ]);
      } catch {
        /* ignore */
      }
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
        if (id.startsWith('PCT_')) {
          const stat = (statData?.stats as Stat[] | undefined)?.find(s => s.code === id);
          if (stat) {
            const zctaMap: Record<string, number | null> = JSON.parse(stat.data);
            features = await featuresFromZctaMap(zctaMap);
            setMetricFeatures(prev => ({ ...prev, [key]: features }));
          }
        } else {
          const varId = id.includes('_') ? id : id + '_001E';
          features = await fetchZctaMetric(varId, { year: config.year, dataset: config.dataset });
          if (features) setMetricFeatures(prev => ({ ...prev, [key]: features }));
        }
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
    addPercentageMetric,
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
