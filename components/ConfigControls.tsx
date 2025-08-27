'use client';

import { useEffect, useState } from 'react';
import { useConfig } from './ConfigContext';

export default function ConfigControls() {
  const { config, updateConfig } = useConfig();
  const [notice, setNotice] = useState<string | null>(null);

  // Ensure compatible dataset/geography and dataset/year combinations
  useEffect(() => {
    if (
      config.geography === 'zip code tabulation area' &&
      config.dataset === 'acs/acs1'
    ) {
      updateConfig({ dataset: 'acs/acs5' });
      setNotice('ACS 1-year is unavailable for ZCTAs. Switched to ACS 5-year.');
    } else if (config.dataset === 'dec/pl' && config.year !== '2020') {
      updateConfig({ year: '2020' });
      setNotice('Decennial PL data is only available for 2020. Year reset to 2020.');
    } else {
      setNotice(null);
    }
  }, [config.dataset, config.geography, config.year, updateConfig]);

  return (
    <div className="grid grid-cols-2 gap-2 mb-2">
      <select
        className="border border-gray-300 rounded p-1 text-sm w-full"
        value={config.region}
        onChange={(e) => updateConfig({ region: e.target.value })}
        title="Region: the area of interest (e.g., a county). Geography below controls the Census table level (e.g., ZCTAs)."
      >
        <option value="Oklahoma County">Oklahoma County</option>
      </select>
      <select
        className="border border-gray-300 rounded p-1 text-sm w-full"
        value={config.year}
        onChange={(e) => updateConfig({ year: e.target.value })}
      >
        {(
          config.dataset === 'dec/pl'
            ? ['2020']
            : ['2023', '2022', '2021']
        ).map((y) => {
          const end = Number(y);
          const start = end - 4;
          const label =
            config.dataset === 'acs/acs5' ? `${start}\u2013${end}` : y;
          return (
            <option key={y} value={y}>
              {label}
            </option>
          );
        })}
      </select>
      <select
        className="border border-gray-300 rounded p-1 text-sm w-full"
        value={config.dataset}
        onChange={(e) => updateConfig({ dataset: e.target.value })}
      >
        <option value="acs/acs5">ACS 5-year</option>
        <option value="acs/acs1">ACS 1-year</option>
        <option value="dec/pl">Decennial 2020 PL</option>
      </select>
      <select
        className="border border-gray-300 rounded p-1 text-sm w-full"
        value={config.geography}
        onChange={(e) => updateConfig({ geography: e.target.value })}
      >
        <option value="zip code tabulation area">ZIP/ZCTA</option>
      </select>

      {config.dataset === 'acs/acs5' && (
        <div className="col-span-2 text-xs text-gray-600">
          Using 5-year period estimates for ZIPs
          <span
            className="ml-1 inline-block cursor-help text-gray-500"
            title="ACS 5-year values pool 60 months of responses (e.g., 2019–2023) into one weighted estimate; not a simple average. Dollar figures are in the final year dollars."
          >
            (what’s this?)
          </span>
        </div>
      )}

      {config.dataset === 'dec/pl' && (
        <div className="col-span-2 text-xs text-gray-600">
          Using 2020 Decennial Census P.L. counts
        </div>
      )}

      {notice && (
        <div className="col-span-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
          {notice}
        </div>
      )}
    </div>
  );
}
