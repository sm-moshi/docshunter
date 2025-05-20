import { describe, expect, it } from 'vitest';
import { handleGetDocumentation } from './getDocumentation';

describe('handleGetDocumentation', () => {
  it('should return documentation for a valid query (mocked)', async () => {
    const mockPerformSearch = async (query: string) => `Docs for: ${query}`;
    const result = await handleGetDocumentation({ query: 'React hooks' }, mockPerformSearch);
    expect(result).toContain('Docs for:');
    expect(result).toContain('React hooks');
  });

  it('should handle errors gracefully', async () => {
    const errorPerformSearch = async () => { throw new Error('Search failed'); };
    try {
      await handleGetDocumentation({ query: 'React hooks' }, errorPerformSearch);
      throw new Error('Should have thrown');
    } catch (err: any) {
      expect(err.message).toBe('Search failed');
    }
  });
});
