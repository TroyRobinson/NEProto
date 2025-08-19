'use client';

import type { ChangeEvent } from 'react';
import { useConfig } from './ConfigContext';

const DATASETS = [
  { value: 'acs/acs5', label: 'ACS 5-year', years: ['2023', '2022', '2021'] },
  { value: 'acs/acs1', label: 'ACS 1-year', years: ['2023', '2022', '2021'] },
  { value: 'dec/pl', label: 'Decennial 2020 PL', years: ['2020'] },
  { value: 'dec/sf1', label: 'Decennial 2010 SF1', years: ['2010'] },
  { value: 'ecnbasic', label: 'Economic Census 2017', years: ['2017'] },
];

export default function ConfigControls() {
  const { config, updateConfig } = useConfig();
  const datasetCfg =
    DATASETS.find((d) => d.value === config.dataset) ?? DATASETS[0];

  const onDatasetChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const dataset = e.target.value;
    const info = DATASETS.find((d) => d.value === dataset);
    const year = info?.years.includes(config.year) ? config.year : info?.years[0];
    updateConfig({ dataset, year });
  };

  return (
    <div className="grid grid-cols-2 gap-2 mb-2">
      <select
        className="border border-gray-300 rounded p-1 text-sm w-full"
        value={config.region}
        onChange={(e) => updateConfig({ region: e.target.value })}
      >
        <option value="Oklahoma County ZCTAs">Oklahoma County ZCTAs</option>
      </select>
      <select
        className="border border-gray-300 rounded p-1 text-sm w-full"
        value={config.year}
        onChange={(e) => updateConfig({ year: e.target.value })}
      >
        {datasetCfg.years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
      <select
        className="border border-gray-300 rounded p-1 text-sm w-full"
        value={config.dataset}
        onChange={onDatasetChange}
      >
        {DATASETS.map((d) => (
          <option key={d.value} value={d.value}>
            {d.label}
          </option>
        ))}
      </select>
      <select
        className="border border-gray-300 rounded p-1 text-sm w-full"
        value={config.geography}
        onChange={(e) => updateConfig({ geography: e.target.value })}
      >
        <option value="zip code tabulation area">ZIP/ZCTA</option>
      </select>
    </div>
  );
}
