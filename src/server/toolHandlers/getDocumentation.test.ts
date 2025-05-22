import { describe, expect, it } from 'vitest';
import { handleGetDocumentation } from './getDocumentation';

describe('handleGetDocumentation', () => {
  it('should return documentation for a valid query (mocked)', async () => {
    const mockPerformSearch = async (query: string) => await Promise.resolve(`Docs for: ${query}`);
    const result = await handleGetDocumentation({ query: 'React hooks' }, mockPerformSearch);
    expect(result).toContain('Docs for:');
    expect(result).toContain('React hooks');
  });

  it('should handle errors gracefully', async () => {
    const errorPerformSearch = async () => {
      await Promise.resolve(); // Dummy await to satisfy linter
      throw new Error("fail");
    };
    try {
      await handleGetDocumentation({ query: 'React hooks' }, errorPerformSearch);
      throw new Error('Should have thrown');
    } catch (err) {
      if (err instanceof Error) {
        expect(err.message).toBe('Search failed');
      } else {
        throw err;
      }
    }
  });
});
