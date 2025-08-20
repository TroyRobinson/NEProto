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
    <select
      className="border transition-colors"
      style={{
        padding: 'var(--spacing-2)', // 8px
        borderRadius: 'var(--radius-field)', // 8px
        backgroundColor: 'var(--color-base-100)',
        color: 'var(--color-base-content)',
        borderColor: 'var(--color-base-300)',
        fontSize: 'var(--font-size-sm)' // 14px
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
  );
}
