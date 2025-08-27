'use client';

import { useMemo } from 'react';
import { useConfig } from './ConfigContext';

export default function CityDropdown() {
  const { config, updateConfig } = useConfig();

  const options = useMemo(
    () => [
      { value: 'Oklahoma County', label: 'OKC' },
      { value: 'Tulsa County', label: 'Tulsa' },
      { value: 'Wichita', label: 'Wichita' },
    ],
    []
  );

  return (
    <div className="relative" style={{ display: 'inline-block' }}>
      <select
        className="border transition-colors pr-8"
        style={{
          paddingTop: 'var(--spacing-2)',
          paddingBottom: 'var(--spacing-2)',
          paddingLeft: 'var(--spacing-4)',
          paddingRight: 'var(--spacing-10)',
          borderRadius: 'var(--radius-field)',
          backgroundColor: 'var(--color-base-100)',
          color: 'var(--color-base-content)',
          borderColor: 'var(--color-base-300)',
          fontSize: 'var(--font-size-sm)',
          appearance: 'none',
          WebkitAppearance: 'none',
          MozAppearance: 'none',
        }}
        value={config.region}
        onChange={(e) => updateConfig({ region: e.target.value })}
        title="Select city"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <span
        className="pointer-events-none absolute inset-y-0 right-0 flex items-center"
        style={{ paddingRight: 'var(--spacing-3)' }}
      >
        <svg className="w-2 h-2 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </span>
    </div>
  );
}
