import {
  Star,
  Clock,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Sparkles,
  Play,
  Users,
  Clapperboard,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useState, useRef } from 'react';
import { useNavigate } from 'react-router';

import { usePCTheme } from '../contexts/ThemeContext';
import { MAIN_RECOMMENDATION, ADDITIONAL_SUGGESTIONS, Movie } from '../data/movies';

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
  const color =
    similarity >= 95
      ? '#14B8A6'
      : similarity >= 90
        ? '#F5C518'
        : similarity >= 85
          ? '#FF9F1C'
          : '#8B5CF6';
  return (
    <div
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs"
      style={{ background: `${color}18`, border: `1px solid ${color}35`, color }}
    >
      <Sparkles size={10} />
      {similarity}% match
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

function MainMovieCard({ movie }: { movie: Movie }) {
  const { isDark } = usePCTheme();
  const [imgLoaded, setImgLoaded] = useState(false);

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
      <div className="relative h-72 md:h-96 overflow-hidden">
        <div
          className="absolute inset-0 transition-opacity duration-700"
          style={{ opacity: imgLoaded ? 0 : 1, background: 'var(--pc-surface-deep)' }}
        />
        <img
          src={movie.image}
          alt={movie.title}
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
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 'clamp(1.8rem, 5vw, 3rem)',
              letterSpacing: '0.04em',
              color: isDark ? '#FFFFFF' : '#0D0D1A',
              lineHeight: 1,
              textShadow: isDark ? '0 2px 20px rgba(0,0,0,0.8)' : '0 1px 8px rgba(255,255,255,0.8)',
            }}
          >
            {movie.title}
          </h2>
          <div
            className="flex items-center gap-3 flex-wrap"
            style={{ color: 'var(--pc-t2)', fontSize: '0.82rem' }}
          >
            <span>{movie.year}</span>
            <span>·</span>
            <span
              className="px-1.5 py-0.5 rounded"
              style={{ border: '1px solid var(--pc-bd3)', color: 'var(--pc-t2)' }}
            >
              {movie.rating}
            </span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <Clock size={11} />
              {movie.duration}
            </span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <Star size={11} fill="#F5C518" stroke="none" />
              <span style={{ color: 'var(--pc-gold)' }}>{movie.score}</span>/10
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 pt-4">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Clapperboard size={13} style={{ color: 'var(--pc-t3)' }} />
            <span style={{ color: 'var(--pc-t3)', fontSize: '0.82rem' }}>
              Directed by <span style={{ color: 'var(--pc-t2)' }}>{movie.director}</span>
            </span>
          </div>
          <div className="flex gap-2 flex-wrap">
            {movie.genres.map((g) => (
              <GenrePill key={g} genre={g} />
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <StarRating score={movie.score} />
          <span style={{ color: 'var(--pc-t3)', fontSize: '0.78rem' }}>
            {movie.score}/10 on IMDb
          </span>
        </div>

        {/* AI description */}
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
          <p style={{ color: 'var(--pc-t2)', fontSize: '0.88rem', lineHeight: 1.75 }}>
            {movie.description}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function SuggestionCard({
  movie,
  active,
  onClick,
}: {
  movie: Movie;
  active: boolean;
  onClick: () => void;
}) {
  const [imgLoaded, setImgLoaded] = useState(false);

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
        <div
          className="absolute inset-0"
          style={{ background: 'var(--pc-surface-deep)', opacity: imgLoaded ? 0 : 1 }}
        />
        <img
          src={movie.image}
          alt={movie.title}
          className="w-full h-full object-cover"
          onLoad={() => setImgLoaded(true)}
          style={{ opacity: imgLoaded ? 1 : 0, transition: 'opacity 0.4s' }}
        />
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(to bottom, transparent 40%, var(--pc-surface) 100%)`,
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
            {movie.similarity}%
          </div>
        </div>
      </div>

      <div className="p-3.5">
        <h4
          className="mb-1 truncate"
          style={{ color: 'var(--pc-t1)', fontWeight: 600, fontSize: '0.9rem' }}
        >
          {movie.title}
        </h4>
        <div
          className="flex items-center gap-2 mb-2 flex-wrap"
          style={{ color: 'var(--pc-t3)', fontSize: '0.75rem' }}
        >
          <span>{movie.year}</span>
          <span>·</span>
          <span>{movie.rating}</span>
          <span>·</span>
          <span className="flex items-center gap-0.5">
            <Star size={10} fill="#F5C518" stroke="none" />
            {movie.score}
          </span>
          <span>·</span>
          <span>{movie.duration}</span>
        </div>
        <div className="flex gap-1 flex-wrap">
          {movie.genres.slice(0, 2).map((g) => (
            <span
              key={g}
              className="text-xs px-2 py-0.5 rounded-full"
              style={{ background: 'var(--pc-bd1)', color: 'var(--pc-t3)' }}
            >
              {g}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function ExpandedSuggestion({ movie, onClose }: { movie: Movie; onClose: () => void }) {
  const { isDark } = usePCTheme();
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
          <div className="relative shrink-0 w-20 h-28 rounded-xl overflow-hidden">
            <img src={movie.image} alt={movie.title} className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <h3
                  style={{
                    fontFamily: "'Bebas Neue', sans-serif",
                    fontSize: '1.3rem',
                    letterSpacing: '0.03em',
                    color: 'var(--pc-t1)',
                  }}
                >
                  {movie.title}
                </h3>
                <div
                  className="flex items-center gap-2"
                  style={{ color: 'var(--pc-t3)', fontSize: '0.78rem' }}
                >
                  <span>{movie.year}</span>
                  <span>·</span>
                  <span>{movie.rating}</span>
                  <span>·</span>
                  <span className="flex items-center gap-0.5">
                    <Star size={10} fill="#F5C518" stroke="none" />
                    {movie.score}
                  </span>
                </div>
              </div>
              <SimilarityBadge similarity={movie.similarity} />
            </div>
            <div className="flex gap-1.5 flex-wrap mb-3">
              {movie.genres.map((g) => (
                <GenrePill key={g} genre={g} />
              ))}
            </div>
            <StarRating score={movie.score} />
          </div>
        </div>

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
          <p style={{ color: 'var(--pc-t2)', fontSize: '0.82rem', lineHeight: 1.7 }}>
            {movie.description}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

export function Results() {
  const navigate = useNavigate();
  const { isDark } = usePCTheme();
  const [activeSuggestion, setActiveSuggestion] = useState<number | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  function scrollCarousel(dir: 'left' | 'right') {
    if (!carouselRef.current) return;
    carouselRef.current.scrollBy({ left: dir === 'left' ? -240 : 240, behavior: 'smooth' });
  }

  function handleScroll() {
    if (!carouselRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;
    setCanScrollLeft(scrollLeft > 8);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 8);
  }

  function toggleSuggestion(id: number) {
    setActiveSuggestion((prev) => (prev === id ? null : id));
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
            fontFamily: "'Bebas Neue', sans-serif",
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
            style={{ background: 'linear-gradient(180deg, var(--pc-gold), var(--pc-amber))' }}
          />
          <span className="uppercase tracking-widest text-xs" style={{ color: 'var(--pc-gold)' }}>
            Top Pick
          </span>
        </div>
        <MainMovieCard movie={MAIN_RECOMMENDATION} />
      </div>

      {/* Additional suggestions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div
              className="w-1.5 h-5 rounded-full"
              style={{ background: 'linear-gradient(180deg, #8B5CF6, #14B8A6)' }}
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
            className="flex gap-4 overflow-x-auto pb-4 no-scrollbar"
          >
            {ADDITIONAL_SUGGESTIONS.map((movie) => (
              <SuggestionCard
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
              background: `linear-gradient(to right, var(--pc-bg), transparent)`,
              opacity: canScrollLeft ? 1 : 0,
              transition: 'opacity 0.3s',
            }}
          />
          <div
            className="absolute right-0 top-0 bottom-4 w-10 pointer-events-none"
            style={{
              background: `linear-gradient(to left, var(--pc-bg), transparent)`,
              opacity: canScrollRight ? 1 : 0,
              transition: 'opacity 0.3s',
            }}
          />
        </div>

        {/* Dots navigation */}
        <div className="flex justify-center gap-1.5 mt-2">
          {ADDITIONAL_SUGGESTIONS.map((movie) => (
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
              movie={ADDITIONAL_SUGGESTIONS.find((m) => m.id === activeSuggestion)!}
              onClose={() => setActiveSuggestion(null)}
            />
          )}
        </AnimatePresence>
      </motion.div>

      {/* Try again */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
      >
        <button
          onClick={() => navigate('/quiz')}
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
          onClick={() => navigate('/quiz')}
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
        Recommendations are AI-generated based on your taste profile. Results are illustrative.
      </p>
    </div>
  );
}
