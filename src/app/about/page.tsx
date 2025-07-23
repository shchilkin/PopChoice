import { TMDBAttribution, TopNavigation } from '@/components';

export default function AboutPage() {
  return (
    <div className="flex flex-col items-center justify-items-center min-h-screen p-4 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col w-full items-center max-w-6xl mx-auto">
        <TopNavigation logoSize={60} />

        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold mb-4">About PopChoice</h1>
          <div className="max-w-4xl mx-auto space-y-6 text-lg text-gray-700 dark:text-gray-300">
            <p className="text-xl leading-relaxed">
              PopChoice is an intelligent movie recommendation platform that combines AI technology
              with personalized questionnaires to help you discover your next favorite film.
            </p>

            <div className="grid md:grid-cols-2 gap-8 mt-8">
              <div className="text-left">
                <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">
                  🎯 Smart Recommendations
                </h2>
                <p className="text-base">
                  Our AI-powered system uses OpenAI embeddings and vector database technology to
                  analyze your preferences and match you with movies that perfectly align with your
                  taste, mood, and viewing time.
                </p>
              </div>

              <div className="text-left">
                <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">
                  📝 Personalized Questionnaires
                </h2>
                <p className="text-base">
                  Answer thoughtful questions about your movie preferences, group size, and
                  available time to receive tailored recommendations that fit your specific
                  situation.
                </p>
              </div>

              <div className="text-left">
                <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">
                  🤖 AI Technology
                </h2>
                <p className="text-base">
                  Powered by cutting-edge machine learning, including OpenAI&apos;s embedding models
                  and Supabase vector databases, to provide accurate and relevant movie suggestions.
                </p>
              </div>

              <div className="text-left">
                <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">
                  🎬 Comprehensive Movie Database
                </h2>
                <p className="text-base">
                  Access detailed information from our curated movie database including ratings,
                  genres, cast, and plot summaries to make informed viewing decisions. TMDB is used
                  only for movie posters.
                </p>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 mt-8">
              <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">
                How It Works
              </h2>
              <div className="text-left space-y-3 text-base">
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                    1
                  </span>
                  <p>
                    Answer questions about your group size, available time, and movie preferences
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                    2
                  </span>
                  <p>Our AI analyzes your responses using embedding technology</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                    3
                  </span>
                  <p>Receive personalized movie recommendations with detailed information</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                    4
                  </span>
                  <p>Discover your next favorite movie and enjoy your viewing experience</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* TMDB Attribution - Required for API usage */}
        <TMDBAttribution />
      </main>
    </div>
  );
}
