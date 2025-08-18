'use client';

import Link from 'next/link';
import CircularAddButton from './CircularAddButton';
import MetricDropdown from './MetricDropdown';
import { useMetrics } from './MetricContext';

interface TopNavProps {
  linkHref: string;
  linkText: string;
  onAddOrganization?: () => void;
}

export default function TopNav({ linkHref, linkText, onAddOrganization }: TopNavProps) {
  const { metrics, selectedMetric, selectMetric } = useMetrics();

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">OKC Non-Profit Map</h1>
          <p className="text-gray-600">Discover local organizations making a difference</p>
        </div>
        <div className="flex items-center gap-4">
          <Link href={linkHref} className="text-blue-600 underline text-sm">
            {linkText}
          </Link>
          <Link href="/logs" className="text-blue-600 underline text-sm">
            Logs
          </Link>
          {metrics.length > 0 && (
            <MetricDropdown metrics={metrics} selected={selectedMetric} onSelect={selectMetric} />
          )}
          {onAddOrganization && <CircularAddButton onClick={onAddOrganization} />}
        </div>
      </div>
    </header>
  );
}
