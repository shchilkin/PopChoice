import { FC } from 'react';

import { SuggestionCard } from '../SuggestionCard';

export interface MovieRecommendation {
  id: number;
  name: string;
  year: number;
  similarity: number;
  age_rating?: string;
  duration?: number;
  score_rating?: number;
  posterURL?: string;
  description?: string;
  isMainRecommendation?: boolean;
}

interface MovieGridProps {
  movies: MovieRecommendation[];
  title: string;
}

export const MovieGrid: FC<MovieGridProps> = ({ movies, title }) => {
  if (movies.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-lg text-gray-600">No movies found to recommend.</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <h2 className="text-3xl font-bold mb-8 text-center">{title}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {movies.map((movie) => {
          // Create a description for each movie with details
          const description = [
            movie.year && `Released: ${movie.year}`,
            movie.age_rating && `Rating: ${movie.age_rating}`,
            movie.duration && `Duration: ${movie.duration} min`,
            movie.score_rating && `Score: ${movie.score_rating}/10`,
            movie.similarity && `Match: ${Math.round(movie.similarity * 100)}%`,
          ]
            .filter(Boolean)
            .join(' • ');

          return (
            <div key={movie.id} className="flex flex-col">
              <SuggestionCard
                title={movie.name}
                description={description}
                posterURL={movie.posterURL || ''}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
