'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

interface Sport {
  id: string;
  code: string | null;
  name: string;
  created_at: string | null;
}

export default function SportsPage() {
  const [sports, setSports] = useState<Sport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSports = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch('/api/sports?locale=pt');
        const data = await res.json();

        if (!res.ok || !data.success) {
          setError(data.error || 'Error loading sports');
          setLoading(false);
          return;
        }

        setSports(data.sports ?? []);
      } catch (err) {
        console.error('Error fetching sports:', err);
        setError('Network error while loading sports');
      } finally {
        setLoading(false);
      }
    };

    fetchSports();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <main className="flex-1 py-10">
        <div className="max-w-6xl mx-auto px-4">
          <header className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              Web3 Sports
            </h1>
            <p className="mt-2 text-sm text-gray-600 max-w-2xl">
              Explore the sports available in LEGACY. Each sport can have its
              own House of Sports, missions, rankings and on-chain rewards.
            </p>
          </header>

          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {loading ? (
            <p className="py-10 text-sm text-gray-500">Loading sports…</p>
          ) : sports.length === 0 ? (
            <p className="py-10 text-sm text-gray-500">
              No sports defined yet. Soon you&apos;ll see the list of supported
              disciplines here.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {sports.map((sport) => (
                <Link
                  key={sport.id}
                  href={`/sports/${sport.id}`}
                  className="group rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
                >
                  <h2 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600">
                    {sport.name}
                  </h2>
                  {sport.code && (
                    <p className="mt-1 text-xs uppercase tracking-wide text-gray-400">
                      {sport.code}
                    </p>
                  )}
                  <p className="mt-3 text-sm text-gray-600">
                    Enter the Web3 universe of {sport.name}. Discover Houses,
                    missions and XP paths designed for this discipline.
                  </p>
                  {sport.created_at && (
                    <p className="mt-3 text-[11px] text-gray-400">
                      Added on{' '}
                      {new Date(sport.created_at).toLocaleDateString('pt-PT')}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
