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
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12', 
    lg: 'w-16 h-16'
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
        ${sizeClasses[size]}
        bg-gray-900 text-white 
        rounded-full 
        flex items-center justify-center
        hover:bg-gray-800 
        active:bg-gray-700
        transition-colors
        disabled:opacity-50 
        disabled:cursor-not-allowed
        shadow-lg hover:shadow-xl
        ${className}
      `}
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