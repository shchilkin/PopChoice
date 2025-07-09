import React, { FC } from 'react';
import { z } from 'zod';

// Create a zod schema for future OpenAI API integration
export const SuggestionCardSchema = z.object({
  title: z.string(),
  description: z.string(),
});

type SuggestionCardProps = z.infer<typeof SuggestionCardSchema>;

export const SuggestionCard: FC<SuggestionCardProps> = ({ title, description }) => {
  return (
    <div className="flex flex-col w-full pb-8">
      <h4 className="text-2xl font-bold">{title}</h4>
      <p className="text-lg">{description}</p>
    </div>
  );
};
