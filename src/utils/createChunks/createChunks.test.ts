import fs from 'fs/promises';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { splitDocument, type SplitOptions } from './createChunks';

// Test file paths
const testDir = path.resolve(__dirname, '../../test-files');
const shortTestFile = path.join(testDir, 'short-test.txt');
const longTestFile = path.join(testDir, 'long-test.txt');
const emptyTestFile = path.join(testDir, 'empty-test.txt');
const nonExistentFile = path.join(testDir, 'non-existent.txt');

// Test content
const shortContent = 'This is a short test document with less than 700 characters.';
const longContent = Array(10)
  .fill(
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.',
  )
  .join(' '); // This creates content longer than default chunk size (700 chars)

describe('splitDocument', () => {
  beforeAll(async () => {
    // Create test directory if it doesn't exist
    try {
      await fs.mkdir(testDir, { recursive: true });
    } catch {
      // Directory might already exist
    }

    // Create test files
    await fs.writeFile(shortTestFile, shortContent, 'utf-8');
    await fs.writeFile(longTestFile, longContent, 'utf-8');
    await fs.writeFile(emptyTestFile, '', 'utf-8');
  });

  afterAll(async () => {
    // Clean up test files
    try {
      await fs.unlink(shortTestFile);
      await fs.unlink(longTestFile);
      await fs.unlink(emptyTestFile);
      await fs.rmdir(testDir);
    } catch {
      // Files might not exist or directory not empty
    }
  });

  it('should split short document into single chunk', async () => {
    const chunks = await splitDocument(shortTestFile);

    expect(Array.isArray(chunks)).toBe(true);
    expect(chunks.length).toBe(1);
    expect(chunks[0].pageContent).toBe(shortContent);
    expect(chunks[0].metadata).toBeDefined();
  });

  it('should split long document into multiple chunks', async () => {
    const chunks = await splitDocument(longTestFile);

    expect(Array.isArray(chunks)).toBe(true);
    expect(chunks.length).toBeGreaterThan(1);

    // Each chunk should be within the size limit (with some tolerance for splitting logic)
    chunks.forEach((chunk) => {
      expect(chunk.pageContent.length).toBeLessThanOrEqual(800); // Some tolerance
      expect(chunk.pageContent.length).toBeGreaterThan(0);
      expect(chunk.metadata).toBeDefined();
    });
  });

  it('should handle empty file correctly', async () => {
    const chunks = await splitDocument(emptyTestFile);

    expect(Array.isArray(chunks)).toBe(true);
    // Empty file should result in empty array or single empty chunk
    expect(chunks.length).toBeLessThanOrEqual(1);
    if (chunks.length === 1) {
      expect(chunks[0].pageContent).toBe('');
    }
  });

  it('should throw error for non-existent file', async () => {
    await expect(splitDocument(nonExistentFile)).rejects.toThrow();
  });

  it('should maintain content integrity across chunks', async () => {
    const chunks = await splitDocument(longTestFile);

    // Join all chunks back together
    const reconstructedContent = chunks.map((chunk) => chunk.pageContent).join('');

    // Should preserve most of the original content (allowing for some splitting behavior)
    expect(reconstructedContent.length).toBeGreaterThan(longContent.length * 0.9);
  });

  it('should create document objects with correct structure', async () => {
    const chunks = await splitDocument(shortTestFile);

    chunks.forEach((chunk) => {
      // Should have pageContent property
      expect(chunk).toHaveProperty('pageContent');
      expect(typeof chunk.pageContent).toBe('string');

      // Should have metadata property
      expect(chunk).toHaveProperty('metadata');
      expect(typeof chunk.metadata).toBe('object');
    });
  });

  it('should use default chunk size of 700 characters', async () => {
    // Create content exactly at chunk size boundary
    const boundaryContent = 'A'.repeat(700);
    const boundaryTestFile = path.join(testDir, 'boundary-test.txt');

    await fs.writeFile(boundaryTestFile, boundaryContent, 'utf-8');

    const chunks = await splitDocument(boundaryTestFile);

    expect(chunks.length).toBe(1);
    expect(chunks[0].pageContent.length).toBe(700);

    // Cleanup
    await fs.unlink(boundaryTestFile);
  });

  it('should split content larger than chunk size', async () => {
    // Create content larger than chunk size
    const largeContent = 'A'.repeat(1500); // More than 2x chunk size
    const largeTestFile = path.join(testDir, 'large-test.txt');

    await fs.writeFile(largeTestFile, largeContent, 'utf-8');

    const chunks = await splitDocument(largeTestFile);

    expect(chunks.length).toBeGreaterThanOrEqual(2);

    // Each chunk should be reasonable size
    chunks.forEach((chunk) => {
      expect(chunk.pageContent.length).toBeLessThanOrEqual(800);
      expect(chunk.pageContent.length).toBeGreaterThan(0);
    });

    // Cleanup
    await fs.unlink(largeTestFile);
  });

  it('should handle special characters and encoding correctly', async () => {
    const specialContent = 'Special characters: émojis 🎬, quotes "test", symbols @#$%^&*()';
    const specialTestFile = path.join(testDir, 'special-test.txt');

    await fs.writeFile(specialTestFile, specialContent, 'utf-8');

    const chunks = await splitDocument(specialTestFile);

    expect(chunks.length).toBe(1);
    expect(chunks[0].pageContent).toBe(specialContent);

    // Cleanup
    await fs.unlink(specialTestFile);
  });

  describe('Options validation', () => {
    it('should accept valid options', async () => {
      const validOptions: SplitOptions = {
        chunkSize: 500,
        chunkOverlap: 50,
      };

      const chunks = await splitDocument(shortTestFile, validOptions);
      expect(chunks).toBeDefined();
      expect(Array.isArray(chunks)).toBe(true);
    });

    it('should accept partial options', async () => {
      const chunkSizeOnly: SplitOptions = { chunkSize: 300 };
      const overlapOnly: SplitOptions = { chunkOverlap: 100 };

      const chunks1 = await splitDocument(shortTestFile, chunkSizeOnly);
      const chunks2 = await splitDocument(shortTestFile, overlapOnly);

      expect(chunks1).toBeDefined();
      expect(chunks2).toBeDefined();
    });

    it('should reject negative chunk size', async () => {
      const invalidOptions = { chunkSize: -100 };

      await expect(splitDocument(shortTestFile, invalidOptions as SplitOptions)).rejects.toThrow(
        'Invalid split options',
      );
    });

    it('should reject negative chunk overlap', async () => {
      const invalidOptions = { chunkOverlap: -50 };

      await expect(splitDocument(shortTestFile, invalidOptions as SplitOptions)).rejects.toThrow(
        'Invalid split options',
      );
    });

    it('should reject non-integer chunk size', async () => {
      const invalidOptions = { chunkSize: 100.5 };

      await expect(splitDocument(shortTestFile, invalidOptions as SplitOptions)).rejects.toThrow(
        'Invalid split options',
      );
    });

    it('should reject non-integer chunk overlap', async () => {
      const invalidOptions = { chunkOverlap: 50.5 };

      await expect(splitDocument(shortTestFile, invalidOptions as SplitOptions)).rejects.toThrow(
        'Invalid split options',
      );
    });

    it('should reject non-number values', async () => {
      const invalidOptions = { chunkSize: 'invalid' };

      await expect(
        splitDocument(shortTestFile, invalidOptions as unknown as SplitOptions),
      ).rejects.toThrow('Invalid split options');
    });

    it('should use custom chunk size when provided', async () => {
      const customOptions: SplitOptions = { chunkSize: 50 };
      const chunks = await splitDocument(longTestFile, customOptions);

      // With smaller chunk size, we should get more chunks
      expect(chunks.length).toBeGreaterThan(1);
      chunks.forEach((chunk) => {
        expect(chunk.pageContent.length).toBeLessThanOrEqual(60); // Some tolerance
      });
    });

    it('should work with zero chunk overlap', async () => {
      const options: SplitOptions = { chunkOverlap: 0 };
      const chunks = await splitDocument(shortTestFile, options);

      expect(chunks).toBeDefined();
      expect(Array.isArray(chunks)).toBe(true);
    });
  });
});
