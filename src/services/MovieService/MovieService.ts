import axios, { AxiosInstance } from 'axios';
import z from 'zod';

import logger from '@/lib/logger';

const POSTER_SIZES = ['w92', 'w154', 'w185', 'w342', 'w500', 'w780', 'original'] as const;

export const API_BASE_URL = 'https://api.themoviedb.org/3';
export const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

const posterSize = z.enum(POSTER_SIZES).default('original');

// TODO: Move to types after service is fully implemented
export const TMDB_MovieDetailsSchema = z.object({
  adult: z.boolean(),
  backdrop_path: z.string(),
  genre_ids: z.array(z.number()),
  id: z.number(),
  original_language: z.string(),
  original_title: z.string(),
  overview: z.string(),
  popularity: z.number(),
  poster_path: z.string(),
  release_date: z.string(),
  title: z.string(),
  video: z.boolean(),
  vote_average: z.number(),
  vote_count: z.number(),
});

export type TMDB_MovieEntry = z.infer<typeof TMDB_MovieDetailsSchema>;

// TODO: Move to types after service is fully implemented
type PosterSize = z.infer<typeof posterSize>;

export class MovieService {
  private axiosClient: AxiosInstance;
  private imageURLBase: string;
  private apiURLBase: string;

  constructor() {
    this.axiosClient = axios.create();
    this.imageURLBase = IMAGE_BASE_URL;
    this.apiURLBase = API_BASE_URL;
  }

  async getMovieByTitle(movieTitle: string): Promise<TMDB_MovieEntry | undefined> {
    // TODO: Implement getMovieByTitle

    const response = await this.axiosClient({
      method: 'GET',
      url: `${this.apiURLBase}/search/movie`,
      responseType: 'json',
      headers: {
        Authorization: `Bearer ${process.env.TMDB_API_KEY}`,
      },
      params: {
        query: movieTitle,
        language: 'en-US',
        include_adult: false,
      },
    })
      .then((response) => {
        const results = response.data.results;
        const filteredResults = results.filter((movie: TMDB_MovieEntry) => {
          return movie.title.toLowerCase() === movieTitle.toLowerCase();
        });
        if (filteredResults.length === 0) {
          logger.warn({ movieTitle }, 'No movie found with title');
          return undefined;
        }
        return filteredResults[0];
      })
      .catch((error) => {
        logger.error({ err: error, movieTitle }, 'Error fetching movie by title');
        throw new Error(`Failed to fetch movie by title: ${movieTitle}`);
      });
    return response;
  }

  async getLocalizedMovieInfo(
    movieId: number,
    language: string,
  ): Promise<{ title: string; poster_path: string | null } | undefined> {
    try {
      const response = await this.axiosClient({
        method: 'GET',
        url: `${this.apiURLBase}/movie/${movieId}`,
        responseType: 'json',
        headers: {
          Authorization: `Bearer ${process.env.TMDB_API_KEY}`,
        },
        params: { language },
      });
      return { title: response.data.title, poster_path: response.data.poster_path };
    } catch (error) {
      logger.warn({ movieId, err: error }, 'Failed to fetch localized movie info');
      return undefined;
    }
  }

  getPosterURL(posterPath: string, size: PosterSize): string {
    const { success, data: parsedSize } = posterSize.safeParse(size);
    if (!success) {
      throw new Error(`Invalid poster size: ${size}. Available sizes: ${POSTER_SIZES.join(', ')}`);
    }
    return `${this.imageURLBase}/${parsedSize}${posterPath}`;
  }
}
