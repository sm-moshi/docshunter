import { describe, expect, it } from 'vitest';
import { handleSearch } from './search';

describe('handleSearch', () => {
  it('should return a brief answer for detail_level=brief', async () => {
    const mockPerformSearch = async (query: string) => await Promise.resolve(`Result: ${query}`);
    const result = await handleSearch({ query: 'What is AI?', detail_level: 'brief' }, mockPerformSearch);
    expect(result).toContain('Result: Provide a brief, concise answer to: What is AI?');
  });

  it('should return a normal answer for default detail_level', async () => {
    const mockPerformSearch = async (query: string) => await Promise.resolve(`Result: ${query}`);
    const result = await handleSearch({ query: 'What is AI?' }, mockPerformSearch);
    expect(result).toContain('Result: Provide a clear, balanced answer to: What is AI?');
  });

  it('should return a detailed answer for detail_level=detailed', async () => {
    const mockPerformSearch = async (query: string) => await Promise.resolve(`Result: ${query}`);
    const result = await handleSearch({ query: 'What is AI?', detail_level: 'detailed' }, mockPerformSearch);
    expect(result).toContain('Result: Provide a comprehensive, detailed analysis of: What is AI?');
  });

  it('should handle errors gracefully', async () => {
    const errorPerformSearch = async () => {
      await Promise.resolve(); // Dummy await to satisfy linter
      throw new Error("fail");
    };
    try {
      await handleSearch({ query: 'What is AI?' }, errorPerformSearch);
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
