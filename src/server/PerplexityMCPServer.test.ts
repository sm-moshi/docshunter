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

// Helper to call the tool handler via the real server
async function callTool(server: PerplexityMCPServer, name: string, args: unknown = {}) {
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
    await expect(callTool(server, 'unknown_tool', {})).rejects.toThrow('Unknown tool');
  });

  // Error propagation test can be added by mocking the handler to throw
});
