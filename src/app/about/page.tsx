import { TMDBAttribution, TopNavigation } from '@/components';

export default function AboutPage() {
  return (
    <div className="flex flex-col items-center justify-items-center min-h-screen p-4 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col w-full items-center max-w-6xl mx-auto">
        <TopNavigation logoSize={60} />

        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold mb-4">About PopChoice</h1>
          <div className="max-w-2xl mx-auto space-y-4 text-lg text-gray-700">
            <p>
              PopChoice is a movie recommendation app that helps you discover your next favorite
              film through personalized questionnaires and AI-powered suggestions.
            </p>
            <p>
              We use advanced algorithms to analyze your preferences and match you with movies that
              align with your taste, mood, and viewing criteria.
            </p>
          </div>
        </div>

        {/* TMDB Attribution - Required for API usage */}
        <TMDBAttribution />
      </main>
    </div>
  );
}
