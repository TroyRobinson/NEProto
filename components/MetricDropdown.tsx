'use client';

interface Metric {
  id: string;
  label: string;
}

interface MetricDropdownProps {
  metrics: Metric[];
}

export default function MetricDropdown({ metrics }: MetricDropdownProps) {
  if (metrics.length === 0) {
    return <div className="p-2 text-sm text-gray-600">No metrics selected.</div>;
  }
  return (
    <select className="p-2 border rounded">
      {metrics.map((m) => (
        <option key={m.id} value={m.id}>
          {m.label}
        </option>
      ))}
    </select>
  );
}
