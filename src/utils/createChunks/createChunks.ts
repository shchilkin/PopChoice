import { readFile } from 'fs/promises';

import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { z } from 'zod';

const DEFAULT_CHUNK_SIZE = 700;
const DEFAULT_CHUNK_OVERLAP = 0;

/**
 * Zod schema for document splitting options
 */
const splitOptionsSchema = z
  .object({
    chunkSize: z.number().int().positive().optional(),
    chunkOverlap: z.number().int().min(0).optional(),
  })
  .optional();

/**
 * TypeScript type inferred from the Zod schema
 */
export type SplitOptions = z.infer<typeof splitOptionsSchema>;

/**
 * Validates split options using Zod schema
 */
const validateSplitOptions = (options?: unknown): SplitOptions => {
  const result = splitOptionsSchema.safeParse(options);

  if (!result.success) {
    throw new Error(`Invalid split options: ${result.error.message}`);
  }

  return result.data;
};

export const splitDocument = async (pathToFile: string, options?: SplitOptions) => {
  // Validate options with Zod
  const validatedOptions = validateSplitOptions(options);

  const document = await readFile(pathToFile, 'utf-8');
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: validatedOptions?.chunkSize ?? DEFAULT_CHUNK_SIZE,
    chunkOverlap: validatedOptions?.chunkOverlap ?? DEFAULT_CHUNK_OVERLAP,
  });
  return await splitter.createDocuments([document]);
};
