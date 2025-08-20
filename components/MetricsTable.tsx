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
    <table 
      className="min-w-full border"
      style={{
        fontSize: 'var(--font-size-sm)', // 14px
        borderColor: 'var(--color-base-300)',
        marginTop: 'var(--spacing-4)' // 16px
      }}
    >
      <thead>
        <tr style={{ backgroundColor: 'var(--color-base-200)' }}>
          <th 
            className="border text-left"
            style={{
              borderColor: 'var(--color-base-300)',
              padding: 'var(--spacing-2)', // 8px
              color: 'var(--color-base-content)',
              fontWeight: 600
            }}
          >
            Metric ID
          </th>
          <th 
            className="border text-left"
            style={{
              borderColor: 'var(--color-base-300)',
              padding: 'var(--spacing-2)', // 8px
              color: 'var(--color-base-content)',
              fontWeight: 600
            }}
          >
            Label
          </th>
        </tr>
      </thead>
      <tbody>
        {metrics.map((m) => (
          <tr key={m.id} style={{ backgroundColor: 'var(--color-base-100)' }}>
            <td 
              className="border"
              style={{
                borderColor: 'var(--color-base-300)',
                padding: 'var(--spacing-2)', // 8px
                color: 'var(--color-base-content)'
              }}
            >
              {m.id}
            </td>
            <td 
              className="border"
              style={{
                borderColor: 'var(--color-base-300)',
                padding: 'var(--spacing-2)', // 8px
                color: 'var(--color-base-content)'
              }}
            >
              {m.label}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
