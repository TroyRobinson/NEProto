'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
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
  Bars3Icon,
  XMarkIcon,
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const menuItems = [
    { href: '/', label: 'Map', icon: MapIcon, iconSolid: MapIconSolid },
    { href: '/data', label: 'Data', icon: TableCellsIcon, iconSolid: TableCellsIconSolid },
    { href: '/stats', label: 'Stats', icon: ChartBarIcon, iconSolid: ChartBarIconSolid },
    { href: '/logs', label: 'Logs', icon: DocumentTextIcon, iconSolid: DocumentTextIconSolid },
    { href: '/orgs', label: 'Orgs', icon: UserGroupIcon, iconSolid: UserGroupIconSolid },
    { href: '/about', label: 'About', icon: QuestionMarkCircleIcon, iconSolid: QuestionMarkCircleIconSolid },
  ];

  return (
    <div>
      {/* Main Navigation Bar */}
      <div 
        className="flex flex-row items-center justify-between relative overflow-hidden shadow-sm border-b"
        style={{
          backgroundColor: 'var(--color-base-100)',
          paddingLeft: 'var(--spacing-10)', // 40px
          paddingRight: 'var(--spacing-10)', // 40px
          borderBottomColor: 'var(--color-base-300)',
          minHeight: '70px', // <-- Added minHeight for menu
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

          {/* Desktop Menu Items */}
          <div className="hidden lg:flex flex-row items-center justify-start shrink-0 relative">
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
          {/* Desktop Add Button */}
          <button
            onClick={onAddOrganization}
            className="hidden lg:flex items-center justify-center shrink-0 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

          {/* Desktop Profile Icon */}
          <UserCircleIcon 
            className="hidden lg:block w-5 h-5 shrink-0" 
            style={{ color: 'var(--color-gray-600)' }}
          />

          {/* Mobile Hamburger Menu */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden flex items-center justify-center transition-colors"
            style={{
              width: 'var(--spacing-8)', // 32px
              height: 'var(--spacing-8)', // 32px
              padding: 0,
              color: 'var(--color-base-content)'
            }}
            aria-label="Toggle mobile menu"
          >
            {isMobileMenuOpen ? (
              <XMarkIcon className="w-6 h-6" />
            ) : (
              <Bars3Icon className="w-6 h-6" />
            )}
          </button>
        </div>
      </div>

      {/* Secondary Metrics Bar */}
      {metrics.length > 0 && (
        <div 
          className="w-full border-b"
          style={{
            backgroundColor: 'var(--color-base-200)',
            paddingLeft: 'var(--spacing-10)',
            paddingRight: 'var(--spacing-10)',
            paddingTop: 'var(--spacing-2)',
            paddingBottom: 'var(--spacing-2)',
            borderBottomColor: 'var(--color-base-300)'
          }}
        >
          <div 
            className="flex items-center justify-start"
            style={{ gap: 'var(--spacing-2)' }}
          >
            <MetricDropdown metrics={metrics} selected={selectedMetric} onSelect={selectMetric} />
            <button
              onClick={clearMetrics}
              className="border transition-colors"
              style={{
                paddingLeft: 'var(--spacing-2)',
                paddingRight: 'var(--spacing-2)',
                paddingTop: 'var(--spacing-1)',
                paddingBottom: 'var(--spacing-1)',
                borderRadius: 'var(--radius-field)',
                fontSize: 'var(--font-size-sm)',
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
        </div>
      )}

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black bg-opacity-30" onClick={() => setIsMobileMenuOpen(false)}>
          <div 
            className="fixed top-0 right-0 h-full w-full sm:w-80 md:w-96 overflow-y-auto"
            style={{
              backgroundColor: 'var(--color-base-100)',
              paddingLeft: 'var(--spacing-6)',
              paddingRight: 'var(--spacing-6)',
              paddingBottom: 'var(--spacing-6)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button Row */}
            <div className="flex justify-end py-4">
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
                aria-label="Close mobile menu"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            
            {/* Menu Items */}
            <div className="space-y-1">
              {menuItems.map((item) => {
                const isActive = pathname === item.href;
                const IconComponent = isActive ? item.iconSolid : item.icon;
                return (
                  <Link key={item.href} href={item.href} onClick={() => setIsMobileMenuOpen(false)}>
                    <div
                      className="flex flex-row items-center transition-colors rounded"
                      style={{
                        paddingTop: 'var(--spacing-3)',
                        paddingBottom: 'var(--spacing-3)',
                        paddingLeft: 'var(--spacing-4)',
                        paddingRight: 'var(--spacing-4)',
                        gap: 'var(--spacing-3)',
                        backgroundColor: isActive ? 'color-mix(in srgb, var(--color-secondary) 10%, transparent)' : 'transparent'
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
                        className="shrink-0 w-5 h-5"
                        style={{ 
                          color: isActive ? 'var(--color-accent)' : 'var(--color-base-content)' 
                        }} 
                      />
                      <div 
                        className="text-left font-semibold"
                        style={{
                          color: isActive ? 'var(--color-primary)' : 'var(--color-base-content)',
                          fontSize: 'var(--font-size-lg)'
                        }}
                      >
                        {item.label}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Mobile Menu Actions */}
            <div className="mt-8 pt-6 border-t" style={{ borderTopColor: 'var(--color-base-300)' }}>
              {/* Add Organization */}
              <button
                onClick={() => {
                  onAddOrganization?.();
                  setIsMobileMenuOpen(false);
                }}
                className="flex items-center w-full transition-colors rounded disabled:opacity-50"
                style={{
                  paddingTop: 'var(--spacing-3)',
                  paddingBottom: 'var(--spacing-3)',
                  paddingLeft: 'var(--spacing-4)',
                  paddingRight: 'var(--spacing-4)',
                  gap: 'var(--spacing-3)',
                  color: 'var(--color-base-content)'
                }}
                onMouseEnter={(e) => {
                  if (!e.currentTarget.disabled) {
                    e.currentTarget.style.backgroundColor = 'var(--color-base-200)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!e.currentTarget.disabled) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
                disabled={!onAddOrganization}
              >
                <PlusIcon className="w-5 h-5" />
                <span className="font-semibold" style={{ fontSize: 'var(--font-size-lg)' }}>
                  Add Organization
                </span>
              </button>

              {/* Profile */}
              <div
                className="flex items-center w-full rounded"
                style={{
                  paddingTop: 'var(--spacing-3)',
                  paddingBottom: 'var(--spacing-3)',
                  paddingLeft: 'var(--spacing-4)',
                  paddingRight: 'var(--spacing-4)',
                  gap: 'var(--spacing-3)',
                  color: 'var(--color-gray-600)'
                }}
              >
                <UserCircleIcon className="w-5 h-5" />
                <span className="font-semibold" style={{ fontSize: 'var(--font-size-lg)' }}>
                  Profile
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}