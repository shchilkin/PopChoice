'use client';

import { useEffect, useState } from 'react';

import { QuestionsForm, TopNavigation } from '@/components';
import { getPersonColors } from '@/utils/ui';

interface PersonData {
  peopleCount: string;
  timeAvailable: string;
}

export default function QuestionsPage() {
  const [peopleData, setPeopleData] = useState<PersonData | null>(null);
  const [currentPersonIndex, setCurrentPersonIndex] = useState(0);
  const [completedPeople, setCompletedPeople] = useState<Set<number>>(new Set());

  useEffect(() => {
    // Get the people count and time from localStorage
    const storedData = localStorage.getItem('popchoice_peopleAndTimeData');
    if (storedData) {
      setPeopleData(JSON.parse(storedData));
    }
  }, []);

  if (!peopleData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  const totalPeople = parseInt(peopleData.peopleCount);
  const peopleArray = Array.from({ length: totalPeople }, (_, i) => i);

  const handlePersonComplete = (personIndex: number) => {
    setCompletedPeople((prev) => new Set([...prev, personIndex]));

    // Move to next person if not the last one
    if (personIndex < totalPeople - 1) {
      setCurrentPersonIndex(personIndex + 1);
    }
  };

  // Check if a person can be accessed based on sequential completion
  const canAccessPerson = (personIndex: number) => {
    // First person can always be accessed
    if (personIndex === 0) return true;

    // For subsequent persons, all previous persons must be completed
    for (let i = 0; i < personIndex; i++) {
      if (!completedPeople.has(i)) {
        return false;
      }
    }
    return true;
  };

  // Find the next available person (for auto-navigation)
  const getNextAvailablePerson = () => {
    for (let i = 0; i < totalPeople; i++) {
      if (canAccessPerson(i) && !completedPeople.has(i)) {
        return i;
      }
    }
    // If all are completed, return the last completed person
    return Math.max(0, totalPeople - 1);
  };

  // Ensure current person is accessible, if not, redirect to next available
  const effectiveCurrentPerson = canAccessPerson(currentPersonIndex)
    ? currentPersonIndex
    : getNextAvailablePerson();

  // Update currentPersonIndex if it was corrected
  if (effectiveCurrentPerson !== currentPersonIndex) {
    setCurrentPersonIndex(effectiveCurrentPerson);
  }

  const allCompleted = completedPeople.size === totalPeople;

  // Get colors for the current person
  const currentPersonColors = getPersonColors(effectiveCurrentPerson);

  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex-1 p-4 pb-24 sm:p-20 sm:pb-32 font-[family-name:var(--font-geist-sans)]">
        <main className="flex flex-col w-full items-center max-w-md mx-auto">
          <TopNavigation
            firstStripeColor={currentPersonColors.first}
            secondStripeColor={currentPersonColors.second}
            logoSize={60}
            minimizeMode={true}
          />

          {/* Step Progress Indicator - only show for multiple people */}
          {totalPeople > 1 && (
            <div className="w-full mb-6">
              {/* Enhanced progress for multiple people */}
              <>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold dark:text-white">
                    Movie Preferences for {totalPeople} People
                  </h2>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {completedPeople.size}/{totalPeople} completed
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-2">
                  <div
                    className="h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${(completedPeople.size / totalPeople) * 100}%`,
                      backgroundColor: currentPersonColors.first,
                    }}
                  />
                </div>

                {/* Sequential flow indicator */}
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  Currently filling: Person {effectiveCurrentPerson + 1}
                  {completedPeople.has(effectiveCurrentPerson) ? ' (Completed ✓)' : ''}
                </div>
              </>
            </div>
          )}

          {/* Person Tabs - only show for multiple people */}
          {totalPeople > 1 && (
            <div className="w-full mb-6">
              <div className="flex gap-2 overflow-x-auto pb-2">
                {peopleArray.map((personIndex) => {
                  const personColors = getPersonColors(personIndex);
                  const isActive = effectiveCurrentPerson === personIndex;
                  const isCompleted = completedPeople.has(personIndex);
                  const isAccessible = canAccessPerson(personIndex);
                  const isLocked = !isAccessible;

                  return (
                    <button
                      key={personIndex}
                      onClick={() => (isAccessible ? setCurrentPersonIndex(personIndex) : null)}
                      disabled={isLocked}
                      className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors border-2 relative ${
                        isActive
                          ? 'text-white border-transparent'
                          : isCompleted
                            ? 'bg-green-500 text-white border-green-500'
                            : isLocked
                              ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 border-gray-200 dark:border-gray-700 cursor-not-allowed opacity-50'
                              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 border-gray-300 dark:border-gray-600 cursor-pointer'
                      }`}
                      style={
                        isActive
                          ? {
                              backgroundColor: personColors.first,
                              borderColor: personColors.first,
                            }
                          : {}
                      }
                    >
                      {isCompleted && '✓ '}
                      {isLocked && !isCompleted && '🔒 '}
                      Person {personIndex + 1}
                    </button>
                  );
                })}
              </div>

              {/* Helper text for locked flow */}
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                Complete each person&apos;s preferences in order to unlock the next person
              </p>
            </div>
          )}

          {/* Current Person's Form */}
          <div className="w-full">
            {/* Form title - only show person number for multiple people */}
            {totalPeople > 1 && (
              <div className="mb-4">
                <h3 className="text-md font-medium dark:text-white text-center">
                  Preferences for Person {effectiveCurrentPerson + 1}
                </h3>
              </div>
            )}

            <QuestionsForm
              key={effectiveCurrentPerson} // Force re-render for each person
              personIndex={effectiveCurrentPerson}
              onComplete={() => handlePersonComplete(effectiveCurrentPerson)}
              isCompleted={completedPeople.has(effectiveCurrentPerson)}
              allCompleted={allCompleted}
              totalPeople={totalPeople}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
