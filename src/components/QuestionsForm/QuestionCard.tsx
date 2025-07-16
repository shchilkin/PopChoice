'use client';
import React, { useEffect, useRef } from 'react';

interface QuestionCardProps {
  label: string;
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  name?: string;
}

export const QuestionCard = ({ label, placeholder, value, onChange, name }: QuestionCardProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (typeof window !== undefined) {
      const peopleCountAndTimeData = JSON.parse(
        localStorage.getItem('popchoice_peopleAndTimeData') || '{}',
      );
      console.log('peopleCountAndTimeData:', peopleCountAndTimeData);
    }
  }, []);

  // TODO: Handle form data for N people and time available

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = textarea.scrollHeight + 'px';
    }

    if (onChange) {
      onChange(e.target.value);
    }
  };

  if (!label) {
    return (
      <div className="flex flex-col gap-2 p-4 border border-red-500 bg-red-50 dark:bg-red-900 dark:border-red-700 rounded-lg">
        <span className="text-red-700 dark:text-red-300 font-semibold">Error:</span>
        <span className="text-red-600 dark:text-red-200 text-sm">Label is required.</span>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-1 w-full">
      <label className="text-md font-regular text-start w-full dark:text-gray-300">{label}</label>
      <textarea
        ref={textareaRef}
        name={name}
        value={value}
        className="w-full min-h-24 h-fit p-2 border border-gray-300 dark:border-gray-700 rounded-lg dark:bg-gray-800 dark:text-white resize-none overflow-hidden"
        placeholder={placeholder}
        onInput={handleInput}
      />
    </div>
  );
};
