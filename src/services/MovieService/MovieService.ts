import z from 'zod';
import axios, { AxiosInstance } from 'axios';

const POSTER_SIZES = ['w92', 'w154', 'w185', 'w342', 'w500', 'w780', 'original'] as const;

export const API_BASE_URL = 'https://api.themoviedb.org/3';

const posterSize = z.enum(POSTER_SIZES).default('original');

// TODO: Move to types after service is fully implemented
export type TMDB_MovieEntry = {
  adult: boolean;
  backdrop_path: string;
  genre_ids: number[];
  id: number;
  original_language: string;
  original_title: string;
  overview: string;
  popularity: number;
  poster_path: string;
  release_date: string;
  title: string;
  video: boolean;
  vote_average: number;
  vote_count: number;
};

// TODO: Move to types after service is fully implemented
type PosterSize = z.infer<typeof posterSize>;

export default class MovieService {
  private axiosClient: AxiosInstance;
  private imageURLBase: string;
  private apiURLBase: string;

  constructor() {
    this.axiosClient = axios.create();
    this.imageURLBase = 'https://image.tmdb.org/t/p';
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
          console.warn(`No movie found with title: ${movieTitle}`);
          return undefined;
        }
        return filteredResults[0];
      })
      .catch((error) => {
        console.error('Error fetching movie by title:', error);
        throw new Error(`Failed to fetch movie by title: ${movieTitle}`);
      });
    return response;
  }

  getPosterURL(posterPath: string, size: PosterSize): string {
    const { success, data: parsedSize } = posterSize.safeParse(size);
    if (!success) {
      throw new Error(`Invalid poster size: ${size}. Available sizes: ${POSTER_SIZES.join(', ')}`);
    }
    return `${this.imageURLBase}/${parsedSize}${posterPath}`;
  }
}
