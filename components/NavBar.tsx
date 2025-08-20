'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMetrics } from './MetricContext';
import MetricDropdown from './MetricDropdown';
import {
  MapIcon,
  ChartBarIcon,
  TableCellsIcon,
  DocumentTextIcon,
  UserGroupIcon,
  QuestionMarkCircleIcon,
  PlusIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';
import {
  MapIcon as MapIconSolid,
  ChartBarIcon as ChartBarIconSolid,
  TableCellsIcon as TableCellsIconSolid,
  DocumentTextIcon as DocumentTextIconSolid,
  UserGroupIcon as UserGroupIconSolid,
  QuestionMarkCircleIcon as QuestionMarkCircleIconSolid,
} from '@heroicons/react/24/solid';

interface NavBarProps {
  onAddOrganization?: () => void;
}

export default function NavBar({ onAddOrganization }: NavBarProps) {
  const pathname = usePathname();
  const { metrics, selectedMetric, selectMetric, clearMetrics } = useMetrics();

  const menuItems = [
    { href: '/', label: 'Map', icon: MapIcon, iconSolid: MapIconSolid },
    { href: '/data', label: 'Data', icon: TableCellsIcon, iconSolid: TableCellsIconSolid },
    { href: '/stats', label: 'Stats', icon: ChartBarIcon, iconSolid: ChartBarIconSolid },
    { href: '/logs', label: 'Logs', icon: DocumentTextIcon, iconSolid: DocumentTextIconSolid },
    { href: '/orgs', label: 'Orgs', icon: UserGroupIcon, iconSolid: UserGroupIconSolid },
    { href: '/about', label: 'About', icon: QuestionMarkCircleIcon, iconSolid: QuestionMarkCircleIconSolid },
  ];

  return (
    <div className="bg-white pr-8 pl-8 flex flex-row gap-y-0 items-center justify-between flex-wrap content-center relative overflow-hidden shadow-sm border-b">
      <div className="flex flex-row gap-10 items-center justify-start shrink-0 relative">
        {/* Logo */}
        <div className="text-black text-left relative font-extrabold text-[22px] tracking-wider leading-none">
          Neighborhood
          <br />
          Explorer Proto
        </div>

        {/* Menu Items */}
        <div className="flex flex-row gap-0 items-center justify-start shrink-0 relative">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            const IconComponent = isActive ? item.iconSolid : item.icon;
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className="pt-10 pr-6 pb-10 pl-6 flex flex-row gap-[9px] items-center justify-start shrink-0 relative overflow-hidden hover:bg-gray-50 transition-colors"
                  style={isActive ? { borderBottom: '7px solid var(--color-blue-accent-faded)' } : {}}
                >
                  <IconComponent className={`shrink-0 w-6 h-6`} style={isActive ? { color: 'var(--color-blue-accent-dark)' } : {}} />
                  <div className="text-black text-left relative font-semibold text-[20px] tracking-wider">
                    {item.label}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Right Side */}
      <div className="flex flex-row gap-3 items-center justify-start shrink-0 relative">
        {/* Metrics Dropdown */}
        {metrics.length > 0 && (
          <div className="flex items-center gap-1">
            <MetricDropdown metrics={metrics} selected={selectedMetric} onSelect={selectMetric} />
            <button
              onClick={clearMetrics}
              className="px-2 py-1 border rounded text-sm text-gray-600 hover:bg-gray-50"
              aria-label="Clear active stats"
            >
              ×
            </button>
          </div>
        )}

        {/* Add Button */}
        <button
          onClick={onAddOrganization}
          className="rounded-[31px] flex flex-row gap-3.5 items-center justify-center shrink-0 w-[38px] h-[39px] bg-gray-800 text-white hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Add Organization"
          disabled={!onAddOrganization}
        >
          <PlusIcon className="w-5 h-5" />
        </button>

        {/* Profile Button */}
        <div className="shrink-0 w-[51px] h-[51px] relative overflow-visible">
          <div className="w-[51px] h-[51px] bg-gray-300 rounded-full flex items-center justify-center hover:bg-gray-400 transition-colors cursor-pointer">
            <UserCircleIcon className="w-8 h-8 text-gray-600" />
          </div>
        </div>
      </div>
    </div>
  );
}