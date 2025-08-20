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
    <div 
      className="flex flex-row items-center justify-between flex-wrap content-center relative overflow-hidden shadow-sm border-b"
      style={{
        backgroundColor: 'var(--color-base-100)',
        paddingLeft: 'var(--spacing-10)', // 40px
        paddingRight: 'var(--spacing-10)', // 40px
        borderBottomColor: 'var(--color-base-300)'
      }}
    >
      <div 
        className="flex flex-row items-center justify-start shrink-0 relative"
        style={{ gap: 'var(--spacing-10)' }} // 40px
      >
        {/* Logo */}
        <div 
          className="text-left relative font-extrabold leading-none"
          style={{
            color: 'var(--color-base-content)',
            fontSize: 'var(--font-size-l)', // 24px
            letterSpacing: '0.05em',
            lineHeight: '1.2',
          }}
        >
          Neighborhood
          <br />
          Explorer Proto
        </div>

        {/* Menu Items */}
        <div className="flex flex-row items-center justify-start shrink-0 relative">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            const IconComponent = isActive ? item.iconSolid : item.icon;
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className="flex flex-row items-center justify-start shrink-0 relative overflow-hidden transition-colors"
                  style={{
                    paddingTop: 'var(--spacing-4)',
                    paddingBottom: 'var(--spacing-4)', 
                    paddingLeft: 'var(--spacing-6)', // 24px
                    paddingRight: 'var(--spacing-6)', // 24px
                    gap: 'var(--spacing-2)', // 8px
                    borderBottom: isActive ? `7px solid var(--color-secondary)` : 'none',
                    backgroundColor: isActive ? 'color-mix(in srgb, var(--color-secondary) 5%, transparent)' : 'transparent'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = 'var(--color-base-200)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                > 
                  <IconComponent 
                    className="shrink-0 w-3 h-3" 
                    style={{ 
                      color: isActive ? 'var(--color-accent)' : 'var(--color-base-content)' 
                    }} 
                  />
                  <div 
                    className="text-left relative font-semibold"
                    style={{
                      color: isActive ? 'var(--color-primary)' : 'var(--color-base-content)',
                      fontSize: 'var(--font-size-lg)', // 20px
                      letterSpacing: '0.05em'
                    }}
                  >
                    {item.label}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Right Side */}
      <div 
        className="flex flex-row items-center justify-start shrink-0 relative"
        style={{ gap: 'var(--spacing-3)' }} // 12px
      >
        {/* Metrics Dropdown */}
        {metrics.length > 0 && (
          <div 
            className="flex items-center"
            style={{ gap: 'var(--spacing-1)' }} // 4px
          >
            <MetricDropdown metrics={metrics} selected={selectedMetric} onSelect={selectMetric} />
            <button
              onClick={clearMetrics}
              className="border transition-colors"
              style={{
                paddingLeft: 'var(--spacing-2)', // 8px
                paddingRight: 'var(--spacing-2)', // 8px
                paddingTop: 'var(--spacing-1)', // 4px
                paddingBottom: 'var(--spacing-1)', // 4px
                borderRadius: 'var(--radius-field)', // 8px
                fontSize: 'var(--font-size-sm)', // 14px
                color: 'var(--color-error)',
                borderColor: 'var(--color-error)',
                backgroundColor: 'var(--color-base-100)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-error-50)';
                e.currentTarget.style.color = 'var(--color-error-600)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-base-100)';
                e.currentTarget.style.color = 'var(--color-error)';
              }}
              aria-label="Clear active stats"
            >
              ×
            </button>
          </div>
        )}

        {/* Add Button */}
        <button
          onClick={onAddOrganization}
          className="flex items-center justify-center shrink-0 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            width: 'var(--spacing-8)', // 32px
            height: 'var(--spacing-8)', // 32px
            borderRadius: '50%', // Make it perfectly circular
            backgroundColor: 'var(--color-neutral)',
            color: 'var(--color-neutral-content)',
            padding: 0, // Remove default padding
          }}
          onMouseEnter={(e) => {
            if (!e.currentTarget.disabled) {
              e.currentTarget.style.backgroundColor = 'var(--color-gray-700)';
            }
          }}
          onMouseLeave={(e) => {
            if (!e.currentTarget.disabled) {
              e.currentTarget.style.backgroundColor = 'var(--color-neutral)';
            }
          }}
          aria-label="Add Organization"
          disabled={!onAddOrganization}
        >
          <PlusIcon 
            className="w-3 h-3" // Smaller icon
            style={{ strokeWidth: 2 }} // Thicker lines
          />
        </button>

        {/* Profile Icon */}
        <UserCircleIcon 
          className="w-5 h-5 shrink-0" 
          style={{ color: 'var(--color-gray-600)' }}
        />
      </div>
    </div>
  );
}