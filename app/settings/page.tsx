'use client';

import TopNav from '../../components/TopNav';
import { useSettings } from '../../components/SettingsContext';

export default function SettingsPage() {
  const { settings, updateSettings, dataStatus, refreshData } = useSettings();

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <TopNav linkHref="/" linkText="Map" />
      <main className="flex-1 max-w-xl mx-auto p-4 space-y-4 w-full">
        <h2 className="text-xl font-bold">Data Settings</h2>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Year</label>
          <input
            type="number"
            value={settings.year}
            onChange={(e) => updateSettings({ year: e.target.value })}
            className="border rounded p-2 w-full"
          />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">County</label>
          <input
            type="text"
            value={settings.county}
            onChange={(e) => updateSettings({ county: e.target.value })}
            className="border rounded p-2 w-full"
          />
        </div>
        <div className="border p-4 rounded bg-white space-y-2">
          <div>Variables loaded: {dataStatus.variablesLoaded ?? 'not loaded'}</div>
          <div>ZCTA polygons loaded: {dataStatus.polygonsLoaded ?? 'not loaded'}</div>
          <button
            onClick={refreshData}
            className="px-4 py-2 bg-blue-600 text-white rounded"
          >
            Refresh Data
          </button>
        </div>
      </main>
    </div>
  );
}

