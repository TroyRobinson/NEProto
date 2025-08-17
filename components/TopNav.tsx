import Link from 'next/link';

export default function TopNav() {
  return (
    <nav className="flex items-center gap-4">
      <Link href="/" className="text-blue-600 hover:underline">Map</Link>
      <Link href="/data" className="text-blue-600 hover:underline">Data</Link>
      <Link href="/datasets" className="text-blue-600 hover:underline">Datasets</Link>
      <Link href="/admin/settings" className="text-blue-600 hover:underline">Settings</Link>
    </nav>
  );
}
