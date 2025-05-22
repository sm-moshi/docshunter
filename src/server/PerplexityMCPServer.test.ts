// Move all mocks to the very top before imports for Vitest ESM compatibility
vi.mock('./browser', () => ({ BrowserManager: vi.fn().mockImplementation(() => ({ isClosed: () => false, initializeBrowser: vi.fn(), close: vi.fn(), navigateToPerplexity: vi.fn(), waitForSearchInput: vi.fn(() => '.input'), evaluate: vi.fn(), click: vi.fn(), keyboard: { press: vi.fn() }, type: vi.fn(), waitForSelector: vi.fn(), })) }));
vi.mock('./database', () => ({ ChatDatabase: vi.fn().mockImplementation(() => ({ close: vi.fn() })) }));
vi.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({ StdioServerTransport: vi.fn().mockImplementation(() => ({})) }));
vi.mock('./toolHandlers/chat', () => ({ handleChatPerplexity: vi.fn().mockResolvedValue('chat result') }));
vi.mock('./toolHandlers/search', () => ({ handleSearch: vi.fn().mockResolvedValue('search result') }));
vi.mock('./toolHandlers/extractUrlContent', () => ({ handleExtractUrlContent: vi.fn().mockResolvedValue('extract result') }));
vi.mock('./toolHandlers/findApis', () => ({ handleFindApis: vi.fn().mockResolvedValue('findApis result') }));
vi.mock('./toolHandlers/getDocumentation', () => ({ handleGetDocumentation: vi.fn().mockResolvedValue('getDoc result') }));
vi.mock('./toolHandlers/checkDeprecatedCode', () => ({ handleCheckDeprecatedCode: vi.fn().mockResolvedValue('checkDep result') }));

import { describe, expect, it, vi } from 'vitest';
import { PerplexityMCPServer } from './PerplexityMCPServer';


type ToolName = "chat_perplexity" | "search" | "extract_url_content" | "find_apis" | "get_documentation" | "check_deprecated_code";
interface ToolArgs {
  message?: string;
  chat_id?: string;
  query?: string;
  detail_level?: "brief" | "normal" | "detailed";
  url?: string;
  depth?: number;
  requirement?: string;
  context?: string;
  code?: string;
  technology?: string;
}
async function callTool(server: PerplexityMCPServer, name: ToolName, args: ToolArgs = {}) {
  return await server._testCallTool(name, args);
}

describe('PerplexityMCPServer', () => {
  it('should construct and register tool handlers without error', () => {
    expect(() => new PerplexityMCPServer()).not.toThrow();
  });

  it('should close without error', async () => {
    const server = new PerplexityMCPServer();
    await expect(server.close()).resolves.not.toThrow();
  });

  it('should handle chat_perplexity tool', async () => {
    const server = new PerplexityMCPServer();
    const res = await callTool(server, 'chat_perplexity', {});
    expect(res).toBe('chat result');
  });

  it('should handle search tool', async () => {
    const server = new PerplexityMCPServer();
    const res = await callTool(server, 'search', {});
    expect(res).toBe('search result');
  });

  it('should handle extract_url_content tool', async () => {
    const server = new PerplexityMCPServer();
    const res = await callTool(server, 'extract_url_content', {});
    expect(res).toBe('extract result');
  });

  it('should handle find_apis tool', async () => {
    const server = new PerplexityMCPServer();
    const res = await callTool(server, 'find_apis', {});
    expect(res).toBe('findApis result');
  });

  it('should handle get_documentation tool', async () => {
    const server = new PerplexityMCPServer();
    const res = await callTool(server, 'get_documentation', {});
    expect(res).toBe('getDoc result');
  });

  it('should handle check_deprecated_code tool', async () => {
    const server = new PerplexityMCPServer();
    const res = await callTool(server, 'check_deprecated_code', {});
    expect(res).toBe('checkDep result');
  });

  it('should return error for unknown tool', async () => {
    const server = new PerplexityMCPServer();
    // @ts-expect-error: intentionally passing an invalid tool name to test error handling
    await expect(callTool(server, 'unknown_tool', {} as ToolArgs)).rejects.toThrow('Unknown tool');
  });

  // Error propagation test can be added by mocking the handler to throw
});

describe('PerplexityMCPServer error and edge cases', () => {
  it('should handle performSearch when browserManager.isClosed() returns true and initializeBrowser throws', async () => {
    const server = new PerplexityMCPServer();
    server['browserManager'].isClosed = vi.fn().mockReturnValue(true);
    server['browserManager'].initializeBrowser = vi.fn().mockRejectedValue(new Error('init fail'));
    const result = await server['performSearch']('test');
    expect(result).toContain('Search failed: init fail');
  });

  it('should handle performSearch when waitForSearchInput returns null', async () => {
    const server = new PerplexityMCPServer();
    server['browserManager'].isClosed = vi.fn().mockReturnValue(false);
    server['browserManager'].initializeBrowser = vi.fn();
    server['browserManager'].navigateToPerplexity = vi.fn();
    server['browserManager'].waitForSearchInput = vi.fn().mockResolvedValue(null);
    const result = await server['performSearch']('test');
    expect(result).toContain('Search failed: Search input not found');
  });

  it('should handle performSearch when browserManager.evaluate throws during answer extraction', async () => {
    const server = new PerplexityMCPServer();
    server['browserManager'].isClosed = vi.fn().mockReturnValue(false);
    server['browserManager'].initializeBrowser = vi.fn();
    server['browserManager'].navigateToPerplexity = vi.fn();
    server['browserManager'].waitForSearchInput = vi.fn().mockResolvedValue('.input');
    server['browserManager'].evaluate = vi.fn()
      .mockResolvedValueOnce(undefined) // clear input
      .mockResolvedValueOnce(undefined) // click
      .mockResolvedValueOnce(undefined) // press
      .mockResolvedValueOnce(undefined) // type
      .mockResolvedValueOnce(undefined) // press
      .mockRejectedValueOnce(new Error('eval fail'));
    server['browserManager'].click = vi.fn();
    Object.defineProperty(server['browserManager'], 'keyboard', { get: () => ({ press: vi.fn() }) });
    server['browserManager'].type = vi.fn();
    server['browserManager'].waitForSelector = vi.fn();
    const result = await server['performSearch']('test');
    expect(['', 'Search failed: eval fail']).toContain(result);
  });

  it('should handle run() error if initializeBrowser throws', async () => {
    const server = new PerplexityMCPServer();
    server['browserManager'].initializeBrowser = vi.fn().mockRejectedValue(new Error('init fail'));
    await expect(server.run()).rejects.toThrow('init fail');
  });

  it('should handle run() error if server.connect throws', async () => {
    const server = new PerplexityMCPServer();
    server['browserManager'].initializeBrowser = vi.fn();
    server['server'].connect = vi.fn().mockRejectedValue(new Error('connect fail'));
    await expect(server.run()).rejects.toThrow('connect fail');
  });

  it('should handle close() error if browserManager.close throws', async () => {
    const server = new PerplexityMCPServer();
    server['browserManager'].close = vi.fn().mockRejectedValue(new Error('close fail'));
    server['db'].close = vi.fn();
    server['server'].close = vi.fn();
    await server.close(); // Should not throw
  });

  it('should handle close() error if db.close throws', async () => {
    const server = new PerplexityMCPServer();
    server['browserManager'].close = vi.fn();
    server['db'].close = vi.fn().mockImplementation(() => { throw new Error('db close fail'); });
    server['server'].close = vi.fn();
    await server.close(); // Should not throw
  });
});
