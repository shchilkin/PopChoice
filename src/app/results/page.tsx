'use client';

import {
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  Clock,
  RotateCcw,
  Sparkles,
  Star,
  Users,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import { usePCTheme } from '@/hooks/usePCTheme';
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
    posterURL?: string;
    aiDescription?: string;
    isMainRecommendation?: boolean;
  }[];
}

function StarRating({ score }: { score: number }) {
  const stars = 5;
  const filled = Math.round((score / 10) * stars);
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: stars }).map((_, i) => (
        <Star
          key={i}
          size={12}
          fill={i < filled ? '#F5C518' : 'none'}
          stroke={i < filled ? '#F5C518' : 'var(--pc-t4)'}
        />
      ))}
    </div>
  );
}

function SimilarityBadge({ similarity }: { similarity: number }) {
  const pct = Math.round(similarity * 100);
  const color = pct >= 95 ? '#14B8A6' : pct >= 90 ? '#F5C518' : pct >= 85 ? '#FF9F1C' : '#8B5CF6';
  return (
    <div
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs"
      style={{
        background: `${color}18`,
        border: `1px solid ${color}35`,
        color,
      }}
    >
      <Sparkles size={10} />
      {pct}% match
    </div>
  );
}

function GenrePill({ genre }: { genre: string }) {
  return (
    <span
      className="px-2.5 py-1 rounded-full text-xs"
      style={{
        background: 'var(--pc-bd1)',
        border: '1px solid var(--pc-bd2)',
        color: 'var(--pc-t2)',
      }}
    >
      {genre}
    </span>
  );
}

