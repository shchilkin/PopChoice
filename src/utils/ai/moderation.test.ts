import { describe, expect, it, vi } from 'vitest';

const mockModerationsCreate = vi.fn();

vi.mock('@/clients/openaiClient', () => ({
  openAIClient: {
    moderations: {
      create: mockModerationsCreate,
    },
  },
}));

const { moderateInput } = await import('./moderation');

function makeModerationResponse(flagged: boolean, categories: Record<string, boolean> = {}) {
  return {
    results: [
      {
        flagged,
        categories: {
          hate: false,
          'hate/threatening': false,
          harassment: false,
          'harassment/threatening': false,
          illicit: false,
          'illicit/violent': false,
          'self-harm': false,
          'self-harm/intent': false,
          'self-harm/instructions': false,
          sexual: false,
          'sexual/minors': false,
          violence: false,
          'violence/graphic': false,
          ...categories,
        },
      },
    ],
  };
}

describe('moderateInput', () => {
  it('returns flagged: false for safe content', async () => {
    mockModerationsCreate.mockResolvedValueOnce(makeModerationResponse(false));

    const result = await moderateInput('The Dark Knight');

    expect(result).toEqual({ flagged: false });
    expect(mockModerationsCreate).toHaveBeenCalledWith({
      model: 'omni-moderation-latest',
      input: 'The Dark Knight',
    });
  });

  it('returns flagged: true with categories for unsafe content', async () => {
    mockModerationsCreate.mockResolvedValueOnce(
      makeModerationResponse(true, { hate: true, violence: true }),
    );

    const result = await moderateInput('some inappropriate text');

    expect(result).toEqual({
      flagged: true,
      categories: expect.arrayContaining(['hate', 'violence']),
    });
  });

  it('accepts an array of strings and passes them to the API', async () => {
    mockModerationsCreate.mockResolvedValueOnce(makeModerationResponse(false));

    const result = await moderateInput(['Inception', 'comedy', 'light']);

    expect(result).toEqual({ flagged: false });
    expect(mockModerationsCreate).toHaveBeenCalledWith({
      model: 'omni-moderation-latest',
      input: ['Inception', 'comedy', 'light'],
    });
  });

  it('deduplicates flagged categories across multiple results', async () => {
    mockModerationsCreate.mockResolvedValueOnce({
      results: [
        {
          flagged: true,
          categories: {
            hate: true,
            violence: false,
            sexual: false,
            harassment: false,
            'hate/threatening': false,
            'harassment/threatening': false,
            illicit: false,
            'illicit/violent': false,
            'self-harm': false,
            'self-harm/intent': false,
            'self-harm/instructions': false,
            'sexual/minors': false,
            'violence/graphic': false,
          },
        },
        {
          flagged: true,
          categories: {
            hate: true,
            violence: true,
            sexual: false,
            harassment: false,
            'hate/threatening': false,
            'harassment/threatening': false,
            illicit: false,
            'illicit/violent': false,
            'self-harm': false,
            'self-harm/intent': false,
            'self-harm/instructions': false,
            'sexual/minors': false,
            'violence/graphic': false,
          },
        },
      ],
    });

    const result = await moderateInput(['text1', 'text2']);

    expect(result.flagged).toBe(true);
    if (result.flagged) {
      expect(result.categories).toEqual(expect.arrayContaining(['hate', 'violence']));
      // 'hate' should not appear twice
      expect(result.categories.filter((c) => c === 'hate')).toHaveLength(1);
    }
  });
});
