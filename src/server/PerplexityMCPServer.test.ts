import { describe, expect, it, vi } from 'vitest';
import { PerplexityMCPServer } from './PerplexityMCPServer';

vi.mock('./browser', () => ({ BrowserManager: vi.fn().mockImplementation(() => ({ isClosed: () => false, initializeBrowser: vi.fn(), close: vi.fn(), navigateToPerplexity: vi.fn(), waitForSearchInput: vi.fn(() => '.input'), evaluate: vi.fn(), click: vi.fn(), keyboard: { press: vi.fn() }, type: vi.fn(), waitForSelector: vi.fn(), })) }));
vi.mock('./database', () => ({ ChatDatabase: vi.fn().mockImplementation(() => ({ close: vi.fn() })) }));
vi.mock('@modelcontextprotocol/sdk/server/index.js', () => ({ Server: vi.fn().mockImplementation(() => ({ setRequestHandler: vi.fn(), connect: vi.fn(), close: vi.fn() })) }));
vi.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({ StdioServerTransport: vi.fn().mockImplementation(() => ({})) }));


describe('PerplexityMCPServer', () => {
  it('should construct and register tool handlers without error', () => {
    expect(() => new PerplexityMCPServer()).not.toThrow();
  });

  it('should close without error', async () => {
    const server = new PerplexityMCPServer();
    await expect(server.close()).resolves.not.toThrow();
  });
});
