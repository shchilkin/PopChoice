import z from 'zod';

import { getDbClient } from '@/clients/dbClient';
import { hashPassword } from '@/lib/auth/password';
import logger from '@/lib/logger';

export const registerSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(8).max(128),
});

export class RegisterUserError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly payload: { error: string },
  ) {
    super(message);
  }
}

export async function registerUser(input: z.infer<typeof registerSchema>): Promise<void> {
  const normalizedEmail = input.email.toLowerCase().trim();

  const db = getDbClient();
  if (!db.isConfigured()) {
    logger.error('Database not configured — cannot register user.');
    throw new RegisterUserError('Database not configured', 503, { error: 'Service unavailable.' });
  }

  const passwordHash = await hashPassword(input.password);
  const result = await db
    .from('users')
    .insert({ email: normalizedEmail, password_hash: passwordHash })
    .select('id');

  if (result.error) {
    if (result.error.message.includes('unique') || result.error.message.includes('duplicate')) {
      throw new RegisterUserError('Email already exists', 409, { error: 'email_taken' });
    }
    logger.error({ error: result.error.message }, 'Failed to insert user');
    throw new RegisterUserError('Failed to insert user', 503, { error: 'Service unavailable.' });
  }

  const userId = (result.data?.[0] as { id?: unknown })?.id;
  logger.info({ userId }, 'New user registered');
}
