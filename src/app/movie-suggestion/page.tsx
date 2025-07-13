'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components';
import { SuggestionCard } from '@/components/SuggestionCard';
import Link from 'next/link';

export default function MovieSuggestionPage() {
  const [recommendation, setRecommendation] = useState({
    title: '',
    description: '',
    posterURL: '',
  });

  useEffect(() => {
    const recommendationRaw = localStorage.getItem('popchoice_recommendation');
    if (recommendationRaw) {
      try {
        const parsed = JSON.parse(recommendationRaw);
        setRecommendation({
          title: parsed.title || '',
          description: parsed.description || '',
          posterURL: parsed.posterURL || '',
        });
      } catch (e) {
        console.error('Failed to parse recommendation:', e);
      }
    }
  }, []);

  return (
    <div className="flex flex-col items-center justify-items-center min-h-screen p-4 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col w-full items-center max-w-md mx-auto">
        {/* TODO: Make smaller branding for content pages */}
        {/* <Branding /> */}
        <SuggestionCard
          title={recommendation.title}
          description={recommendation.description}
          posterURL={recommendation.posterURL}
        />
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
