"use client";

import React, { KeyboardEvent } from 'react';

interface SearchBarProps {
  value: string;
  onChange: (val: string) => void;
  onSubmit: () => void;
  onClear: () => void;
  showClear: boolean;
}

export default function SearchBar({ value, onChange, onSubmit, onClear, showClear }: SearchBarProps) {
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div className="relative w-full">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Search organizations..."
        className="px-3 py-2 border rounded shadow bg-white text-sm w-full focus:outline-none focus:ring"
      />
      {showClear && (
        <button
          onClick={onClear}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          ×
        </button>
      )}
    </div>
  );
}
