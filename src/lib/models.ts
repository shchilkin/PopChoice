/**
 * Centralised OpenAI model identifiers used across the application.
 * Update these constants in one place to switch models app-wide.
 */
export const MODELS = {
  /** Primary recommendation model. */
  RECOMMENDATION: 'gpt-5.4',
  /** Lightweight/cheap model for enrichment, descriptions, and moderation. */
  MINI: 'gpt-5.4-mini',
  /** Text embedding model used for vector similarity search. */
  EMBEDDING: 'text-embedding-3-large',
} as const;
