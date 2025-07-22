import Image from 'next/image';

export function TMDBAttribution() {
  return (
    <div className="flex flex-col items-center gap-2 py-4 text-center">
      <div className="flex items-center gap-2">
        <Image
          src="/tmdb-logo.svg"
          alt="The Movie Database logo"
          width={60}
          height={43}
          className="inline-block"
        />
        <span className="text-sm text-gray-600">
          This product uses the TMDB API but is not endorsed or certified by TMDB.
        </span>
      </div>
      <a
        href="https://www.themoviedb.org/"
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-blue-500 hover:text-blue-700 underline"
      >
        Visit The Movie Database
      </a>
    </div>
  );
}
