import { describe, expect, it } from 'vitest';
import { handleExtractUrlContent } from './extractUrlContent';

describe('handleExtractUrlContent', () => {
  const mockHtml = '<html><head><title>Test Page</title></head><body><article><h1>Test Article</h1><p>This is the main content.</p></article></body></html>';

  const mockBrowserManager = {
    goto: async () => { },
    title: async () => 'Test Page',
    content: async () => mockHtml,
  };

  it('should extract content from a valid URL (mocked)', async () => {
    const result = await handleExtractUrlContent({ url: 'https://example.com' }, mockBrowserManager as any);
    const parsed = JSON.parse(result);
    expect(parsed.status).toBe('Success');
    expect(parsed.title).toBe('Test Page');
    expect(parsed.textContent).toContain('This is the main content');
  });

  it('should handle errors gracefully', async () => {
    const errorBrowserManager = {
      goto: async () => { throw new Error('Navigation failed'); },
      title: async () => { throw new Error('No title'); },
      content: async () => { throw new Error('No content'); },
    };
    const result = await handleExtractUrlContent({ url: 'https://fail.com' }, errorBrowserManager as any);
    const parsed = JSON.parse(result);
    expect(parsed.status).toBe('Error');
    expect(parsed.message).toContain('Failed to extract content');
  });
});
