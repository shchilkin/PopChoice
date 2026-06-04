import z from 'zod';

export const morePicksPersonFormDataSchema = z.object({
  favoriteMovie: z.string(),
  newVsClassic: z.string().min(1),
  moodPreference: z.array(z.string()).min(1),
  tonePreference: z.string().min(1),
});

export type MorePicksPersonFormData = z.infer<typeof morePicksPersonFormDataSchema>;
