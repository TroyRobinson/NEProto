'use client';

import React, { useEffect, useState } from 'react';
import TopNav from '../../components/TopNav';

interface Dataset {
  title: string;
  variablesLink: string;
  geographyLink: string;
  hasZip?: boolean;
}

interface RawDataset {
  title?: string;
  c_variablesLink?: string;
  c_geographyLink?: string;
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
  const [zipOnly, setZipOnly] = useState(true);

  useEffect(() => {
    async function loadDatasets() {
      if (typeof window !== 'undefined') {
        try {
          const cached = localStorage.getItem('censusDatasetCache');
          if (cached) {
            setDatasets(JSON.parse(cached));
            return;
          }
        } catch {
          /* ignore */
        }
      }
      try {
        const res = await fetch('https://api.census.gov/data.json');
        const json = await res.json();
        const ds: Dataset[] = (json.dataset as RawDataset[] || [])
          .filter((d) => d.c_variablesLink && d.c_geographyLink)
          .map((d) => ({
            title: d.title || 'Untitled dataset',
            variablesLink: (d.c_variablesLink as string)
              .replace(/^http:/, 'https:')
              .replace(/\.html$/, '.json'),
            geographyLink: (d.c_geographyLink as string)
              .replace(/^http:/, 'https:')
              .replace(/\.html$/, '.json'),
            hasZip: undefined,
          }));
        setDatasets(ds);
      } catch (err) {
        console.error('Failed to load datasets', err);
      }
    }
    loadDatasets();
  }, []);

  useEffect(() => {
    // For datasets without hasZip information, fetch their geography definition once
    datasets.forEach((d) => {
      if (d.hasZip !== undefined) return;
      fetch(d.geographyLink)
        .then((res) => res.json())
        .then((geo) => {
          const hasZip = JSON.stringify(geo)
            .toLowerCase()
            .includes('zip code tabulation area');
          setDatasets((prev) =>
            prev.map((p) =>
              p.geographyLink === d.geographyLink ? { ...p, hasZip } : p
            )
          );
        })
        .catch(() => {
          /* ignore */
        });
    });
  }, [datasets]);

  // Persist dataset index and hasZip info to localStorage
  useEffect(() => {
    if (typeof window === 'undefined' || !datasets.length) return;
    try {
      localStorage.setItem('censusDatasetCache', JSON.stringify(datasets));
    } catch {
      /* ignore */
    }
  }, [datasets]);

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

  const filteredDatasets = datasets.filter(
    (d) =>
      d.title.toLowerCase().includes(datasetQuery.toLowerCase()) &&
      (!zipOnly || d.hasZip)
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
    if (selectedDataset.hasZip === false) {
      alert('This dataset does not provide ZIP code values.');
      return;
    }
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
    <div className="min-h-screen bg-background">
      <TopNav />
      <div className="p-4 text-foreground">
        <h1 className="text-2xl font-bold mb-4">Census Stat Explorer</h1>

        {!selectedDataset ? (
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4 mb-4">
              <input
                type="text"
                value={datasetQuery}
                onChange={(e) => setDatasetQuery(e.target.value)}
                placeholder="Search datasets..."
                className="border px-2 py-1 w-full max-w-md mb-2 sm:mb-0"
              />
              <label className="text-sm text-foreground/80 flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={zipOnly}
                  onChange={(e) => setZipOnly(e.target.checked)}
                />
                ZIP code datasets only
              </label>
            </div>
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
            {selectedDataset.hasZip === false && (
              <p className="mb-2 text-sm text-red-600">
                This dataset does not include ZIP code tabulation area data, so its
                variables cannot be mapped.
              </p>
            )}
            <p className="mb-2 text-sm text-foreground/80">
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
                <p className="text-sm text-foreground/80">
                  Metrics are numeric values you can map. Codes and identifiers are listed
                  under Other variables.
                </p>
                <div>
                  <h3 className="font-semibold mb-1">Metrics</h3>
                  <ul className="space-y-2">
                    {metricVars.map((v) => (
                      <li key={v.name} className="bg-background p-2 rounded shadow">
                        <div className="font-mono text-sm">{v.name}</div>
                        <div className="text-sm">{v.label}</div>
                        {v.concept && (
                          <div className="text-xs text-foreground/60">{v.concept}</div>
                        )}
                        <button
                          onClick={() => addMetric(v)}
                          disabled={selectedDataset?.hasZip === false}
                          className={`mt-1 text-xs underline ${
                            selectedDataset?.hasZip === false
                              ? 'text-foreground/40 cursor-not-allowed'
                              : 'text-blue-600'
                          }`}
                        >
                          Add to metrics
                        </button>
                      </li>
                    ))}
                    {metricVars.length === 0 && (
                      <li className="text-sm text-foreground/60">No metrics found</li>
                    )}
                  </ul>
                </div>
                {otherVars.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-1">Other variables</h3>
                    <ul className="space-y-2">
                      {otherVars.map((v) => (
                        <li key={v.name} className="bg-background p-2 rounded shadow">
                          <div className="font-mono text-sm">{v.name}</div>
                          <div className="text-sm">{v.label}</div>
                          {v.concept && (
                            <div className="text-xs text-foreground/60">{v.concept}</div>
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
    </div>
  );
}

