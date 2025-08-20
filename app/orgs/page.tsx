'use client';

import NavBar from '../../components/NavBar';

export default function OrgsPage() {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <NavBar />
      <main className="flex-1 max-w-4xl mx-auto p-4 w-full">
        <h1 className="text-2xl font-bold mb-4">Organizations</h1>
        <p className="text-gray-700">Organization management coming soon...</p>
      </main>
    </div>
  );
}