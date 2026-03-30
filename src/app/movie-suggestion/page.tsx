'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

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
    aiDescription?: string; // Added AI-generated description
    isMainRecommendation?: boolean; // Mark main recommendation
  }[];
}

export default function MovieSuggestionPage() {
  const [similarMovies, setSimilarMovies] = useState<MovieRecommendation[]>([]);
  const [isLoadingPosters, setIsLoadingPosters] = useState(false);
  const [currentMovieIndex, setCurrentMovieIndex] = useState(0);
  const [showAllMovies, setShowAllMovies] = useState(false);

  // Get current movie to display
  const currentMovie = similarMovies[currentMovieIndex];
  const totalMovies = similarMovies.length;

  // Navigation functions
  const goToNextMovie = useCallback(() => {
    if (currentMovieIndex < totalMovies - 1) {
      setCurrentMovieIndex(currentMovieIndex + 1);
    }
  }, [currentMovieIndex, totalMovies]);

  const goToPreviousMovie = useCallback(() => {
    if (currentMovieIndex > 0) {
      setCurrentMovieIndex(currentMovieIndex - 1);
    }
  }, [currentMovieIndex]);

  const resetToFirstMovie = useCallback(() => {
    setCurrentMovieIndex(0);
  }, []);

  useEffect(() => {
    const recommendationRaw = localStorage.getItem('popchoice_recommendation');
    if (recommendationRaw) {
      try {
        const parsed: ApiResponse = JSON.parse(recommendationRaw);

        // Process similar movies if available (now includes all movies including main recommendation)
        if (parsed.similarMovies && parsed.similarMovies.length > 0) {
          setIsLoadingPosters(true);

          // Convert similar movies to our format (now includes all movies including main recommendation)
          const moviesWithPosters: MovieRecommendation[] = parsed.similarMovies.map((movie) => ({
            id: movie.id,
            name: movie.name,
            year: movie.year,
            similarity: movie.similarity,
            age_rating: movie.age_rating,
            duration: movie.duration,
            score_rating: movie.score_rating,
            posterURL: movie.posterURL, // Use poster from API response
            description: movie.aiDescription, // Use AI-generated description from API response
            isMainRecommendation: movie.isMainRecommendation, // Track main recommendation
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

  // Keyboard navigation (only in single movie mode)
  useEffect(() => {
    if (showAllMovies) return; // Don't handle keyboard when showing all movies

    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        goToPreviousMovie();
      } else if (event.key === 'ArrowRight') {
        goToNextMovie();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [currentMovieIndex, totalMovies, goToNextMovie, goToPreviousMovie, showAllMovies]); // Dependencies for the keyboard handler

  const allMovies = similarMovies; // Use similarMovies directly since API now returns all movies
  const hasRecommendations = allMovies.length > 0;

  return (
    <div className="flex flex-col items-center justify-items-center min-h-screen p-4 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col w-full items-center max-w-6xl mx-auto">
        <TopNavigation logoSize={60} minimizeMode={true} />

        {hasRecommendations && (
          <div className="w-full max-w-md mb-12">
            {isLoadingPosters && (
              <div className="text-center mb-4">
                <p className="text-lg">Loading movie recommendations...</p>
              </div>
            )}

            {/* Movie counter and navigation */}
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold mb-2">Your Movie Recommendations</h2>
              {!showAllMovies ? (
                <>
                  <p className="text-lg text-gray-600 mb-1">
                    Movie {currentMovieIndex + 1} of {totalMovies}
                  </p>
                  <p className="text-sm text-gray-500 mb-2">
                    Use arrow keys ← → or buttons to navigate
                  </p>
                  <button
                    onClick={() => setShowAllMovies(true)}
                    className="text-sm text-[var(--accent)] hover:text-[var(--accent)]/80 underline"
                  >
                    Show all {totalMovies} movies
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setShowAllMovies(false)}
                  className="text-sm text-[var(--accent)] hover:text-[var(--accent)]/80 underline mb-4"
                >
                  Show one at a time
                </button>
              )}
            </div>

            {/* Movies display */}
            {showAllMovies ? (
              /* Show all movies in a grid */
              <div className="w-full mb-6">
                <MovieGrid title="" movies={allMovies} />
              </div>
            ) : (
              /* Show current movie only */
              currentMovie && (
                <div className="mb-6">
                  <SuggestionCard
                    title={currentMovie.name}
                    description={
                      currentMovie.description ||
                      [
                        currentMovie.year && `Released: ${currentMovie.year}`,
                        currentMovie.age_rating && `Rating: ${currentMovie.age_rating}`,
                        currentMovie.duration && `Duration: ${currentMovie.duration} min`,
                        currentMovie.score_rating && `Score: ${currentMovie.score_rating}/10`,
                        currentMovie.similarity &&
                          `Match: ${Math.round(currentMovie.similarity * 100)}%`,
                      ]
                        .filter(Boolean)
                        .join(' • ')
                    }
                    posterURL={currentMovie.posterURL || ''}
                  />
                </div>
              )
            )}

            {/* Navigation buttons - only show in single movie mode */}
            {!showAllMovies && (
              <>
                <div className="flex gap-4 justify-center mb-4">
                  <Button
                    onClick={goToPreviousMovie}
                    disabled={currentMovieIndex === 0}
                    className={`px-6 py-2 ${
                      currentMovieIndex === 0
                        ? 'opacity-50 cursor-not-allowed'
                        : 'hover:bg-gray-100'
                    }`}
                  >
                    Previous Movie
                  </Button>

                  <Button
                    onClick={goToNextMovie}
                    disabled={currentMovieIndex >= totalMovies - 1}
                    className={`px-6 py-2 ${
                      currentMovieIndex >= totalMovies - 1
                        ? 'opacity-50 cursor-not-allowed'
                        : 'hover:bg-gray-100'
                    }`}
                  >
                    Next Movie
                  </Button>
                </div>

                {/* Progress indicator dots */}
                {totalMovies > 1 && (
                  <div className="flex justify-center gap-2">
                    {Array.from({ length: totalMovies }, (_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentMovieIndex(index)}
                        className={`w-3 h-3 rounded-full transition-colors ${
                          index === currentMovieIndex
                            ? 'bg-[var(--accent)]'
                            : 'bg-gray-300 hover:bg-gray-400'
                        }`}
                        aria-label={`Go to movie ${index + 1}`}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {!hasRecommendations && (
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
              resetToFirstMovie();
              setShowAllMovies(false);
            }}
          >
            Try again
          </Button>
        </Link>
      </main>
    </div>
  );
}
