'use client';

interface Metric {
  id: string;
  label: string;
}

interface MetricsTableProps {
  metrics: Metric[];
}

export default function MetricsTable({ metrics }: MetricsTableProps) {
  if (metrics.length === 0) {
    return null;
  }
  return (
    <table className="min-w-full text-sm border mt-4">
      <thead>
        <tr>
          <th className="border px-2 py-1 text-left">Metric ID</th>
          <th className="border px-2 py-1 text-left">Label</th>
        </tr>
      </thead>
      <tbody>
        {metrics.map((m) => (
          <tr key={m.id}>
            <td className="border px-2 py-1">{m.id}</td>
            <td className="border px-2 py-1">{m.label}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
