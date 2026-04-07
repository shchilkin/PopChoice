import Link from 'next/link';

import { Branding, TMDBAttribution, TopNavigation } from '@/components';

export default function LandingPage() {
  return (
    <div className="flex flex-col items-center justify-items-center min-h-screen p-4 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col w-full items-center max-w-6xl mx-auto">
        <TopNavigation logoSize={60} />

        {/* Hero Section */}
        <section className="flex flex-col items-center text-center max-w-md mx-auto gap-6 mt-8">
          <Branding />
          <p className="text-xl text-[var(--muted-foreground)] leading-relaxed">
            Tell us your vibe. We&apos;ll find your movie.
          </p>
          <Link
            href="/start"
            className="inline-block px-8 py-3 rounded-lg bg-green-500 hover:bg-green-600 text-white font-semibold text-lg transition-colors duration-200 shadow-md"
          >
            Get Started
          </Link>
        </section>

        {/* How It Works Section */}
        <section className="w-full max-w-4xl mx-auto mt-20">
          <h2 className="text-2xl font-bold text-center mb-10 text-[var(--foreground)]">
            How it works
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="flex flex-col items-center text-center gap-4">
              <span className="flex-shrink-0 w-10 h-10 bg-[var(--accent)] text-[var(--accent-foreground)] rounded-full flex items-center justify-center text-lg font-bold">
                1
              </span>
              <div>
                <h3 className="font-semibold text-[var(--foreground)] mb-2">
                  🎬 Tell us about your group
                </h3>
                <p className="text-sm text-[var(--muted-foreground)]">
                  Let us know how many people are watching and how much time you have available.
                </p>
              </div>
            </div>

            <div className="flex flex-col items-center text-center gap-4">
              <span className="flex-shrink-0 w-10 h-10 bg-[var(--accent)] text-[var(--accent-foreground)] rounded-full flex items-center justify-center text-lg font-bold">
                2
              </span>
              <div>
                <h3 className="font-semibold text-[var(--foreground)] mb-2">
                  📝 Share your movie taste
                </h3>
                <p className="text-sm text-[var(--muted-foreground)]">
                  Answer a few quick questions about the mood, genre, and tone you&apos;re in the
                  mood for.
                </p>
              </div>
            </div>

            <div className="flex flex-col items-center text-center gap-4">
              <span className="flex-shrink-0 w-10 h-10 bg-[var(--accent)] text-[var(--accent-foreground)] rounded-full flex items-center justify-center text-lg font-bold">
                3
              </span>
              <div>
                <h3 className="font-semibold text-[var(--foreground)] mb-2">
                  🍿 Get your recommendations
                </h3>
                <p className="text-sm text-[var(--muted-foreground)]">
                  Receive AI-powered movie recommendations tailored just for you and your group.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Features Row */}
        <section className="w-full max-w-4xl mx-auto mt-16 grid md:grid-cols-3 gap-6">
          <div className="bg-[var(--muted)] rounded-lg p-6 text-center">
            <h3 className="font-semibold text-[var(--foreground)] mb-2">🎯 Smart Matching</h3>
            <p className="text-sm text-[var(--muted-foreground)]">
              AI embeddings and vector search find movies that truly match your taste.
            </p>
          </div>
          <div className="bg-[var(--muted)] rounded-lg p-6 text-center">
            <h3 className="font-semibold text-[var(--foreground)] mb-2">👥 Group Friendly</h3>
            <p className="text-sm text-[var(--muted-foreground)]">
              Everyone in the group answers separately so no one&apos;s taste gets ignored.
            </p>
          </div>
          <div className="bg-[var(--muted)] rounded-lg p-6 text-center">
            <h3 className="font-semibold text-[var(--foreground)] mb-2">⚡ Quick &amp; Easy</h3>
            <p className="text-sm text-[var(--muted-foreground)]">
              From zero to movie recommendation in just a few minutes.
            </p>
          </div>
        </section>

        {/* TMDB Attribution */}
        <TMDBAttribution />
      </main>
    </div>
  );
}
