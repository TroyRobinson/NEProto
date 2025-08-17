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
}

interface RawVariable {
  label: string;
  concept?: string;
}

export default function CensusStatExplorer() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [datasetQuery, setDatasetQuery] = useState('');
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);
  const [variables, setVariables] = useState<Variable[]>([]);
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
            variablesLink: d.c_variablesLink as string,
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
        const res = await fetch(link);
        const json = await res.json();
        const vars: Variable[] = Object.entries(
          (json.variables as Record<string, RawVariable>) || {}
        ).map(([name, info]) => ({
          name,
          label: info.label,
          concept: info.concept,
        }));
        setVariables(vars);
      } catch (err) {
        console.error('Failed to load variables', err);
      } finally {
        setLoadingVars(false);
      }
    }
    loadVariables();
  }, [selectedDataset]);

  const filteredDatasets = datasets.filter((d) =>
    d.title.toLowerCase().includes(datasetQuery.toLowerCase())
  );

  const filteredVars = variables.filter((v) =>
    `${v.name} ${v.label} ${v.concept ?? ''}`
      .toLowerCase()
      .includes(varQuery.toLowerCase())
  );

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
            <ul className="space-y-2 max-h-[60vh] overflow-y-auto">
              {filteredVars.map((v) => (
                <li key={v.name} className="bg-white p-2 rounded shadow">
                  <div className="font-mono text-sm">{v.name}</div>
                  <div className="text-sm">{v.label}</div>
                  {v.concept && (
                    <div className="text-xs text-gray-500">{v.concept}</div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

