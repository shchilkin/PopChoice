'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Branding, Button } from '@/components';

export default function QuestionsPage() {
  const [peopleCount, setPeopleCount] = useState<string>('');
  const [timeAvailable, setTimeAvailable] = useState<string>('');

  const handleStart = () => {
    if (peopleCount && timeAvailable) {
      // TODO: Navigate to next step or handle form submission
      localStorage.setItem(
        'popchoice_peopleAndTimeData',
        JSON.stringify({ peopleCount, timeAvailable }),
      );
      router.push('/movie-questionnaire');
    }
  };

  const router = useRouter();

  const isFormValid = peopleCount.trim() !== '' && timeAvailable.trim() !== '';

  return (
    <div className="flex flex-col items-center justify-items-center min-h-screen p-4 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col w-full items-center max-w-md mx-auto gap-8">
        <Branding />

        <div className="flex flex-col w-full gap-4">
          <div className="flex flex-col gap-2">
            <input
              type="number"
              placeholder="How many people?"
              value={peopleCount}
              onChange={(e) => setPeopleCount(e.target.value)}
              min="1"
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg dark:bg-gray-800 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>

          <div className="flex flex-col gap-2">
            <input
              type="text"
              placeholder="How much time do you have?"
              value={timeAvailable}
              onChange={(e) => setTimeAvailable(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg dark:bg-gray-800 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>

          <Button
            onClick={handleStart}
            disabled={!isFormValid}
            className="w-full mt-4 bg-green-500 hover:bg-green-600 disabled:bg-gray-400"
          >
            Start
          </Button>
        </div>
      </main>
    </div>
  );
}
