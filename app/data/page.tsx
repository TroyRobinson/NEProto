'use client';

import MetricDropdown from '../../components/MetricDropdown';
import { useMetrics } from '../../components/MetricsContext';

export default function DataPage() {
  const { metrics, selectedMetric, zctaFeatures, selectMetric } = useMetrics();
  const selected = metrics.find(m => m.id === selectedMetric);

  return (
    <div className="max-w-4xl mx-auto p-4">
      {metrics.length > 0 && (
        <div className="mb-4">
          <MetricDropdown metrics={metrics} selected={selectedMetric} onSelect={selectMetric} />
        </div>
      )}
      {selected ? (
        <h1 className="text-2xl font-bold mb-4">{selected.label}</h1>
      ) : (
        <p className="text-gray-700 mb-4">add a metric to see on table and map</p>
      )}
      <table className="min-w-full text-sm border">
        <thead>
          <tr>
            <th className="border px-2 py-1 text-left">ZCTA</th>
            <th className="border px-2 py-1 text-left">Value</th>
          </tr>
        </thead>
        <tbody>
          {zctaFeatures?.map(f => (
            <tr key={f.properties.ZCTA5CE10}>
              <td className="border px-2 py-1">{f.properties.ZCTA5CE10}</td>
              <td className="border px-2 py-1">{f.properties.value ?? 'N/A'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

