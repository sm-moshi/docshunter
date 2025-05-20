import { describe, expect, it, vi } from 'vitest';
import type { BrowserManager } from '../browser';
import { handleExtractUrlContent } from './extractUrlContent';

describe('handleExtractUrlContent', () => {
  const mockPage = {
    goto: vi.fn().mockResolvedValue(undefined),
    title: vi.fn().mockResolvedValue('Test Page'),
    content: vi.fn().mockResolvedValue('<html>test</html>'),
  };

  it('should extract content from a valid URL (mocked)', async () => {
    const result = await handleExtractUrlContent({ url: 'https://example.com' }, mockPage as unknown as BrowserManager);
    const parsed = JSON.parse(result) as { status: string; title: string; textContent: string };
    expect(parsed.status).toBe('Success');
    expect(parsed.title).toBe('Test Page');
    expect(typeof parsed.textContent === 'string' && parsed.textContent.includes('main content')).toBe(true);
  });

  it('should handle errors gracefully', async () => {
    const errorBrowserManager: Partial<BrowserManager> = {
      goto: vi.fn().mockRejectedValue(new Error('Navigation failed')),
      title: vi.fn().mockRejectedValue(new Error('No title')),
      content: vi.fn().mockRejectedValue(new Error('No content')),
    };
    const result = await handleExtractUrlContent({ url: 'https://fail.com' }, errorBrowserManager as BrowserManager);
    const parsed = JSON.parse(result) as { status: string; message: string };
    expect(parsed.status).toBe('Error');
    expect(typeof parsed.message === 'string' && parsed.message.includes('Failed to extract content')).toBe(true);
  });
});
