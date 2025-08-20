'use client';

interface Metric {
  id: string;
  label: string;
}

interface MetricDropdownProps {
  metrics: Metric[];
  selected: string | null;
  onSelect: (id: string) => void | Promise<void>;
}

export default function MetricDropdown({ metrics, selected, onSelect }: MetricDropdownProps) {
  if (metrics.length === 0) {
    return (
      <div 
        className="text-sm"
        style={{
          padding: 'var(--spacing-2)', // 8px
          fontSize: 'var(--font-size-sm)', // 14px
          color: 'var(--color-gray-600)'
        }}
      >
        No metrics selected.
      </div>
    );
  }
  return (
    <div
      className="relative"
      style={{ display: 'inline-block' }}
    >
      <select
        className="border transition-colors pr-8"
        style={{
          paddingTop: 'var(--spacing-2)',
          paddingBottom: 'var(--spacing-2)',
          paddingLeft: 'var(--spacing-4)',
          paddingRight: 'var(--spacing-10)', // extra right padding for chevron
          borderRadius: 'var(--radius-field)', // 8px
          backgroundColor: 'var(--color-base-100)',
          color: 'var(--color-base-content)',
          borderColor: 'var(--color-base-300)',
          fontSize: 'var(--font-size-sm)', // 14px
          appearance: 'none',
          WebkitAppearance: 'none',
          MozAppearance: 'none',
        }}
        value={selected ?? ''}
        onChange={(e) => onSelect(e.target.value)}
      >
        <option value="" disabled>
          Select metric
        </option>
        {metrics.map((m) => (
          <option key={m.id} value={m.id}>
            {m.label}
          </option>
        ))}
      </select>
      {/* Down chevron icon, with right padding */}
      <span
        className="pointer-events-none absolute inset-y-0 right-0 flex items-center"
        style={{ paddingRight: 'var(--spacing-3)' }}
      >
        <svg
          className="w-2 h-2 text-gray-400"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </span>
    </div>
  );
}
