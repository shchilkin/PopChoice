'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Branding, Button, ThemeToggle } from '@/components';

export default function IntroPage() {
  const [peopleCount, setPeopleCount] = useState<string>('');
  const [timeAvailable, setTimeAvailable] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const router = useRouter();

  const isFormValid = peopleCount.trim() !== '' && timeAvailable.trim() !== '';
  const isButtonDisabled = !isFormValid || isSubmitting;

  const handleStart = () => {
    if (isFormValid && !isSubmitting) {
      setIsSubmitting(true);
      localStorage.setItem(
        'popchoice_peopleAndTimeData',
        JSON.stringify({ peopleCount, timeAvailable }),
      );
      router.push('/movie-questionnaire');
    }
  };

  return (
    <div className="flex flex-col items-center justify-items-center min-h-screen p-4 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      {/* Theme toggle positioned in top right */}
      <div className="fixed top-4 right-4 z-10">
        <ThemeToggle />
      </div>

      <main className="flex flex-col w-full items-center max-w-md mx-auto gap-8">
        <Branding />

        <div className="flex flex-col w-full gap-6">
          {/* People Count Section */}
          <div className="flex flex-col gap-3">
            <label
              htmlFor="peopleCount"
              className="text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              How many people?
            </label>
            <input
              type="number"
              placeholder="Enter number of people"
              value={peopleCount}
              onChange={(e) => setPeopleCount(e.target.value)}
              min="1"
              className="w-full px-4 py-3 border border-[var(--border)] rounded-lg bg-[var(--input)] text-[var(--foreground)] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
            {/* Choice chips */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {[1, 2, 3, 5, 10].map((count) => (
                <button
                  key={count}
                  type="button"
                  onClick={() => setPeopleCount(count.toString())}
                  className={`min-w-[4rem] flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                    peopleCount === count.toString()
                      ? 'bg-[var(--accent)] text-[var(--accent-foreground)] shadow-md'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 hover:shadow-sm'
                  }`}
                >
                  {count}
                </button>
              ))}
            </div>
          </div>

          {/* Time Available Section */}
          <div className="flex flex-col gap-3">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              How much time do you have?
            </label>

            {/* Main input */}
            <input
              type="text"
              placeholder="How much time do you have?"
              value={timeAvailable}
              onChange={(e) => setTimeAvailable(e.target.value)}
              className="w-full px-4 py-3 border border-[var(--border)] rounded-lg bg-[var(--input)] text-[var(--foreground)] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />

            {/* Choice chips */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {['30 min', '1 hour', '2 hours', 'All evening', 'Weekend'].map((time) => (
                <button
                  key={time}
                  type="button"
                  onClick={() => setTimeAvailable(time)}
                  className={`min-w-[4rem] flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                    timeAvailable === time
                      ? 'bg-[var(--accent)] text-[var(--accent-foreground)] shadow-md'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 hover:shadow-sm'
                  }`}
                >
                  {time}
                </button>
              ))}
            </div>
          </div>

          <Button
            onClick={handleStart}
            disabled={isButtonDisabled}
            className="w-full mt-4 bg-green-500 hover:bg-green-600 disabled:bg-gray-400"
          >
            Start
          </Button>
        </div>
      </main>
    </div>
  );
}
