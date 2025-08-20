'use client';

import NavBar from '../../components/NavBar';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <NavBar />
      <main className="flex-1 max-w-4xl mx-auto p-4 w-full">
        <h1 className="text-2xl font-bold mb-4">About</h1>
        <p className="text-gray-700">
          Neighborhood Explorer Proto helps you discover and explore local organizations
          making a difference in your community.
        </p>
      </main>
    </div>
  );
}