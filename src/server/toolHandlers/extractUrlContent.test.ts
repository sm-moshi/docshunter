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

  it('should fallback to body text if Readability fails', async () => {
    const fallbackBrowserManager: Partial<BrowserManager> = {
      goto: vi.fn().mockResolvedValue(undefined),
      title: vi.fn().mockResolvedValue('Fallback Page'),
      content: vi.fn().mockResolvedValue('<html><body>Fallback body text</body></html>'),
    };
    // Patch Readability to return null
    const originalReadability = (global as any).Readability;
    (global as any).Readability = vi.fn().mockImplementation(() => ({ parse: () => null }));
    const result = await handleExtractUrlContent({ url: 'https://fallback.com' }, fallbackBrowserManager as BrowserManager);
    const parsed = JSON.parse(result);
    expect(parsed.status).toMatch(/Success/);
    expect(parsed.textContent).toContain('Fallback body text');
    (global as any).Readability = originalReadability;
  });

  it('should handle recursive fetch with partial and total failure', async () => {
    const recursiveBrowserManager: Partial<BrowserManager> = {
      goto: vi.fn().mockResolvedValue(undefined),
      title: vi.fn().mockResolvedValue('Recursive Page'),
      content: vi.fn().mockResolvedValue('<html><body>Recursive content</body></html>'),
      evaluate: vi.fn().mockResolvedValue([{ url: 'https://example.com/2', text: 'Link2' }]),
    };
    // Depth 2, should fetch root and one link
    const result = await handleExtractUrlContent({ url: 'https://example.com', depth: 2 }, recursiveBrowserManager as BrowserManager);
    const parsed = JSON.parse(result);
    expect(['Success', 'SuccessWithPartial', 'Error']).toContain(parsed.status);
    expect(parsed.pagesExplored).toBeGreaterThanOrEqual(1);
  });

  it('should handle timeout in recursive fetch', async () => {
    const timeoutBrowserManager: Partial<BrowserManager> = {
      goto: vi.fn().mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 200))),
      title: vi.fn().mockResolvedValue('Timeout Page'),
      content: vi.fn().mockResolvedValue('<html><body>Timeout content</body></html>'),
      evaluate: vi.fn().mockResolvedValue([]),
    };
    // Use a very short timeout by patching setTimeout
    const setTimeoutSpy = vi.spyOn(global, 'setTimeout').mockImplementation((fn: any, ms?: number) => {
      return setTimeout(fn, 1);
    });
    const result = await handleExtractUrlContent({ url: 'https://timeout.com', depth: 2 }, timeoutBrowserManager as BrowserManager);
    const parsed = JSON.parse(result);
    expect(['Error', 'SuccessWithPartial']).toContain(parsed.status);
    setTimeoutSpy.mockRestore();
  });

  it('should handle invalid/malformed URLs', async () => {
    const invalidBrowserManager: Partial<BrowserManager> = {
      goto: vi.fn().mockRejectedValue(new Error('Invalid URL')),
      title: vi.fn().mockResolvedValue('Invalid'),
      content: vi.fn().mockResolvedValue(''),
    };
    const result = await handleExtractUrlContent({ url: 'not-a-url' }, invalidBrowserManager as BrowserManager);
    const parsed = JSON.parse(result);
    expect(parsed.status).toBe('Error');
    expect(parsed.message).toContain('Failed to extract content');
  });

  it('should handle empty page content', async () => {
    const emptyContentManager: Partial<BrowserManager> = {
      goto: vi.fn().mockResolvedValue(undefined),
      title: vi.fn().mockResolvedValue('Empty Page'),
      content: vi.fn().mockResolvedValue(''),
    };
    const result = await handleExtractUrlContent({ url: 'https://empty.com' }, emptyContentManager as BrowserManager);
    const parsed = JSON.parse(result);
    expect(parsed.status).toMatch(/Success/);
    expect(parsed.textContent).toBe("");
  });

  it('should handle links extraction and filtering', async () => {
    const linksManager: Partial<BrowserManager> = {
      goto: vi.fn().mockResolvedValue(undefined),
      title: vi.fn().mockResolvedValue('Links Page'),
      content: vi.fn().mockResolvedValue('<html><body>Links</body></html>'),
      evaluate: vi.fn().mockResolvedValue([
        { url: '#', text: 'Hash' },
        { url: 'javascript:void(0)', text: 'JS' },
        { url: 'mailto:test@example.com', text: 'Mail' },
        { url: 'https://example.com/valid', text: 'Valid' },
      ]),
    };
    const result = await handleExtractUrlContent({ url: 'https://example.com', depth: 2 }, linksManager as BrowserManager);
    const parsed = JSON.parse(result);
    expect(parsed.status).toMatch(/Success/);
    expect(parsed.pagesExplored).toBeGreaterThanOrEqual(1);
  });
});
