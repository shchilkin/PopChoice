import OpenAI from 'openai';

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OpenAI API key is missing or invalid.');
}

export const openAIClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  // Default per-request timeout of 30 seconds; callers can override with signal.
  timeout: 30_000,
});
