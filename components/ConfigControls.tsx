'use client';

import { useConfig } from './ConfigContext';

export default function ConfigControls() {
  const { config, updateConfig } = useConfig();

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
        <option value="2023">2023</option>
        <option value="2022">2022</option>
        <option value="2021">2021</option>
      </select>
      <select
        className="border border-gray-300 rounded p-1 text-sm w-full"
        value={config.dataset}
        onChange={(e) => {
          const ds = e.target.value;
          updateConfig({
            dataset: ds,
            geography: ds === 'zbp' ? 'zip code' : 'zip code tabulation area',
          });
        }}
      >
        <option value="acs/acs5">ACS 5-year</option>
        <option value="acs/acs1">ACS 1-year</option>
        <option value="dec/sf1">Decennial Census SF1</option>
        <option value="zbp">ZIP Business Patterns</option>
      </select>
      <select
        className="border border-gray-300 rounded p-1 text-sm w-full"
        value={config.geography}
        onChange={(e) => updateConfig({ geography: e.target.value })}
      >
        <option value="zip code tabulation area">ZIP/ZCTA</option>
        <option value="zip code">ZIP Code</option>
      </select>
    </div>
  );
}
