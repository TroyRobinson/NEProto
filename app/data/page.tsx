import { fetchZctaMetric } from '../../lib/census';

export const dynamic = 'force-dynamic';

export default async function DataPage() {
  const features = await fetchZctaMetric('B19013_001E');
  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Median Household Income (ACS 2021 5-year)</h1>
      <table className="min-w-full text-sm border">
        <thead>
          <tr>
            <th className="border px-2 py-1 text-left">ZCTA</th>
            <th className="border px-2 py-1 text-left">Median Income</th>
          </tr>
        </thead>
        <tbody>
          {features.map((f) => (
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
