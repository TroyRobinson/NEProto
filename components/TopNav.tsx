'use client';

import Link from 'next/link';
import CircularAddButton from './CircularAddButton';

interface TopNavProps {
  onAddClick?: () => void;
}

export default function TopNav({ onAddClick }: TopNavProps) {
  return (
    <header className="bg-background border-b shadow-sm">
      <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
        <div>
          <Link href="/" className="text-2xl font-bold text-foreground">
            OKC Non-Profit Map
          </Link>
          <p className="text-sm text-foreground/80">
            Discover local organizations making a difference
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/data" className="text-blue-600 hover:underline">
            Data
          </Link>
          <Link href="/stats" className="text-blue-600 hover:underline">
            Search stats
          </Link>
          {onAddClick && <CircularAddButton onClick={onAddClick} />}
        </div>
      </div>
    </header>
  );
}

