"use client";

import React, { KeyboardEvent } from 'react';

interface SearchBarProps {
  value: string;
  onChange: (val: string) => void;
  onSubmit: () => void;
}

export default function SearchBar({ value, onChange, onSubmit }: SearchBarProps) {
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={handleKeyDown}
      placeholder="Search organizations..."
      className="px-3 py-2 border rounded shadow bg-white text-sm w-64 focus:outline-none focus:ring"
    />
  );
}
