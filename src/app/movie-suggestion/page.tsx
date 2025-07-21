'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { Button, MovieGrid, TopNavigation } from '@/components';
import { SuggestionCard } from '@/components/SuggestionCard';
import { enhanceMoviesWithPosters, type MovieRecommendation } from '@/utils/client';

interface ApiResponse {
  title: string;
  description: string;
  posterURL?: string;
  movieDetails?: {
    year: number;
    age_rating?: string;
    duration?: number;
    score_rating?: number;
    similarity: number;
  };
  similarMovies?: {
    id: number;
    name: string;
    year: number;
    similarity: number;
    age_rating?: string;
    duration?: number;
    score_rating?: number;
    posterURL?: string; // Added poster URL support
  }[];
}

export default function MovieSuggestionPage() {
  const [recommendation, setRecommendation] = useState({
    title: '',
    description: '',
    posterURL: '',
  });
  const [similarMovies, setSimilarMovies] = useState<MovieRecommendation[]>([]);
  const [isLoadingPosters, setIsLoadingPosters] = useState(false);

  useEffect(() => {
    const recommendationRaw = localStorage.getItem('popchoice_recommendation');
    if (recommendationRaw) {
      try {
        const parsed: ApiResponse = JSON.parse(recommendationRaw);

        // Set main recommendation
        setRecommendation({
          title: parsed.title || '',
          description: parsed.description || '',
          posterURL: parsed.posterURL || '',
        });

        // Process similar movies if available
        if (parsed.similarMovies && parsed.similarMovies.length > 0) {
          setIsLoadingPosters(true);

          // Convert similar movies to our format (now includes poster URLs from API)
          const moviesWithPosters: MovieRecommendation[] = parsed.similarMovies.map((movie) => ({
            id: movie.id,
            name: movie.name,
            year: movie.year,
            similarity: movie.similarity,
            age_rating: movie.age_rating,
            duration: movie.duration,
            score_rating: movie.score_rating,
            posterURL: movie.posterURL, // Use poster from API response
          }));

          // Check if we need client-side enhancement for movies without posters
          const moviesNeedingPosters = moviesWithPosters.filter((movie) => !movie.posterURL);

          if (moviesNeedingPosters.length > 0) {
            // eslint-disable-next-line no-console
            console.log(`${moviesNeedingPosters.length} movies need poster enhancement`);

            // Enhance missing posters with TMDB API key from environment
            const tmdbApiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY;
            enhanceMoviesWithPosters(moviesNeedingPosters, tmdbApiKey)
              .then((enhancedMissingMovies) => {
                // Merge enhanced movies back with the original list
                const finalMovies = moviesWithPosters.map((movie) => {
                  const enhanced = enhancedMissingMovies.find((em) => em.id === movie.id);
                  return enhanced || movie;
                });
                setSimilarMovies(finalMovies);
              })
              .catch((error) => {
                // eslint-disable-next-line no-console
                console.error('Failed to enhance movies with posters:', error);
                setSimilarMovies(moviesWithPosters); // Use API response as-is
              })
              .finally(() => {
                setIsLoadingPosters(false);
              });
          } else {
            // All movies already have posters from the API
            setSimilarMovies(moviesWithPosters);
            setIsLoadingPosters(false);
          }
        }
      } catch (e) {
        // TODO: Implement better error handling
        // eslint-disable-next-line no-console
        console.error('Failed to parse recommendation:', e);
      }
    }
  }, []);

  const hasMainRecommendation = recommendation.title || recommendation.description;
  const hasSimilarMovies = similarMovies.length > 0;

  return (
    <div className="flex flex-col items-center justify-items-center min-h-screen p-4 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col w-full items-center max-w-6xl mx-auto">
        <TopNavigation
          // firstStripeColor={currentPersonColors.first}
          // secondStripeColor={currentPersonColors.second}
          logoSize={60}
        />

        {hasMainRecommendation && (
          <div className="w-full max-w-md mb-12">
            <h2 className="text-2xl font-bold mb-6 text-center">Your Perfect Match</h2>
            <SuggestionCard
              title={recommendation.title}
              description={recommendation.description}
              posterURL={recommendation.posterURL}
            />
          </div>
        )}

        {hasSimilarMovies && (
          <div className="w-full mb-12">
            {isLoadingPosters && (
              <div className="text-center mb-4">
                <p className="text-lg">Loading movie posters...</p>
              </div>
            )}
            <MovieGrid title="More Movies You Might Like" movies={similarMovies} />
          </div>
        )}

        {!hasMainRecommendation && !hasSimilarMovies && (
          <div className="text-center py-8">
            <p className="text-lg text-gray-600 mb-4">
              No recommendations available. Please try taking the questionnaire again.
            </p>
          </div>
        )}

        <Link href="/" passHref className="w-full max-w-md">
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
