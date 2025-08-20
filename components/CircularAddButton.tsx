'use client';

import React from 'react';

interface CircularAddButtonProps {
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  disabled?: boolean;
}

export default function CircularAddButton({ 
  onClick, 
  size = 'md', 
  className = '', 
  disabled = false 
}: CircularAddButtonProps) {
  // Using design system spacing for sizes - 8px units
  const sizes = {
    sm: { width: 'var(--spacing-10)', height: 'var(--spacing-10)' }, // 40px
    md: { width: 'var(--spacing-12)', height: 'var(--spacing-12)' }, // 48px
    lg: { width: 'var(--spacing-14)', height: 'var(--spacing-14)' }  // 56px
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        rounded-full 
        flex items-center justify-center
        transition-colors
        disabled:opacity-50 
        disabled:cursor-not-allowed
        shadow-lg hover:shadow-xl
        ${className}
      `}
      style={{
        width: sizes[size].width,
        height: sizes[size].height,
        backgroundColor: 'var(--color-primary)',
        color: 'var(--color-primary-content)',
        borderRadius: 'var(--radius-selector)' // 32px for full circle
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.backgroundColor = 'var(--color-primary-600)';
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          e.currentTarget.style.backgroundColor = 'var(--color-primary)';
        }
      }}
      onMouseDown={(e) => {
        if (!disabled) {
          e.currentTarget.style.backgroundColor = 'var(--color-primary-700)';
        }
      }}
      onMouseUp={(e) => {
        if (!disabled) {
          e.currentTarget.style.backgroundColor = 'var(--color-primary-600)';
        }
      }}
    >
      <svg
        className={iconSizes[size]}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 4v16m8-8H4"
        />
      </svg>
    </button>
  );
}