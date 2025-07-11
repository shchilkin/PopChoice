'use client';

import { Branding, Button } from '@/components';
import { SuggestionCard } from '@/components/SuggestionCard';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function MovieSuggestionPage() {
  const [recommendation, setRecommendation] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const rec = localStorage.getItem('popchoice_recommendation');
      setRecommendation(rec || 'No recommendation found.');
    }
  }, []);

  return (
    <div className="flex flex-col items-center justify-items-center min-h-screen p-4 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col w-full items-center max-w-md mx-auto">
        <Branding />
        <SuggestionCard title="Movie Recommendation" description={recommendation} />
        <Link href="/" passHref className="w-full">
          <Button
            className="w-full"
            onClick={() => {
              localStorage.removeItem('popchoice_recommendation');
            }}
          >
            Try again
          </Button>
        </Link>
      </main>
    </div>
  );
}
