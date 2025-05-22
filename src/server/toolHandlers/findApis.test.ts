import { describe, expect, it } from 'vitest';
import { handleFindApis } from './findApis';

describe('handleFindApis', () => {
  it('should return APIs for a valid query (mocked)', async () => {
    const mockPerformSearch = (query: string) => Promise.resolve(`APIs for: ${query}`);
    const result = await handleFindApis({ requirement: 'weather data' }, mockPerformSearch);
    expect(result).toContain('APIs for:');
    expect(result).toContain('weather data');
  });

  it('should handle errors gracefully', async () => {
    const errorPerformSearch = () => Promise.reject(new Error('Search failed'));
    try {
      await handleFindApis({ requirement: 'weather data' }, errorPerformSearch);
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
