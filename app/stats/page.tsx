'use client';

import React, { useEffect, useState } from 'react';

interface Dataset {
  title: string;
  variablesLink: string;
}

interface RawDataset {
  title?: string;
  c_variablesLink?: string;
}

interface Variable {
  name: string;
  label: string;
  concept?: string;
  predicateType?: string;
}

interface RawVariable {
  label: string;
  concept?: string;
  predicateType?: string;
}

export default function CensusStatExplorer() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [datasetQuery, setDatasetQuery] = useState('');
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);
  const [variables, setVariables] = useState<Variable[]>([]);
  const [cachedVars, setCachedVars] = useState<Record<string, Variable[]>>({});
  const [varQuery, setVarQuery] = useState('');
  const [loadingVars, setLoadingVars] = useState(false);

  useEffect(() => {
    async function loadDatasets() {
      try {
        const res = await fetch('https://api.census.gov/data.json');
        const json = await res.json();
        const ds: Dataset[] = (json.dataset as RawDataset[] || [])
          .filter((d) => d.c_variablesLink)
          .map((d) => ({
            title: d.title || 'Untitled dataset',
            variablesLink: (d.c_variablesLink as string)
              .replace(/^http:/, 'https:')
              .replace(/\.html$/, '.json'),
          }));
        setDatasets(ds);
      } catch (err) {
        console.error('Failed to load datasets', err);
      }
    }
    loadDatasets();
  }, []);

  useEffect(() => {
    if (!selectedDataset) return;
    const link = selectedDataset.variablesLink;
    async function loadVariables() {
      setLoadingVars(true);
      try {
        if (cachedVars[link]) {
          setVariables(cachedVars[link]);
        } else {
          const res = await fetch(link);
          const json = await res.json();
          const vars: Variable[] = Object.entries(
            (json.variables as Record<string, RawVariable>) || {}
          ).map(([name, info]) => ({
            name,
            label: info.label,
            concept: info.concept,
            predicateType: info.predicateType,
          }));
          setVariables(vars);
          setCachedVars((prev) => {
            const updated = { ...prev, [link]: vars };
            if (typeof window !== 'undefined') {
              localStorage.setItem('censusVarCache', JSON.stringify(updated));
            }
            return updated;
          });
        }
      } catch (err) {
        console.error('Failed to load variables', err);
      } finally {
        setLoadingVars(false);
      }
    }
    loadVariables();
  }, [selectedDataset, cachedVars]);

  // Load cached variables from localStorage on first render
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = JSON.parse(localStorage.getItem('censusVarCache') || '{}');
      setCachedVars(stored);
    } catch {
      /* ignore */
    }
  }, []);

  const filteredDatasets = datasets.filter((d) =>
    d.title.toLowerCase().includes(datasetQuery.toLowerCase())
  );

  const filteredVars = variables.filter((v) =>
    `${v.name} ${v.label} ${v.concept ?? ''}`
      .toLowerCase()
      .includes(varQuery.toLowerCase())
  );

  function isMetric(v: Variable) {
    const type = v.predicateType?.toLowerCase() || '';
    const label = v.label.toLowerCase();
    if (!['int', 'float', 'double', 'number'].some((t) => type.includes(t))) {
      return false;
    }
    if (/(code|identifier|geograph|flag)/.test(label)) {
      return false;
    }
    return true;
  }

  const metricVars = filteredVars.filter(isMetric);
  const otherVars = filteredVars.filter((v) => !isMetric(v));

  function addMetric(v: Variable) {
    if (!selectedDataset) return;
    const datasetPath = selectedDataset.variablesLink.replace(/\/variables\.json.*/, '');
    const metric: { key: string; dataset: string; variable: string; label: string } = {
      key: `${datasetPath}|${v.name}`,
      dataset: datasetPath,
      variable: v.name,
      label: v.label,
    };
    const existing: {
      key: string;
      dataset: string;
      variable: string;
      label: string;
    }[] = JSON.parse(
      typeof window !== 'undefined'
        ? localStorage.getItem('customMetrics') || '[]'
        : '[]'
    );
    if (!existing.find((m) => m.key === metric.key)) {
      existing.push(metric);
      localStorage.setItem('customMetrics', JSON.stringify(existing));
      alert('Added metric');
    } else {
      alert('Metric already saved');
    }
  }

  return (
    <div className="min-h-screen p-4 bg-gray-100 text-black">
      <h1 className="text-2xl font-bold mb-4">Census Stat Explorer</h1>

      {!selectedDataset ? (
        <div>
          <input
            type="text"
            value={datasetQuery}
            onChange={(e) => setDatasetQuery(e.target.value)}
            placeholder="Search datasets..."
            className="border px-2 py-1 mb-4 w-full max-w-md"
          />
          <ul className="space-y-2 max-h-[60vh] overflow-y-auto">
            {filteredDatasets.map((d) => (
              <li key={d.variablesLink}>
                <button
                  onClick={() => setSelectedDataset(d)}
                  className="text-blue-600 hover:underline"
                >
                  {d.title}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div>
          <button
            onClick={() => {
              setSelectedDataset(null);
              setVariables([]);
              setVarQuery('');
            }}
            className="text-blue-600 hover:underline mb-4"
          >
            ← Back to datasets
          </button>
          <h2 className="text-xl font-semibold mb-2">
            {selectedDataset.title}
          </h2>
          <p className="mb-2 text-sm text-gray-700">
            Search by variable code or description, e.g., &quot;B01001&quot; or &quot;population&quot;.
          </p>
          <input
            type="text"
            value={varQuery}
            onChange={(e) => setVarQuery(e.target.value)}
            placeholder="Search variables by code or keyword..."
            className="border px-2 py-1 mb-4 w-full max-w-md"
          />
          {loadingVars ? (
            <div>Loading...</div>
          ) : (
            <div className="max-h-[60vh] overflow-y-auto space-y-4">
              <p className="text-sm text-gray-700">
                Metrics are numeric values you can map. Codes and identifiers are listed
                under Other variables.
              </p>
              <div>
                <h3 className="font-semibold mb-1">Metrics</h3>
                <ul className="space-y-2">
                  {metricVars.map((v) => (
                    <li key={v.name} className="bg-white p-2 rounded shadow">
                      <div className="font-mono text-sm">{v.name}</div>
                      <div className="text-sm">{v.label}</div>
                      {v.concept && (
                        <div className="text-xs text-gray-500">{v.concept}</div>
                      )}
                      <button
                        onClick={() => addMetric(v)}
                        className="mt-1 text-xs text-blue-600 underline"
                      >
                        Add to metrics
                      </button>
                    </li>
                  ))}
                  {metricVars.length === 0 && (
                    <li className="text-sm text-gray-600">No metrics found</li>
                  )}
                </ul>
              </div>
              {otherVars.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-1">Other variables</h3>
                  <ul className="space-y-2">
                    {otherVars.map((v) => (
                      <li key={v.name} className="bg-white p-2 rounded shadow">
                        <div className="font-mono text-sm">{v.name}</div>
                        <div className="text-sm">{v.label}</div>
                        {v.concept && (
                          <div className="text-xs text-gray-500">{v.concept}</div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

