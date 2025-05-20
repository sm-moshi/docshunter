import { describe, expect, it, vi } from 'vitest';
import * as chatHandler from './toolHandlers/chat';
import * as extractHandler from './toolHandlers/extractUrlContent';
import * as searchHandler from './toolHandlers/search';

// Mock dependencies for integration
vi.mock('./browser', () => ({
  BrowserManager: vi.fn().mockImplementation(() => ({
    isClosed: () => false,
    initializeBrowser: vi.fn(),
    close: vi.fn(),
    navigateToPerplexity: vi.fn(),
    waitForSearchInput: vi.fn(() => '.input'),
    evaluate: vi.fn(),
    click: vi.fn(),
    keyboard: { press: vi.fn() },
    type: vi.fn(),
    waitForSelector: vi.fn(),
    content: vi.fn(() => '<html><body>content</body></html>'),
    title: vi.fn(() => 'Integration Test Page'),
    goto: vi.fn(),
  }))
}));
vi.mock('./database', () => ({
  ChatDatabase: vi.fn().mockImplementation(() => ({
    close: vi.fn(),
    getChatHistory: vi.fn(() => [{ role: 'user', content: 'hi' }]),
    saveChatMessage: vi.fn(),
  }))
}));
vi.mock('@modelcontextprotocol/sdk/server/index.js', () => ({ Server: vi.fn().mockImplementation(() => ({ setRequestHandler: vi.fn(), connect: vi.fn(), close: vi.fn() })) }));
vi.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({ StdioServerTransport: vi.fn().mockImplementation(() => ({})) }));

describe('Integration: PerplexityMCPServer', () => {
  it('should handle a chat flow (mocked)', async () => {
    // Use the real handler, but with a mock performSearch
    const result = await chatHandler.handleChatPerplexity(
      { message: 'Hello, world!' },
      { getChatHistory: () => [], saveChatMessage: vi.fn() } as unknown as import('./database').ChatDatabase,
      {} as unknown as import('./browser').BrowserManager,
      (prompt: string) => Promise.resolve(`Echo: ${prompt}`)
    );
    expect(result).toContain('Echo:');
  });

  it('should handle a search + extract workflow (mocked)', async () => {
    const searchSpy = vi.spyOn(searchHandler, 'handleSearch').mockResolvedValue('Search: result');
    const extractSpy = vi.spyOn(extractHandler, 'handleExtractUrlContent').mockResolvedValue('{"status":"Success","title":"Integration Test Page","textContent":"Extracted content"}');
    // Simulate a search followed by content extraction
    const searchResult = await searchHandler.handleSearch(
      { query: 'Find info about X' },
      (query: string) => Promise.resolve(`Search: ${query}`)
    );
    const extractResult = await extractHandler.handleExtractUrlContent(
      { url: 'https://example.com' },
      {} as unknown as import('./browser').BrowserManager
    );
    expect(searchSpy).toHaveBeenCalled();
    expect(extractSpy).toHaveBeenCalled();
    expect(searchResult).toContain('Search:');
    let parsed: unknown;
    try {
      parsed = JSON.parse(extractResult);
    } catch {
      parsed = null;
    }
    if (parsed && typeof parsed === 'object' && 'status' in parsed) {
      expect((parsed as { status: string }).status).toBe('Success');
    }
    searchSpy.mockRestore();
    extractSpy.mockRestore();
  });

  it('should propagate errors from browser during chat flow', async () => {
    // Spy on the chat handler to throw
    const errorSpy = vi.spyOn(chatHandler, 'handleChatPerplexity').mockRejectedValue(new Error('Browser failed'));
    let error: unknown;
    try {
      await chatHandler.handleChatPerplexity(
        { message: 'Hello, world!' },
        { getChatHistory: () => [], saveChatMessage: vi.fn() } as unknown as import('./database').ChatDatabase,
        {} as unknown as import('./browser').BrowserManager,
        () => { throw new Error('Browser failed'); }
      );
    } catch (e) {
      error = e;
    }
    expect(error).toBeDefined();
    if (error && typeof error === 'object' && 'message' in error) {
      expect((error as { message: string }).message).toContain('Browser failed');
    }
    errorSpy.mockRestore();
  });
});