function MainMovieCard({ movie }: { movie: MovieRecommendation }) {
  const { isDark } = usePCTheme();
  const [imgLoaded, setImgLoaded] = useState(false);
  const score = movie.score_rating ?? 0;
  const pct = Math.round(movie.similarity * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.1 }}
      className="relative overflow-hidden rounded-3xl"
      style={{
        background: 'var(--pc-surface)',
        border: '1px solid var(--pc-bd2)',
        boxShadow: 'var(--pc-card-shadow)',
      }}
    >
      {movie.posterURL && (
        <div className="relative h-72 md:h-96 overflow-hidden">
          <div
            className="absolute inset-0 transition-opacity duration-700"
            style={{
              opacity: imgLoaded ? 0 : 1,
              background: 'var(--pc-surface-deep)',
            }}
          />
          <img
            src={movie.posterURL}
            alt={movie.name}
            className="w-full h-full object-cover transition-opacity duration-700"
            style={{ opacity: imgLoaded ? 1 : 0 }}
            onLoad={() => setImgLoaded(true)}
          />
          <div
            className="absolute inset-0"
            style={{
              background: isDark
                ? 'linear-gradient(to bottom, rgba(9,9,15,0.2) 0%, rgba(9,9,15,0.7) 60%, #13131F 100%)'
                : 'linear-gradient(to bottom, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.6) 60%, #FFFFFF 100%)',
            }}
          />

          {/* Match badge */}
          <div className="absolute top-4 right-4">
            <SimilarityBadge similarity={movie.similarity} />
          </div>

          {/* AI pick label */}
          <div className="absolute top-4 left-4">
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs"
              style={{
                background: isDark ? 'rgba(9,9,15,0.8)' : 'rgba(255,255,255,0.85)',
                border: '1px solid rgba(245,197,24,0.25)',
                color: 'var(--pc-gold)',
                backdropFilter: 'blur(8px)',
              }}
            >
              <Sparkles size={10} />
              AI Pick
            </div>
          </div>

          {/* Title overlay */}
          <div className="absolute bottom-6 left-6 right-6">
            <h2
              className="mb-1"
              style={{
                fontFamily: "var(--font-bebas-neue), 'Bebas Neue', sans-serif",
                fontSize: 'clamp(1.8rem, 5vw, 3rem)',
                letterSpacing: '0.04em',
                color: isDark ? '#FFFFFF' : '#0D0D1A',
                lineHeight: 1,
                textShadow: isDark
                  ? '0 2px 20px rgba(0,0,0,0.8)'
                  : '0 1px 8px rgba(255,255,255,0.8)',
              }}
            >
              {movie.name}
            </h2>
            <div
              className="flex items-center gap-3 flex-wrap"
              style={{ color: 'var(--pc-t2)', fontSize: '0.82rem' }}
            >
              <span>{movie.year}</span>
              {movie.age_rating && (
                <>
                  <span>·</span>
                  <span
                    className="px-1.5 py-0.5 rounded"
                    style={{
                      border: '1px solid var(--pc-bd3)',
                      color: 'var(--pc-t2)',
                    }}
                  >
                    {movie.age_rating}
                  </span>
                </>
              )}
              {movie.duration && (
                <>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <Clock size={11} />
                    {movie.duration} min
                  </span>
                </>
              )}
              {score > 0 && (
                <>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <Star size={11} fill="#F5C518" stroke="none" />
                    <span style={{ color: 'var(--pc-gold)' }}>{score}</span>/10
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="p-6 pt-4">
        {!movie.posterURL && (
          <div className="mb-4">
            <h2
              style={{
                fontFamily: "var(--font-bebas-neue), 'Bebas Neue', sans-serif",
                fontSize: '2rem',
                letterSpacing: '0.04em',
                color: 'var(--pc-t1)',
              }}
            >
              {movie.name}
            </h2>
            <div
              className="flex items-center gap-3 flex-wrap mt-1"
              style={{ color: 'var(--pc-t2)', fontSize: '0.82rem' }}
            >
              <span>{movie.year}</span>
              {movie.age_rating && (
                <>
                  <span>·</span>
                  <span>{movie.age_rating}</span>
                </>
              )}
              {movie.duration && (
                <>
                  <span>·</span>
                  <span>{movie.duration} min</span>
                </>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Clapperboard size={13} style={{ color: 'var(--pc-t3)' }} />
            <span style={{ color: 'var(--pc-t3)', fontSize: '0.82rem' }}>
              {movie.year} · {pct}% match
            </span>
          </div>
          {movie.age_rating && <GenrePill genre={movie.age_rating} />}
        </div>

        {score > 0 && (
          <div className="flex items-center gap-2 mb-4">
            <StarRating score={score} />
            <span style={{ color: 'var(--pc-t3)', fontSize: '0.78rem' }}>{score}/10</span>
          </div>
        )}

        {/* AI description */}
        {movie.description && (
          <div
            className="p-4 rounded-2xl"
            style={{
              background: isDark ? 'rgba(245,197,24,0.05)' : 'rgba(196,149,10,0.05)',
              border: '1px solid',
              borderColor: isDark ? 'rgba(245,197,24,0.1)' : 'rgba(196,149,10,0.15)',
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={12} style={{ color: 'var(--pc-gold)' }} />
              <span
                className="uppercase tracking-widest"
                style={{ color: 'var(--pc-gold)', fontSize: '0.65rem' }}
              >
                Why this film for you
              </span>
            </div>
            <p
              style={{
                color: 'var(--pc-t2)',
                fontSize: '0.88rem',
                lineHeight: 1.75,
              }}
            >
              {movie.description}
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function SmallSuggestionCard({
  movie,
  active,
  onClick,
}: {
  movie: MovieRecommendation;
  active: boolean;
  onClick: () => void;
}) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const score = movie.score_rating ?? 0;
  const pct = Math.round(movie.similarity * 100);

  return (
    <motion.div
      layout
      onClick={onClick}
      className="relative overflow-hidden rounded-2xl cursor-pointer transition-all duration-300"
      style={{
        background: 'var(--pc-surface)',
        border: active ? '1.5px solid rgba(245,197,24,0.4)' : '1px solid var(--pc-bd2)',
        boxShadow: active ? '0 0 30px rgba(245,197,24,0.1)' : 'none',
        minWidth: '220px',
        maxWidth: '260px',
        flex: '0 0 auto',
      }}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.97 }}
    >
      <div className="relative h-36 overflow-hidden">
        {movie.posterURL ? (
          <>
            <div
              className="absolute inset-0"
              style={{
                background: 'var(--pc-surface-deep)',
                opacity: imgLoaded ? 0 : 1,
              }}
            />
            <img
              src={movie.posterURL}
              alt={movie.name}
              className="w-full h-full object-cover"
              onLoad={() => setImgLoaded(true)}
              style={{ opacity: imgLoaded ? 1 : 0, transition: 'opacity 0.4s' }}
            />
          </>
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-3xl"
            style={{ background: 'var(--pc-surface-deep)' }}
          >
            🎬
          </div>
        )}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(to bottom, transparent 40%, var(--pc-surface) 100%)',
          }}
        />
        <div className="absolute top-2 right-2">
          <div
            className="text-xs px-2 py-0.5 rounded-full"
            style={{
              background: 'rgba(9,9,15,0.85)',
              border: '1px solid rgba(245,197,24,0.2)',
              color: '#F5C518',
              backdropFilter: 'blur(6px)',
            }}
          >
            {pct}%
          </div>
        </div>
      </div>

      <div className="p-3.5">
        <h4
          className="mb-1 truncate"
          style={{ color: 'var(--pc-t1)', fontWeight: 600, fontSize: '0.9rem' }}
        >
          {movie.name}
        </h4>
        <div
          className="flex items-center gap-2 mb-2 flex-wrap"
          style={{ color: 'var(--pc-t3)', fontSize: '0.75rem' }}
        >
          <span>{movie.year}</span>
          {movie.age_rating && (
            <>
              <span>·</span>
              <span>{movie.age_rating}</span>
            </>
          )}
          {score > 0 && (
            <>
              <span>·</span>
              <span className="flex items-center gap-0.5">
                <Star size={10} fill="#F5C518" stroke="none" />
                {score}
              </span>
            </>
          )}
          {movie.duration && (
            <>
              <span>·</span>
              <span>{movie.duration}m</span>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function ExpandedSuggestion({ movie }: { movie: MovieRecommendation }) {
  const { isDark } = usePCTheme();
  const score = movie.score_rating ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.35 }}
      className="overflow-hidden"
    >
      <div
        className="p-5 rounded-2xl mt-3"
        style={{
          background: 'var(--pc-surface)',
          border: '1px solid',
          borderColor: isDark ? 'rgba(245,197,24,0.15)' : 'rgba(196,149,10,0.2)',
        }}
      >
        <div className="flex items-start gap-4">
          {movie.posterURL && (
            <div className="relative shrink-0 w-20 h-28 rounded-xl overflow-hidden">
              <img src={movie.posterURL} alt={movie.name} className="w-full h-full object-cover" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <h3
                  style={{
                    fontFamily: "var(--font-bebas-neue), 'Bebas Neue', sans-serif",
                    fontSize: '1.3rem',
                    letterSpacing: '0.03em',
                    color: 'var(--pc-t1)',
                  }}
                >
                  {movie.name}
                </h3>
                <div
                  className="flex items-center gap-2"
                  style={{ color: 'var(--pc-t3)', fontSize: '0.78rem' }}
                >
                  <span>{movie.year}</span>
                  {movie.age_rating && (
                    <>
                      <span>·</span>
                      <span>{movie.age_rating}</span>
                    </>
                  )}
                  {score > 0 && (
                    <>
                      <span>·</span>
                      <span className="flex items-center gap-0.5">
                        <Star size={10} fill="#F5C518" stroke="none" />
                        {score}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <SimilarityBadge similarity={movie.similarity} />
            </div>
            {score > 0 && <StarRating score={score} />}
          </div>
        </div>

        {movie.description && (
          <div
            className="mt-4 p-3.5 rounded-xl"
            style={{
              background: isDark ? 'rgba(245,197,24,0.04)' : 'rgba(196,149,10,0.05)',
              border: '1px solid',
              borderColor: isDark ? 'rgba(245,197,24,0.08)' : 'rgba(196,149,10,0.12)',
            }}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <Sparkles size={11} style={{ color: 'var(--pc-gold)' }} />
              <span
                className="uppercase tracking-widest"
                style={{ color: 'var(--pc-gold)', fontSize: '0.62rem' }}
              >
                Why this film
              </span>
            </div>
            <p
              style={{
                color: 'var(--pc-t2)',
                fontSize: '0.82rem',
                lineHeight: 1.7,
              }}
            >
              {movie.description}
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function ResultsPage() {
  const router = useRouter();
  const { isDark } = usePCTheme();
  const [movies, setMovies] = useState<MovieRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSuggestion, setActiveSuggestion] = useState<number | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const scrollCarousel = useCallback((dir: 'left' | 'right') => {
    if (!carouselRef.current) return;
    carouselRef.current.scrollBy({
      left: dir === 'left' ? -240 : 240,
      behavior: 'smooth',
    });
  }, []);

  function handleScroll() {
    if (!carouselRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;
    setCanScrollLeft(scrollLeft > 8);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 8);
  }

  function toggleSuggestion(id: number) {
    setActiveSuggestion((prev) => (prev === id ? null : id));
  }

  useEffect(() => {
    const raw = localStorage.getItem('popchoice_recommendation');
    if (!raw) {
      router.replace('/quiz');
      return;
    }

    try {
      const parsed: ApiResponse = JSON.parse(raw);

      if (parsed.similarMovies && parsed.similarMovies.length > 0) {
        const mapped: MovieRecommendation[] = parsed.similarMovies.map((m) => ({
          id: m.id,
          name: m.name,
          year: m.year,
          similarity: m.similarity,
          age_rating: m.age_rating,
          duration: m.duration,
          score_rating: m.score_rating,
          posterURL: m.posterURL,
          description: m.aiDescription,
          isMainRecommendation: m.isMainRecommendation,
        }));

        const needPosters = mapped.filter((m) => !m.posterURL);
        if (needPosters.length > 0) {
          const tmdbApiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY;
          enhanceMoviesWithPosters(needPosters, tmdbApiKey)
            .then((enhanced) => {
              const final = mapped.map((m) => {
                const e = enhanced.find((em) => em.id === m.id);
                return e || m;
              });
              setMovies(final);
            })
            .catch(() => setMovies(mapped))
            .finally(() => setIsLoading(false));
        } else {
          setMovies(mapped);
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    } catch {
      setIsLoading(false);
    }
  }, [router]);

  const mainMovie = movies.find((m) => m.isMainRecommendation) || movies[0];
  const otherMovies = movies.filter((m) => m !== mainMovie);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="text-4xl mb-4">🎬</div>
          <p style={{ color: 'var(--pc-t2)' }}>Loading your picks…</p>
        </div>
      </div>
    );
  }

  if (!mainMovie) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] px-5">
        <div className="text-4xl mb-4">😕</div>
        <h2
          className="mb-2"
          style={{
            fontFamily: "var(--font-bebas-neue), 'Bebas Neue', sans-serif",
            fontSize: '1.8rem',
            color: 'var(--pc-t1)',
          }}
        >
          No recommendations found
        </h2>
        <p className="mb-6" style={{ color: 'var(--pc-t3)', fontSize: '0.9rem' }}>
          Try the quiz again with different answers.
        </p>
        <button
          onClick={() => router.push('/quiz')}
          className="px-6 py-3 rounded-2xl"
          style={{
            background: 'var(--pc-cta)',
            color: '#09090F',
            fontWeight: 700,
          }}
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="px-4 md:px-8 py-8 max-w-3xl mx-auto w-full">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8 text-center"
      >
        <div
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs mb-4 uppercase tracking-widest"
          style={{
            background: isDark ? 'rgba(245,197,24,0.1)' : 'rgba(196,149,10,0.08)',
            border: '1px solid',
            borderColor: isDark ? 'rgba(245,197,24,0.2)' : 'rgba(196,149,10,0.25)',
            color: 'var(--pc-gold)',
          }}
        >
          <Sparkles size={11} /> Your personalized picks
        </div>
        <h1
          style={{
            fontFamily: "var(--font-bebas-neue), 'Bebas Neue', sans-serif",
            fontSize: 'clamp(1.8rem, 5vw, 2.8rem)',
            letterSpacing: '0.05em',
            color: 'var(--pc-t1)',
            lineHeight: 1.1,
          }}
        >
          We found your perfect film
        </h1>
        <p className="mt-2" style={{ color: 'var(--pc-t3)', fontSize: '0.88rem' }}>
          Matched from 10,000+ films using AI taste analysis
        </p>
      </motion.div>

      {/* Main recommendation */}
      <div className="mb-10">
        <div className="flex items-center gap-2 mb-4">
          <div
            className="w-1.5 h-5 rounded-full"
            style={{
              background: 'linear-gradient(180deg, var(--pc-gold), var(--pc-amber))',
            }}
          />
          <span className="uppercase tracking-widest text-xs" style={{ color: 'var(--pc-gold)' }}>
            Top Pick
          </span>
        </div>
        <MainMovieCard movie={mainMovie} />
      </div>

      {/* Additional suggestions */}
      {otherMovies.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div
                className="w-1.5 h-5 rounded-full"
                style={{
                  background: 'linear-gradient(180deg, #8B5CF6, #14B8A6)',
                }}
              />
              <span className="uppercase tracking-widest text-xs" style={{ color: 'var(--pc-t2)' }}>
                More suggestions
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => scrollCarousel('left')}
                disabled={!canScrollLeft}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200"
                style={{
                  background: canScrollLeft ? 'var(--pc-bd2)' : 'var(--pc-bd1)',
                  border: '1px solid var(--pc-bd2)',
                  color: canScrollLeft ? 'var(--pc-t1)' : 'var(--pc-t4)',
                  cursor: canScrollLeft ? 'pointer' : 'not-allowed',
                }}
              >
                <ChevronLeft size={15} />
              </button>
              <button
                onClick={() => scrollCarousel('right')}
                disabled={!canScrollRight}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200"
                style={{
                  background: canScrollRight ? 'var(--pc-bd2)' : 'var(--pc-bd1)',
                  border: '1px solid var(--pc-bd2)',
                  color: canScrollRight ? 'var(--pc-t1)' : 'var(--pc-t4)',
                  cursor: canScrollRight ? 'pointer' : 'not-allowed',
                }}
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>

          <div className="relative">
            <div
              ref={carouselRef}
              onScroll={handleScroll}
              className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide"
            >
              {otherMovies.map((movie) => (
                <SmallSuggestionCard
                  key={movie.id}
                  movie={movie}
                  active={activeSuggestion === movie.id}
                  onClick={() => toggleSuggestion(movie.id)}
                />
              ))}
            </div>
            {/* Fade edges */}
            <div
              className="absolute left-0 top-0 bottom-4 w-6 pointer-events-none"
              style={{
                background: 'linear-gradient(to right, var(--pc-bg), transparent)',
                opacity: canScrollLeft ? 1 : 0,
                transition: 'opacity 0.3s',
              }}
            />
            <div
              className="absolute right-0 top-0 bottom-4 w-10 pointer-events-none"
              style={{
                background: 'linear-gradient(to left, var(--pc-bg), transparent)',
                opacity: canScrollRight ? 1 : 0,
                transition: 'opacity 0.3s',
              }}
            />
          </div>

          {/* Dots */}
          <div className="flex justify-center gap-1.5 mt-2">
            {otherMovies.map((movie) => (
              <button
                key={movie.id}
                onClick={() => toggleSuggestion(movie.id)}
                className="rounded-full transition-all duration-200"
                style={{
                  width: activeSuggestion === movie.id ? 16 : 6,
                  height: 6,
                  background:
                    activeSuggestion === movie.id
                      ? 'linear-gradient(90deg, #F5C518, #FF9F1C)'
                      : 'var(--pc-bd3)',
                }}
              />
            ))}
          </div>

          <AnimatePresence>
            {activeSuggestion !== null && (
              <ExpandedSuggestion
                key={activeSuggestion}
                movie={otherMovies.find((m) => m.id === activeSuggestion)!}
              />
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Action buttons */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
      >
        <button
          onClick={() => {
            localStorage.removeItem('popchoice_recommendation');
            router.push('/quiz');
          }}
          className="flex items-center gap-2 px-6 py-3 rounded-2xl transition-all duration-200 active:scale-95"
          style={{
            background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
            border: '1px solid var(--pc-bd2)',
            color: 'var(--pc-t2)',
            fontSize: '0.9rem',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.color = 'var(--pc-t1)';
            (e.currentTarget as HTMLElement).style.borderColor = 'var(--pc-bd4)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.color = 'var(--pc-t2)';
            (e.currentTarget as HTMLElement).style.borderColor = 'var(--pc-bd2)';
          }}
        >
          <RotateCcw size={15} /> Try again
        </button>

        <button
          onClick={() => {
            localStorage.removeItem('popchoice_recommendation');
            router.push('/quiz');
          }}
          className="flex items-center gap-2 px-6 py-3 rounded-2xl transition-all duration-200 active:scale-95"
          style={{
            background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)',
            color: '#F8F8FF',
            fontSize: '0.9rem',
            fontWeight: 600,
          }}
        >
          <Users size={15} /> Try with friends
        </button>
      </motion.div>

      <p className="mt-8 text-center" style={{ color: 'var(--pc-t5)', fontSize: '0.72rem' }}>
        Recommendations are AI-generated based on your taste profile.
      </p>
    </div>
  );
}
