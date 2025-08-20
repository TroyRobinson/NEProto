'use client';

import NavBar from '../../components/NavBar';
import { useMetrics } from '../../components/MetricContext';

export default function DataPage() {
  const { metrics, selectedMetric, zctaFeatures } = useMetrics();
  const selectedLabel = metrics.find(m => m.id === selectedMetric)?.label;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <NavBar />
      <main className="flex-1 max-w-4xl mx-auto p-4 w-full overflow-x-auto">
        <p className="text-gray-700 mb-4">add a metric to see on table and map</p>
        {selectedMetric && zctaFeatures ? (
          <table className="min-w-full text-sm border">
            <thead>
              <tr>
                <th className="border px-2 py-1 text-left">ZCTA</th>
                <th className="border px-2 py-1 text-left">{selectedLabel ?? selectedMetric}</th>
              </tr>
            </thead>
            <tbody>
              {zctaFeatures.map((f) => (
                <tr key={f.properties.ZCTA5CE10}>
                  <td className="border px-2 py-1">{f.properties.ZCTA5CE10}</td>
                  <td className="border px-2 py-1">{f.properties.value ?? 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="min-w-full text-sm border"></table>
        )}
      </main>
    </div>
  );
}
