import React, { FC } from 'react';
import { z } from 'zod';
import Image from 'next/image';

// Create a zod schema for future OpenAI API integration
export const SuggestionCardSchema = z.object({
  title: z.string(),
  description: z.string(),
  posterURL: z.string(),
});

type SuggestionCardProps = z.infer<typeof SuggestionCardSchema>;

export const SuggestionCard: FC<SuggestionCardProps> = ({ title, description, posterURL }) => {
  return (
    <div className="flex flex-col w-full pb-8 min-w-0">
      <h4 className="text-4xl mb-4 font-bold">{title}</h4>
      <div className="w-full sm:max-w-[500px] mx-auto mb-4">
        <Image
          priority
          width={500}
          height={750}
          src={posterURL}
          alt={`${title} poster`}
          className="w-full h-auto rounded-lg"
        />
      </div>
      <p className="text-lg">{description}</p>
    </div>
  );
};
