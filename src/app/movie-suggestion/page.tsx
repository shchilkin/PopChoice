'use client';

import { Branding, Button } from '@/components';
import { SuggestionCard } from '@/components/SuggestionCard';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function MovieSuggestionPage() {
  const [title, setTitle] = useState('Movie Recommendation');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const rec = localStorage.getItem('popchoice_recommendation');
      if (rec) {
        try {
          const parsed = JSON.parse(rec);
          setTitle(parsed.title || 'Movie Recommendation');
          setDescription(parsed.description || 'No description found.');
        } catch {
          setTitle('Movie Recommendation');
          setDescription(rec);
        }
      } else {
        setTitle('Movie Recommendation');
        setDescription('No recommendation found.');
      }
    }
  }, []);

  return (
    <div className="flex flex-col items-center justify-items-center min-h-screen p-4 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col w-full items-center max-w-md mx-auto">
        <Branding />
        <SuggestionCard title={title} description={description} />
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
