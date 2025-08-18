'use client';

interface Metric {
  id: string;
  label: string;
}

interface MetricDropdownProps {
  metrics: Metric[];
  selected: string | null;
  onSelect: (id: string) => void;
}

export default function MetricDropdown({ metrics, selected, onSelect }: MetricDropdownProps) {
  if (metrics.length === 0) {
    return <div className="p-2 text-sm text-gray-600">No metrics selected.</div>;
  }
  return (
    <select
      className="p-2 border rounded"
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
